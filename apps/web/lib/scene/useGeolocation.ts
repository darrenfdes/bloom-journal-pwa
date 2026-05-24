'use client';

import { useEffect, useState } from 'react';

import { FALLBACK_COORDS, type GeoCoords } from '@bloom/core/scene';

export { FALLBACK_COORDS };

export type GeolocationState = { status: 'ready'; coords: GeoCoords };

/** Resolves immediately with fallback coords; upgrades silently if geolocation is available. */
export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    status: 'ready',
    coords: FALLBACK_COORDS,
  });

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
