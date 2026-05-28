import type { Season } from '../theme/seasons';
import type { MoonPhaseState } from './moon-phase';

export type WeatherCategory =
  | 'clear'
  | 'partly_cloudy'
  | 'overcast'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'heavy_rain'
  | 'snow'
  | 'thunderstorm';

export type TimePhase =
  | 'deep_night'
  | 'pre_dawn'
  | 'dawn'
  | 'day'
  | 'golden_hour'
  | 'dusk'
  | 'night';

export type SceneStatus = 'locating' | 'fetching' | 'ready' | 'error';

export interface GeoCoords {
  lat: number;
  lon: number;
}

export interface WeatherState {
  category: WeatherCategory;
  windSpeed: number;
  cloudCover: number;
  visibility: number;
  precipitation: number;
  temperature: number;
  coords: GeoCoords;
  wmoCode?: number;
}

export interface SceneState {
  weather: WeatherState | null;
  timePhase: TimePhase;
  season: Season;
  status: SceneStatus;
  locationName: string | null;
  moon: MoonPhaseState;
}

/** Persisted snapshot on journal entries planted from the garden panel. */
export interface EntryWeatherSnapshot {
  category: WeatherCategory;
  windSpeed: number;
  cloudCover: number;
  visibility: number;
  precipitation: number;
  temperature: number;
  coords: GeoCoords;
  locationName?: string | null;
}

export interface SceneEntrySnapshot {
  weather: EntryWeatherSnapshot;
  timePhase: TimePhase;
  sceneSeason: Season;
}
