// Finds real nearby places. The search runs on our server (/api/places),
// so it doesn't depend on the user's network and can use backup map providers.

export interface Place {
  name: string
  address: string
  lat: number
  lng: number
  distanceKm: number
  email?: string
  phone?: string
}

export function formatDistance(km: number) {
  const miles = km * 0.621371
  return miles < 0.1 ? 'Under 0.1 mi' : `${miles.toFixed(1)} mi`
}

/** filters look like '"amenity"="hospital"' */
export async function findPlaces(filters: string[], lat: number, lng: number, radiusMeters = 8000, limit = 8): Promise<Place[]> {
  const res = await fetch('/api/places', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filters, lat, lng, radius: radiusMeters, limit }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Search failed')
  return data.places as Place[]
}
