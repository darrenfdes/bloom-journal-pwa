import { useMemo } from 'react';

import { getSeason, type SceneState } from '@bloom/core';

import { useGeolocation } from './useGeolocation';
import { useMoonPhase } from './useMoonPhase';
import { useTimePhase } from './useTimePhase';
import { useWeather } from './useWeather';

export function useScene(): SceneState {
  const { coords } = useGeolocation();
  const timePhase = useTimePhase();
  const moon = useMoonPhase();
  const { weather, locationName, fetching } = useWeather(coords);
  const season = useMemo(() => getSeason(new Date().getMonth() + 1), []);

  const status = useMemo((): SceneState['status'] => {
    if (fetching && !weather) return 'fetching';
    return 'ready';
  }, [fetching, weather]);

  return { weather, timePhase, season, status, locationName, moon };
}
