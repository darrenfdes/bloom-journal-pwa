import { wmoToCategory } from './weather-mapping';
import type { GeoCoords, WeatherState } from './types';

export type WeatherCoords = GeoCoords;

export const FALLBACK_COORDS: WeatherCoords = { lat: 20.5937, lon: 78.9629 };

export const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';

export function buildOpenMeteoUrl(coords: GeoCoords): string {
  const params = new URLSearchParams({
    latitude: String(coords.lat),
    longitude: String(coords.lon),
    current:
      'weathercode,cloud_cover,visibility,precipitation,wind_speed_10m,temperature_2m',
    timezone: 'auto',
  });
  return `${OPEN_METEO_BASE}?${params.toString()}`;
}

export interface OpenMeteoCurrent {
  weathercode: number;
  cloud_cover: number;
  visibility: number;
  precipitation: number;
  wind_speed_10m: number;
  temperature_2m: number;
}

export interface OpenMeteoResponse {
  current?: OpenMeteoCurrent;
}

export function parseOpenMeteoResponse(
  json: OpenMeteoResponse,
  coords: GeoCoords
): WeatherState {
  const current = json.current;
  const code = current?.weathercode ?? 0;
  return {
    category: wmoToCategory(code),
    windSpeed: current?.wind_speed_10m ?? 0,
    cloudCover: current?.cloud_cover ?? 0,
    visibility: current?.visibility ?? 10000,
    precipitation: current?.precipitation ?? 0,
    temperature: current?.temperature_2m ?? 20,
    coords,
    wmoCode: code,
  };
}

export const DEFAULT_WEATHER: WeatherState = {
  category: 'clear',
  windSpeed: 0,
  cloudCover: 0,
  visibility: 10000,
  precipitation: 0,
  temperature: 20,
  coords: FALLBACK_COORDS,
};
