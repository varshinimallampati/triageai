// Shared helpers for finding real places with OpenStreetMap (free, no API key)

// Public Overpass servers are often busy, so try several in order
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

type OsmElement = { tags?: Record<string, string>; lat?: number; lon?: number; center?: { lat: number; lon: number } }

export interface Place {
  name: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  email?: string
  phone?: string
}

async function queryOverpass(query: string): Promise<OsmElement[]> {
  for (const url of OVERPASS_URLS) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
        signal: controller.signal,
      })
      if (!res.ok) continue
      const data = await res.json()
      if (Array.isArray(data.elements)) return data.elements
    } catch {
      // server busy, timed out, or returned non-JSON: try the next one
    } finally {
      clearTimeout(timer)
    }
  }
  throw new Error('All map servers failed')
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function formatDistance(km: number) {
  const miles = km * 0.621371
  return miles < 0.1 ? 'Under 0.1 mi' : `${miles.toFixed(1)} mi`
}

/** filters look like '"amenity"="hospital"' */
export async function findPlaces(filters: string[], lat: number, lng: number, radiusMeters = 8000, limit = 8): Promise<Place[]> {
  const around = `(around:${radiusMeters},${lat},${lng})`
  const parts = filters.map(f => `node[${f}]${around};way[${f}]${around};`).join('')
  const elements = await queryOverpass(`[out:json][timeout:20];(${parts});out center 40;`)

  const seen = new Set<string>()
  const places: Place[] = []
  for (const p of elements) {
    const name = p.tags?.name
    if (!name || seen.has(name)) continue
    seen.add(name)
    const pLat = p.lat ?? p.center?.lat
    const pLng = p.lon ?? p.center?.lon
    if (pLat === undefined || pLng === undefined) continue
    const t = p.tags ?? {}
    places.push({
      name,
      address: [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ').trim() || 'Address not listed',
      lat: pLat,
      lng: pLng,
      distanceKm: distanceKm(lat, lng, pLat, pLng),
      email: t['email'] || t['contact:email'] || undefined,
      phone: t['phone'] || t['contact:phone'] || undefined,
    })
  }
  return places.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit)
}
