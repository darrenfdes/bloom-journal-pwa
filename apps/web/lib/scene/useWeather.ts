'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  DEFAULT_WEATHER,
  buildOpenMeteoUrl,
  parseOpenMeteoResponse,
  type GeoCoords,
  type WeatherState,
} from '@bloom/core/scene';

const REFRESH_MS = 30 * 60 * 1000;

export function useWeather(coords: GeoCoords | null): WeatherState | null {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const lastRef = useRef<WeatherState | null>(null);

  const fetchWeather = useCallback(async (c: GeoCoords) => {
    try {
      const res = await fetch(buildOpenMeteoUrl(c));
      if (!res.ok) throw new Error('weather fetch failed');
      const json = (await res.json()) as Parameters<typeof parseOpenMeteoResponse>[0];
      const parsed = parseOpenMeteoResponse(json, c);
      lastRef.current = parsed;
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
