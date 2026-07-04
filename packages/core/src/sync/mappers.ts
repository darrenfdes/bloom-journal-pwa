import type { AppSettings, EntryRecord, GardenMeta, Mood, Sentiment } from '../types';
import type { Season } from '../theme/seasons';
import type { TimePhase } from '../scene/types';
import type {
  RemoteAppSettingsRow,
  RemoteEntryRow,
  RemoteGardenMetaRow,
} from './remote-types';

export function entryToRemote(entry: EntryRecord, userId: string): RemoteEntryRow {
  return {
    id: entry.id,
    user_id: userId,
    title: entry.title,
    content: entry.content,
    mood: entry.mood,
    additional_moods: entry.additionalMoods ?? [],
    inferred_sentiment: entry.inferredSentiment,
    tags: entry.tags,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    flower_seed: entry.flowerSeed,
    flower_style: entry.flowerStyle,
    garden_position: entry.gardenPosition,
    is_favourited: entry.isFavourited,
    revisit_of: entry.revisitOf,
    is_deleted: entry.isDeleted,
    weather: entry.weather ?? null,
    time_phase: entry.timePhase ?? null,
    scene_season: entry.sceneSeason ?? null,
  };
}

export function remoteToEntry(row: RemoteEntryRow): EntryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content ?? '',
    mood: row.mood as Mood | null,
    additionalMoods: (row.additional_moods as Mood[] | undefined) ?? [],
    inferredSentiment: row.inferred_sentiment as Sentiment | null,
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flowerSeed: row.flower_seed,
    flowerStyle: row.flower_style,
    gardenPosition: row.garden_position,
    isFavourited: row.is_favourited,
    revisitOf: row.revisit_of,
    isDeleted: row.is_deleted,
    weather: row.weather,
    timePhase: (row.time_phase as TimePhase | null) ?? null,
    sceneSeason: (row.scene_season as Season | null) ?? null,
  };
}

export function gardenMetaToRemote(
  meta: GardenMeta,
  userId: string,
  updatedAt?: string
): RemoteGardenMetaRow {
  const stamp = updatedAt ?? meta.lastEntryAt ?? meta.createdAt;
  return {
    user_id: userId,
    theme: meta.theme,
    layout_mode: meta.layoutMode,
    last_entry_at: meta.lastEntryAt,
    has_planted_first: meta.hasPlantedFirst,
    unlocked_seasons: meta.unlockedSeasons,
    created_at: meta.createdAt,
    updated_at: stamp,
  };
}

export function remoteToGardenMeta(row: RemoteGardenMetaRow, localId: string): GardenMeta {
  return {
    id: localId,
    userId: row.user_id,
    theme: row.theme,
    layoutMode: row.layout_mode,
    lastEntryAt: row.last_entry_at,
    hasPlantedFirst: row.has_planted_first,
    unlockedSeasons: row.unlocked_seasons ?? [],
    createdAt: row.created_at,
  };
}

export type SyncableAppSettings = Pick<
  AppSettings,
  'reminderEnabled' | 'reminderHour' | 'reminderMinute'
>;

export function appSettingsToRemote(
  settings: SyncableAppSettings,
  userId: string,
  updatedAt: string
): RemoteAppSettingsRow {
  return {
    user_id: userId,
    reminder_enabled: settings.reminderEnabled,
    reminder_hour: settings.reminderHour,
    reminder_minute: settings.reminderMinute,
    updated_at: updatedAt,
  };
}

export function remoteToSyncableAppSettings(row: RemoteAppSettingsRow): SyncableAppSettings {
  return {
    reminderEnabled: row.reminder_enabled,
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
  };
}
