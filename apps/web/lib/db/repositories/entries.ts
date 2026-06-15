import { createFlowerSeed } from '@bloom/core/flowers/genome';
import { assignPositionForNewEntry } from '@bloom/core/garden/layout';

import { getDb } from '@/lib/db/client';
import { createId } from '@/lib/id';
import { getActiveSyncUser } from '@/lib/sync/engine';
import { afterLocalMutation } from '@/lib/sync/hooks';
import { resolveMood } from '@/lib/sentiment/infer';
import type { EntryRecord, TimePhase, WriteDraft } from '@/lib/types';
import type { EntryWeatherSnapshot, Season } from '@bloom/core';

export type PlantSceneSnapshot = {
  weather: EntryWeatherSnapshot | null;
  timePhase: TimePhase;
  sceneSeason: Season;
};

export async function listEntries(includeDeleted = false): Promise<EntryRecord[]> {
  const db = getDb();
  const rows = await db.entries.orderBy('createdAt').reverse().toArray();
  return includeDeleted ? rows : rows.filter((r) => !r.isDeleted);
}

export async function getEntry(id: string): Promise<EntryRecord | null> {
  const db = getDb();
  return (await db.entries.get(id)) ?? null;
}

export async function plantEntry(
  draft: WriteDraft,
  bounds: { width: number; height: number },
  scene?: PlantSceneSnapshot
): Promise<EntryRecord> {
  const db = getDb();
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

  const record: EntryRecord = {
    id,
    userId: getActiveSyncUser() ?? 'local',
    title: draft.title.trim() || null,
    content: draft.content.trim(),
    mood,
    inferredSentiment,
    tags: draft.tags,
    createdAt,
    updatedAt: now,
    flowerSeed,
    flowerStyle: JSON.stringify({ speciesSeed: flowerSeed % 8 }),
    gardenPosition: position,
    isFavourited: false,
    revisitOf: draft.revisitOf,
    isDeleted: false,
    weather: scene?.weather ?? null,
    timePhase: scene?.timePhase ?? null,
    sceneSeason: scene?.sceneSeason ?? null,
  };

  await db.entries.add({ ...record, pendingPush: true, syncedAt: null });

  const meta = await db.garden_meta.toCollection().first();
  if (meta) {
    await db.garden_meta.update(meta.id, {
      lastEntryAt: now,
      hasPlantedFirst: true,
    });
  }

  void afterLocalMutation();
  return record;
}

/** @deprecated Use plantEntry — kept for direct plant without confirm screen */
export async function createEntry(
  draft: WriteDraft,
  bounds = { width: 390, height: 800 }
): Promise<EntryRecord> {
  return plantEntry(draft, bounds);
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<EntryRecord, 'title' | 'content' | 'mood' | 'tags'>>
): Promise<EntryRecord | null> {
  const entry = await getEntry(id);
  if (!entry) return null;

  const now = new Date().toISOString();
  const content = patch.content ?? entry.content;
  const moodPatch = patch.mood !== undefined ? patch.mood : entry.mood;
  const { mood, inferredSentiment } = resolveMood(moodPatch, content);

  const updated: EntryRecord = {
    ...entry,
    title: patch.title !== undefined ? patch.title : entry.title,
    content,
    mood,
    inferredSentiment: patch.mood !== undefined && patch.mood !== null ? null : inferredSentiment,
    tags: patch.tags ?? entry.tags,
    updatedAt: now,
  };

  await getDb().entries.put({ ...updated, pendingPush: true });
  void afterLocalMutation();
  return updated;
}

export async function toggleFavourite(id: string): Promise<EntryRecord | null> {
  const entry = await getEntry(id);
  if (!entry) return null;

  const updated: EntryRecord = {
    ...entry,
    isFavourited: !entry.isFavourited,
    updatedAt: new Date().toISOString(),
  };

  await getDb().entries.put({ ...updated, pendingPush: true });
  void afterLocalMutation();
  return updated;
}

export async function softDelete(id: string): Promise<void> {
  const entry = await getEntry(id);
  if (!entry) return;

  await getDb().entries.put({
    ...entry,
    isDeleted: true,
    updatedAt: new Date().toISOString(),
    pendingPush: true,
  });
  void afterLocalMutation();
}

export async function searchEntries(query: string): Promise<EntryRecord[]> {
  const q = query.trim().toLowerCase();
  if (!q) return listEntries();

  const all = await listEntries();
  return all.filter(
    (e) =>
      e.content.toLowerCase().includes(q) ||
      (e.title?.toLowerCase().includes(q) ?? false) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export async function countRevisits(parentId: string): Promise<number> {
  const all = await listEntries();
  return all.filter((e) => e.revisitOf === parentId).length;
}
