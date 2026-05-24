import { getSqlite } from '@/lib/db/client';
import { afterLocalMutation } from '@/lib/sync/hooks';
import { createId } from '@/lib/id';
import { parseGardenPosition, parseJsonArray } from '@/lib/db/json';
import { createFlowerSeed } from '@/lib/flowers/genome';
import { assignPositionForNewEntry } from '@/lib/garden/layout';
import { resolveMood } from '@/lib/sentiment/infer';
import type { EntryWeatherSnapshot, Season, TimePhase } from '@bloom/core';
import { parseJsonObject } from '@/lib/db/json';
import type { EntryRecord, GardenPosition, Mood, WriteDraft } from '@/lib/types';

export type PlantSceneSnapshot = {
  weather: EntryWeatherSnapshot | null;
  timePhase: TimePhase;
  sceneSeason: Season;
};

export type EntryRow = {
  id: string;
  user_id: string;
  title: string | null;
  content: string;
  mood: string | null;
  inferred_sentiment: string | null;
  tags: string;
  created_at: string;
  updated_at: string;
  flower_seed: number;
  flower_style: string;
  garden_position: string | null;
  is_favourited: number;
  revisit_of: string | null;
  is_deleted: number;
  weather: string | null;
  time_phase: string | null;
  scene_season: string | null;
  synced_at: string | null;
  pending_push: number;
};

function rowToEntry(row: EntryRow): EntryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    content: row.content,
    mood: row.mood as Mood | null,
    inferredSentiment: row.inferred_sentiment as EntryRecord['inferredSentiment'],
    tags: parseJsonArray(row.tags),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    flowerSeed: row.flower_seed,
    flowerStyle: row.flower_style,
    gardenPosition: parseGardenPosition(row.garden_position),
    isFavourited: Boolean(row.is_favourited),
    revisitOf: row.revisit_of,
    isDeleted: Boolean(row.is_deleted),
    weather: row.weather
      ? parseJsonObject<EntryWeatherSnapshot | null>(row.weather, null)
      : null,
    timePhase: (row.time_phase as TimePhase | null) ?? null,
    sceneSeason: (row.scene_season as Season | null) ?? null,
    syncedAt: row.synced_at,
    pendingPush: Boolean(row.pending_push),
  };
}

async function fetchEntryRows(includeDeleted: boolean): Promise<EntryRow[]> {
  const db = getSqlite();
  const rows = await db.getAllAsync<EntryRow>(
    'SELECT * FROM entries ORDER BY datetime(created_at) DESC'
  );
  return includeDeleted ? rows : rows.filter((r) => !r.is_deleted);
}

export async function listEntries(includeDeleted = false): Promise<EntryRecord[]> {
  const rows = await fetchEntryRows(includeDeleted);
  return rows.map(rowToEntry);
}

export async function getEntry(id: string): Promise<EntryRecord | null> {
  const db = getSqlite();
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?', id);
  if (!row) return null;
  return rowToEntry(row);
}

export async function plantEntry(
  draft: WriteDraft,
  bounds: { width: number; height: number },
  scene?: PlantSceneSnapshot
): Promise<EntryRecord> {
  const db = getSqlite();
  const id = createId();
  const now = new Date().toISOString();
  const createdAt = draft.createdAtOverride ?? now;
  const { mood, inferredSentiment } = resolveMood(draft.mood, draft.content);
  const existing = await listEntries();
  const position = assignPositionForNewEntry(
    existing,
    bounds,
    id,
    createdAt,
    draft.revisitOf
  );
  const flowerSeed = createFlowerSeed(id);
  const flowerStyle = JSON.stringify({ speciesSeed: flowerSeed % 8 });

  const record: EntryRecord = {
    id,
    userId: 'local',
    title: draft.title.trim() || null,
    content: draft.content.trim(),
    mood,
    inferredSentiment,
    tags: draft.tags,
    createdAt,
    updatedAt: now,
    flowerSeed,
    flowerStyle,
    gardenPosition: position,
    isFavourited: false,
    revisitOf: draft.revisitOf,
    isDeleted: false,
    weather: scene?.weather ?? null,
    timePhase: scene?.timePhase ?? null,
    sceneSeason: scene?.sceneSeason ?? null,
  };

  await db.runAsync(
    `INSERT INTO entries (
      id, user_id, title, content, mood, inferred_sentiment, tags,
      created_at, updated_at, flower_seed, flower_style, garden_position,
      is_favourited, revisit_of, is_deleted, weather, time_phase, scene_season,
      synced_at, pending_push
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    record.id,
    record.userId,
    record.title,
    record.content,
    record.mood,
    record.inferredSentiment,
    JSON.stringify(record.tags),
    record.createdAt,
    record.updatedAt,
    record.flowerSeed,
    record.flowerStyle,
    JSON.stringify(record.gardenPosition),
    record.isFavourited ? 1 : 0,
    record.revisitOf,
    0,
    record.weather ? JSON.stringify(record.weather) : null,
    record.timePhase ?? null,
    record.sceneSeason ?? null,
    null
  );

  const meta = await db.getFirstAsync<{ id: string }>('SELECT id FROM garden_meta LIMIT 1');
  if (meta) {
    await db.runAsync(
      'UPDATE garden_meta SET last_entry_at = ?, has_planted_first = 1 WHERE id = ?',
      now,
      meta.id
    );
  }

  void afterLocalMutation();
  return record;
}

export async function toggleFavourite(id: string): Promise<EntryRecord | null> {
  const entry = await getEntry(id);
  if (!entry) return null;
  const next = !entry.isFavourited;
  const db = getSqlite();
  await db.runAsync(
    'UPDATE entries SET is_favourited = ?, updated_at = ?, pending_push = 1 WHERE id = ?',
    next ? 1 : 0,
    new Date().toISOString(),
    id
  );
  void afterLocalMutation();
  return { ...entry, isFavourited: next };
}

export async function softDeleteEntry(id: string): Promise<void> {
  const db = getSqlite();
  await db.runAsync(
    'UPDATE entries SET is_deleted = 1, updated_at = ?, pending_push = 1 WHERE id = ?',
    new Date().toISOString(),
    id
  );
  void afterLocalMutation();
}

export async function searchEntries(query: string): Promise<EntryRecord[]> {
  const q = `%${query.trim()}%`;
  const db = getSqlite();
  const rows = await db.getAllAsync<EntryRow>(
    `SELECT * FROM entries
     WHERE is_deleted = 0
       AND (content LIKE ? OR title LIKE ? OR tags LIKE ?)
     ORDER BY datetime(created_at) DESC`,
    q,
    q,
    q
  );
  return rows.map(rowToEntry);
}

export async function updateGardenPosition(
  id: string,
  position: GardenPosition
): Promise<void> {
  const db = getSqlite();
  await db.runAsync(
    'UPDATE entries SET garden_position = ?, updated_at = ?, pending_push = 1 WHERE id = ?',
    JSON.stringify(position),
    new Date().toISOString(),
    id
  );
  void afterLocalMutation();
}

export async function getRevisitChildren(parentId: string): Promise<EntryRecord[]> {
  const all = await listEntries();
  return all.filter((e) => e.revisitOf === parentId);
}
