// Browser port of sharehub/lib/services/location_service.dart so the admin
// picks locations through the same OpenStreetMap/Nominatim API as the app.
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'

export interface LatLng {
  latitude: number
  longitude: number
}

export interface PlaceResult {
  name: string
  latitude: number
  longitude: number
}

// The app's LocationPickerPage centres on Addis Ababa and biases every search
// toward it. That bias is essential, not cosmetic: "Bole" alone ranks Bole City,
// Xinjiang (China) above Bole, Addis Ababa without it.
export const DEFAULT_NEAR: LatLng = { latitude: 9.0108, longitude: 38.7613 }

// Nominatim's `viewbox` wants left,top,right,bottom. The app uses a 0.6° box
// (~65 km) around the centre and passes bounded=0 so it only re-ranks, never
// hides results from elsewhere.
const BIAS_DELTA_DEGREES = 0.6

// Browsers refuse to set User-Agent, which is why the app's custom one is not
// repeated here; Nominatim still returns Access-Control-Allow-Origin: *.
const REQUEST_HEADERS: HeadersInit = { Accept: 'application/json' }

// Mirrors latlong2's Distance (great-circle metres).
function distanceMeters(a: LatLng, b: LatLng): number {
  const EARTH_RADIUS = 6371000
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180

  const dLat = toRadians(b.latitude - a.latitude)
  const dLon = toRadians(b.longitude - a.longitude)
  const lat1 = toRadians(a.latitude)
  const lat2 = toRadians(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h))
}

export async function searchPlaces(
  query: string,
  { limit = 8, near = DEFAULT_NEAR }: { limit?: number; near?: LatLng | null } = {}
): Promise<PlaceResult[]> {
  const q = query.trim()
  if (q.length < 3) return []

  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    addressdetails: '1',
    limit: String(limit),
    'accept-language': 'en',
  })

  if (near) {
    params.set(
      'viewbox',
      `${near.longitude - BIAS_DELTA_DEGREES},${near.latitude + BIAS_DELTA_DEGREES},` +
        `${near.longitude + BIAS_DELTA_DEGREES},${near.latitude - BIAS_DELTA_DEGREES}`
    )
    params.set('bounded', '0')
  }

  try {
    const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
      headers: REQUEST_HEADERS,
    })
    if (!res.ok) return []

    const data = (await res.json()) as Array<Record<string, unknown>>
    const places = data
      .map(item => ({
        name: String(item.display_name ?? ''),
        latitude: Number.parseFloat(String(item.lat)) || 0,
        longitude: Number.parseFloat(String(item.lon)) || 0,
      }))
      .filter(place => place.name.length > 0)

    if (near) {
      places.sort(
        (a, b) => distanceMeters(near, a) - distanceMeters(near, b)
      )
    }

    return places
  } catch {
    return []
  }
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<PlaceResult | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    addressdetails: '1',
    'accept-language': 'en',
  })

  try {
    const res = await fetch(`${NOMINATIM_BASE}/reverse?${params}`, {
      headers: REQUEST_HEADERS,
    })
    if (!res.ok) return null

    const map = (await res.json()) as Record<string, unknown>
    const name = String(map.display_name ?? '')
    if (!name) return null

    return { name, latitude, longitude }
  } catch {
    return null
  }
}
