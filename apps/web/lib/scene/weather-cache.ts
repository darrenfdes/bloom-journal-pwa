/**
 * Last-known-weather cache (localStorage) so the live garden can paint the right sky on its
 * very first frame instead of flashing the clear-sky base meadow while Open-Meteo loads.
 * Weather is served only while fresh (stale weather is worse than a fade-in); coords are
 * served regardless of age — old coords still beat the country-level fallback.
 */
import type { GeoCoords, WeatherState } from '@bloom/core/scene';

export const WEATHER_CACHE_KEY = 'bloom.weather.last';

/** 3× the 30-minute refresh interval. */
export const WEATHER_CACHE_TTL_MS = 90 * 60 * 1000;

type CachedWeather = { weather: WeatherState; savedAt: number };

function readEntry(): CachedWeather | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedWeather>;
    if (!parsed.weather || typeof parsed.savedAt !== 'number') return null;
    return parsed as CachedWeather;
  } catch {
    return null;
  }
}

export function writeCachedWeather(weather: WeatherState, now = Date.now()): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ weather, savedAt: now }));
  } catch {
    /* private mode / quota — first paint just falls back to the fetch */
  }
}

export function readCachedWeather(now = Date.now()): WeatherState | null {
  const entry = readEntry();
  if (!entry || now - entry.savedAt > WEATHER_CACHE_TTL_MS) return null;
  return entry.weather;
}

export function readCachedCoords(): GeoCoords | null {
  return readEntry()?.weather.coords ?? null;
}
