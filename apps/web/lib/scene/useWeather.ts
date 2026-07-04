'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_WEATHER,
  buildOpenMeteoUrl,
  parseOpenMeteoResponse,
  type GeoCoords,
  type WeatherState,
} from '@bloom/core/scene';

import { readCachedWeather, writeCachedWeather } from './weather-cache';

const REFRESH_MS = 30 * 60 * 1000;

export function useWeather(coords: GeoCoords | null): WeatherState | null {
  // Hydrate from the last fetch so the first frame already wears the right weather
  // (stale-while-revalidate; the mount fetch below refreshes it silently).
  const [weather, setWeather] = useState<WeatherState | null>(() => readCachedWeather());
  const lastRef = useRef<WeatherState | null>(weather);

  const fetchWeather = useCallback(async (c: GeoCoords) => {
    try {
      const res = await fetch(buildOpenMeteoUrl(c));
      if (!res.ok) throw new Error('weather fetch failed');
      const json = (await res.json()) as Parameters<typeof parseOpenMeteoResponse>[0];
      const parsed = parseOpenMeteoResponse(json, c);
      lastRef.current = parsed;
      writeCachedWeather(parsed);
      setWeather(parsed);
    } catch {
      setWeather(lastRef.current ?? { ...DEFAULT_WEATHER, coords: c });
    }
  }, []);

  useEffect(() => {
    if (!coords) return;
    void fetchWeather(coords);
    const id = window.setInterval(() => void fetchWeather(coords), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [coords, fetchWeather]);

  return weather;
}
