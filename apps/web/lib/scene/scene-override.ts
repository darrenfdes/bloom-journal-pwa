/**
 * Toolbar overrides layered over the live SceneContext. `auto` means "use the
 * real scene" (the reference's "✦ Auto"); any other value pins that facet so the
 * sky, hills, light, and particles all read the overridden phase/weather.
 */
import type {
  SceneState,
  TimePhase,
  WeatherCategory,
  WeatherState,
} from '@bloom/core/scene';

export type PhaseOverride = 'auto' | TimePhase;
export type WeatherOverride = 'auto' | WeatherCategory;

export interface SceneOverride {
  phase: PhaseOverride;
  weather: WeatherOverride;
}

export const DEFAULT_OVERRIDE: SceneOverride = { phase: 'auto', weather: 'auto' };

/** Approximate cloud cover (%) + precipitation (mm) implied by a category. */
const WEATHER_SHAPE: Record<WeatherCategory, { cloudCover: number; precipitation: number }> = {
  clear: { cloudCover: 5, precipitation: 0 },
  partly_cloudy: { cloudCover: 40, precipitation: 0 },
  overcast: { cloudCover: 85, precipitation: 0 },
  fog: { cloudCover: 70, precipitation: 0 },
  drizzle: { cloudCover: 75, precipitation: 0.3 },
  rain: { cloudCover: 88, precipitation: 2.5 },
  heavy_rain: { cloudCover: 96, precipitation: 8 },
  snow: { cloudCover: 85, precipitation: 2 },
  thunderstorm: { cloudCover: 96, precipitation: 10 },
};

export function applySceneOverride(scene: SceneState, override: SceneOverride): SceneState {
  let next = scene;

  if (override.phase !== 'auto') {
    next = { ...next, timePhase: override.phase };
  }

  if (override.weather !== 'auto') {
    const shape = WEATHER_SHAPE[override.weather];
    const base: WeatherState =
      next.weather ?? {
        category: override.weather,
        windSpeed: 0,
        cloudCover: 0,
        visibility: 10000,
        precipitation: 0,
        temperature: 20,
        coords: { lat: 0, lon: 0 },
      };
    next = {
      ...next,
      weather: { ...base, category: override.weather, ...shape },
    };
  }

  return next;
}
