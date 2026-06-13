/**
 * Bridges the real `EntryRecord` (IndexedDB/Supabase) onto the shape the Bloom Meadow
 * reference code expects: `createdAt` as a Date, a 5-phase `timePhase`, a display `weather`
 * string, and a `place`. `EntryRecord` has no `place`, so it is derived from the entry's
 * weather snapshot location (omitted when absent).
 */
import type { EntryRecord, Mood } from '@bloom/core';
import type { TimePhase, WeatherCategory } from '@bloom/core/scene/types';

import type { PhaseKey } from './phases';

export interface ReferenceEntry {
  id: string;
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
  createdAt: Date;
  isFavourited: boolean;
  revisitOf: string | null;
  weather: string;
  timePhase: PhaseKey;
  place: string | null;
}

const WEATHER_LABEL: Record<WeatherCategory, string> = {
  clear: 'Clear',
  partly_cloudy: 'Partly cloudy',
  overcast: 'Clouds',
  fog: 'Mist',
  drizzle: 'Light rain',
  rain: 'Rain',
  heavy_rain: 'Heavy rain',
  snow: 'Snow',
  thunderstorm: 'Storm',
};

const PHASE_MAP: Record<TimePhase, PhaseKey> = {
  deep_night: 'night',
  pre_dawn: 'dawn',
  dawn: 'dawn',
  day: 'day',
  golden_hour: 'golden',
  dusk: 'dusk',
  night: 'night',
};

export function toReferenceEntry(e: EntryRecord): ReferenceEntry {
  return {
    id: e.id,
    title: e.title ?? 'Untitled',
    content: e.content,
    mood: e.mood,
    tags: e.tags,
    createdAt: new Date(e.createdAt),
    isFavourited: e.isFavourited,
    revisitOf: e.revisitOf,
    weather: e.weather ? WEATHER_LABEL[e.weather.category] : 'Clear',
    timePhase: e.timePhase ? PHASE_MAP[e.timePhase] : 'day',
    place: e.weather?.locationName ?? null,
  };
}
