'use client';

import { useEffect, useMemo, useState } from 'react';

import { getSeason } from '@bloom/core';
import {
  buildReverseGeocodeUrl,
  parseLocationName,
  type SceneState,
} from '@bloom/core/scene';

import { useGeolocation } from './useGeolocation';
import { useMoonPhase } from './useMoonPhase';
import { useTimePhase } from './useTimePhase';
import { useWeather } from './useWeather';

export function useScene(): SceneState {
  const geo = useGeolocation();
  const timePhase = useTimePhase();
  const moon = useMoonPhase();
  const season = useMemo(() => getSeason(new Date().getMonth() + 1), []);
  const coords = geo.coords;
  const weather = useWeather(coords);
  const [locationName, setLocationName] = useState<string | null>(null);

  const status = useMemo((): SceneState['status'] => {
    if (!weather) return 'fetching';
    return 'ready';
  }, [weather]);

  useEffect(() => {
    if (!coords || status !== 'ready') return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(buildReverseGeocodeUrl(coords.lat, coords.lon), {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const json = (await res.json()) as Parameters<typeof parseLocationName>[0];
        if (!cancelled) {
          const name = parseLocationName(json, coords);
          setLocationName(name === 'Your meadow' ? null : name);
        }
      } catch {
        /* badge falls back to coords */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coords, status]);

  return {
    weather,
    timePhase,
    season,
    status,
    locationName,
    moon,
  };
}
