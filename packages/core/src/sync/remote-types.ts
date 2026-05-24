import type { EntryWeatherSnapshot } from '../scene/types';
import type { GardenPosition } from '../types';

/** Postgres `entries` row (snake_case). */
export interface RemoteEntryRow {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  inferred_sentiment: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  flower_seed: number;
  flower_style: string;
  garden_position: GardenPosition | null;
  is_favourited: boolean;
  revisit_of: string | null;
  is_deleted: boolean;
  weather: EntryWeatherSnapshot | null;
  time_phase: string | null;
  scene_season: string | null;
}

/** Postgres `garden_meta` row. */
export interface RemoteGardenMetaRow {
  user_id: string;
  theme: string;
  layout_mode: string;
  last_entry_at: string | null;
  has_planted_first: boolean;
  unlocked_seasons: string[];
  created_at: string;
  updated_at: string;
}

/** Syncable reminder prefs only — PIN/biometric stay client-only. */
export interface RemoteAppSettingsRow {
  user_id: string;
  reminder_enabled: boolean;
  reminder_hour: number;
  reminder_minute: number;
  updated_at: string;
}
