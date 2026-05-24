import { useEffect, useState } from 'react';
import * as Location from 'expo-location';

import { FALLBACK_COORDS, type GeoCoords } from '@bloom/core/scene';

/** Starts with fallback coords; only reads GPS when permission is already granted (no prompt). */
export function useGeolocation(): { coords: GeoCoords; locating: boolean } {
  const [coords, setCoords] = useState<GeoCoords>(FALLBACK_COORDS);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled) {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        }
      } catch {
        /* keep fallback coords */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { coords, locating: false };
}
