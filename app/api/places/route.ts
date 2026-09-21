import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'

// Allow time to try several map servers
export const maxDuration = 60

const USER_AGENT = 'TriageAI/1.0 (+https://triageai-nu.vercel.app)'

// Only these search filters are allowed (prevents arbitrary queries)
const ALLOWED_FILTERS: Record<string, string> = {
  '"amenity"="doctors"': 'doctors',
  '"amenity"="clinic"': 'clinic',
  '"healthcare"="doctor"': 'doctors',
  '"amenity"="hospital"': 'hospital',
  '"healthcare"="hospital"': 'hospital',
  '"amenity"="dentist"': 'dentist',
  '"healthcare"="dentist"': 'dentist',
  '"healthcare"="physiotherapist"': 'physiotherapist',
  '"amenity"="physiotherapist"': 'physiotherapist',
  '"amenity"="pharmacy"': 'pharmacy',
  '"healthcare"="pharmacy"': 'pharmacy',
  '"healthcare"="optometrist"': 'optometrist',
  '"shop"="optician"': 'optician',
}

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

interface Place { name: string; address: string; lat: number; lng: number; distanceKm: number; email?: string; phone?: string }

// Short-lived cache so repeated searches don't hit the map servers again
const cache = new Map<string, { at: number; places: Place[] }>()
const CACHE_MS = 10 * 60 * 1000

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

async function fetchWithTimeout(url: string, init: RequestInit, ms: number) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

type OsmElement = { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }

async function searchOverpass(filters: string[], lat: number, lng: number, radius: number): Promise<Place[] | null> {
  const around = `(around:${radius},${lat},${lng})`
  const parts = filters.map(f => `node[${f}]${around};way[${f}]${around};`).join('')
  const query = `[out:json][timeout:15];(${parts});out center 40;`
  for (const url of OVERPASS_URLS) {
    try {
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': USER_AGENT },
        body: 'data=' + encodeURIComponent(query),
      }, 12000)
      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data.elements)) continue
      return (data.elements as OsmElement[]).flatMap(p => {
        const pLat = p.lat ?? p.center?.lat
        const pLng = p.lon ?? p.center?.lon
        const t = p.tags ?? {}
        if (!t.name || pLat === undefined || pLng === undefined) return []
        return [{
          name: t.name,
          address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ').trim() || 'Address not listed',
          lat: pLat, lng: pLng, distanceKm: distanceKm(lat, lng, pLat, pLng),
          email: t['email'] || t['contact:email'] || undefined,
          phone: t['phone'] || t['contact:phone'] || undefined,
        }]
      })
    } catch {
      // busy, timed out, or not JSON: try the next server
    }
  }
  return null
}

// Backup provider: OpenStreetMap's Nominatim search
async function searchNominatim(filters: string[], lat: number, lng: number, radius: number): Promise<Place[] | null> {
  const types = Array.from(new Set(filters.map(f => ALLOWED_FILTERS[f]))).slice(0, 2)
  const dLat = radius / 111000
  const dLng = radius / (111000 * Math.cos((lat * Math.PI) / 180))
  const viewbox = [lng - dLng, lat + dLat, lng + dLng, lat - dLat].join(',')
  const places: Place[] = []
  let anyOk = false
  for (const type of types) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&amenity=${encodeURIComponent(type)}&viewbox=${viewbox}&bounded=1&limit=20&addressdetails=1&extratags=1`
      const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'en' } }, 10000)
      if (!res.ok) continue
      anyOk = true
      const data = (await res.json()) as {
        name?: string; lat: string; lon: string; display_name?: string
        address?: Record<string, string>; extratags?: Record<string, string> | null
      }[]
      for (const r of data) {
        const pLat = Number(r.lat), pLng = Number(r.lon)
        const name = r.name || r.display_name?.split(',')[0]
        if (!name || Number.isNaN(pLat) || Number.isNaN(pLng)) continue
        const a = r.address ?? {}
        const x = r.extratags ?? {}
        places.push({
          name,
          address: [a.house_number, a.road, a.city || a.town || a.village].filter(Boolean).join(' ').trim() || 'Address not listed',
          lat: pLat, lng: pLng, distanceKm: distanceKm(lat, lng, pLat, pLng),
          email: x['email'] || x['contact:email'] || undefined,
          phone: x['phone'] || x['contact:phone'] || undefined,
        })
      }
    } catch {
      // try the next type
    }
    await new Promise(r => setTimeout(r, 1100)) // Nominatim allows 1 request per second
  }
  return anyOk ? places : null
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Please log in first.' }, { status: 401 })

  const body = await req.json().catch(() => null) as { filters?: unknown; lat?: unknown; lng?: unknown; radius?: unknown; limit?: unknown } | null
  const lat = Number(body?.lat), lng = Number(body?.lng)
  const filters = Array.isArray(body?.filters) ? body!.filters.filter((f): f is string => typeof f === 'string' && f in ALLOWED_FILTERS) : []
  const radius = Math.min(Math.max(Number(body?.radius) || 8000, 1000), 25000)
  const limit = Math.min(Math.max(Number(body?.limit) || 8, 1), 20)
  if (!filters.length || Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'Invalid search.' }, { status: 400 })
  }

  // Round location (~1 km) so nearby repeat searches reuse the cache
  const key = `${filters.join('|')}:${lat.toFixed(2)},${lng.toFixed(2)}:${radius}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ places: hit.places.map(p => ({ ...p, distanceKm: distanceKm(lat, lng, p.lat, p.lng) })).sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit) })
  }

  const found = (await searchOverpass(filters, lat, lng, radius)) ?? (await searchNominatim(filters, lat, lng, radius))
  if (found === null) {
    return NextResponse.json({ error: 'The map service is busy right now. Please try again in a minute.' }, { status: 503 })
  }

  const seen = new Set<string>()
  const places = found
    .filter(p => !seen.has(p.name) && seen.add(p.name))
    .sort((a, b) => a.distanceKm - b.distanceKm)
  cache.set(key, { at: Date.now(), places })
  return NextResponse.json({ places: places.slice(0, limit) })
}
