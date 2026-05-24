export const NOMINATIM_REVERSE_BASE = 'https://nominatim.openstreetmap.org/reverse';

export function buildReverseGeocodeUrl(
  latOrCoords: number | { lat: number; lon: number },
  lon?: number
): string {
  const lat = typeof latOrCoords === 'number' ? latOrCoords : latOrCoords.lat;
  const lng = typeof latOrCoords === 'number' ? lon! : latOrCoords.lon;
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
  });
  return `${NOMINATIM_REVERSE_BASE}?${params.toString()}`;
}

export interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  country?: string;
}

export interface NominatimResponse {
  display_name?: string;
  address?: NominatimAddress;
}

export function parseLocationName(
  json: NominatimResponse,
  coords?: { lat: number; lon: number }
): string {
  const addr = json.address;
  if (addr) {
    const locality =
      addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.county;
    if (locality && addr.country) return `${locality}, ${addr.country}`;
    if (locality) return locality;
    if (addr.state && addr.country) return `${addr.state}, ${addr.country}`;
    if (addr.country) return addr.country;
  }
  if (json.display_name) {
    const parts = json.display_name.split(',').map((p) => p.trim());
    if (parts.length >= 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
    if (parts[0]) return parts[0];
  }
  if (coords) return formatCoordsFallback(coords.lat, coords.lon);
  return 'Your meadow';
}

export function formatCoordsFallback(lat: number, lon: number): string {
  return `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
}
