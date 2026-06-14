/**
 * @deprecated Fixed `SceneState` presets for the old `DeprecatedWeatherPreviewScene` pages.
 * Superseded by the live `BloomMeadow` preview (`/preview`) and garden (`/garden`). Kept for
 * reference; not linked from the app.
 */
import { getMoonPhase, type MoonPhaseState } from '@bloom/core/scene';
import type { SceneState, TimePhase, WeatherState } from '@bloom/core/scene';

const PREVIEW_COORDS = { lat: 51.5, lon: -0.1 };

function daytimeWeather(
  overrides: Partial<WeatherState> & Pick<WeatherState, 'category'>
): WeatherState {
  return {
    windSpeed: 8,
    cloudCover: 20,
    visibility: 10000,
    precipitation: 0,
    temperature: 18,
    coords: PREVIEW_COORDS,
    ...overrides,
  };
}

function sceneState(
  timePhase: TimePhase,
  weather: WeatherState,
  moon: MoonPhaseState = getMoonPhase(new Date())
): SceneState {
  return {
    status: 'ready',
    timePhase,
    season: 'summer',
    locationName: null,
    weather,
    moon,
  };
}

function daytimeScene(timePhase: TimePhase, weather: WeatherState): SceneState {
  return sceneState(timePhase, weather);
}

export const DAWN_PREVIEW_SCENE = daytimeScene(
  'dawn',
  daytimeWeather({
    category: 'partly_cloudy',
    cloudCover: 40,
    temperature: 11,
    windSpeed: 6,
    wmoCode: 2,
  })
);

export const DAY_PREVIEW_SCENE = daytimeScene(
  'day',
  daytimeWeather({
    category: 'clear',
    cloudCover: 8,
    temperature: 22,
    windSpeed: 10,
    wmoCode: 0,
  })
);

export const GOLDEN_HOUR_PREVIEW_SCENE = daytimeScene(
  'golden_hour',
  daytimeWeather({
    category: 'partly_cloudy',
    cloudCover: 28,
    temperature: 17,
    windSpeed: 5,
    wmoCode: 2,
  })
);

export const HEAVY_RAIN_PREVIEW_SCENE: SceneState = {
  status: 'ready',
  timePhase: 'day',
  season: 'summer',
  locationName: null,
  moon: getMoonPhase(new Date()),
  weather: {
    category: 'heavy_rain',
    windSpeed: 18,
    cloudCover: 92,
    visibility: 6000,
    precipitation: 8.5,
    temperature: 14,
    coords: PREVIEW_COORDS,
    wmoCode: 65,
  },
};

/** Night sky with heavy rain — moon should be hidden behind clouds. */
export const NIGHT_STORM_PREVIEW_SCENE: SceneState = sceneState(
  'night',
  {
    category: 'heavy_rain',
    windSpeed: 18,
    cloudCover: 92,
    visibility: 6000,
    precipitation: 8.5,
    temperature: 14,
    coords: PREVIEW_COORDS,
    wmoCode: 65,
  },
  getMoonPhase(new Date('2026-05-29T22:00:00Z'))
);

/** Clear night with full moon (~14.77 days after 15 Jun 2026 new moon). */
export const FULL_MOON_PREVIEW_SCENE: SceneState = sceneState(
  'night',
  daytimeWeather({
    category: 'clear',
    cloudCover: 5,
    temperature: 14,
    windSpeed: 4,
    wmoCode: 0,
  }),
  getMoonPhase(new Date('2026-06-29T22:00:00Z'))
);

export const PREVIEW_ROUTES = [
  { href: '/preview/dawn', label: 'Dawn' },
  { href: '/preview/day', label: 'Day (clear)' },
  { href: '/preview/golden-hour', label: 'Golden hour' },
  { href: '/preview/full-moon', label: 'Full moon (night)' },
  { href: '/preview/heavy-rain', label: 'Heavy rain' },
  { href: '/preview/night-storm', label: 'Night storm (no moon)' },
  { href: '/preview/flowers', label: 'Flowers (all moods)' },
] as const;
