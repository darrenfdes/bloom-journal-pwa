'use client';

import { useEffect, useState } from 'react';

import { FALLBACK_COORDS, type GeoCoords } from '@bloom/core/scene';

import { readCachedCoords } from './weather-cache';

export { FALLBACK_COORDS };

export type GeolocationState = { status: 'ready'; coords: GeoCoords };

/**
 * Resolves immediately with the last-known coords (falling back to country-level defaults);
 * upgrades silently if geolocation is available.
 */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>(() => ({
    status: 'ready',
    coords: readCachedCoords() ?? FALLBACK_COORDS,
  }));

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          status: 'ready',
          coords: { lat: pos.coords.latitude, lon: pos.coords.longitude },
        });
      },
      () => {
        /* keep fallback coords */
      },
      {
        enableHighAccuracy: false,
        timeout: 10_000,
        maximumAge: 3_600_000,
      }
    );
  }, []);

  return state;
}
