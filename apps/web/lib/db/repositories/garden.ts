import { getDb } from '@/lib/db/client';
import { createId } from '@/lib/id';
import { afterLocalMutation } from '@/lib/sync/hooks';
import type { GardenMeta } from '@/lib/types';

export async function getOrCreateGardenMeta(): Promise<GardenMeta> {
  const db = getDb();
  const existing = await db.garden_meta.toCollection().first();
  if (existing) return existing;

  const now = new Date().toISOString();
  const meta: GardenMeta = {
    id: createId(),
    userId: 'local',
    theme: 'watercolor',
    layoutMode: 'organic',
    lastEntryAt: null,
    hasPlantedFirst: false,
    unlockedSeasons: [],
    createdAt: now,
  };

  await db.garden_meta.add(meta);
  return meta;
}

/** Keep `hasPlantedFirst` aligned when entries exist but the flag was cleared (e.g. sync). */
export async function repairGardenMetaIfNeeded(): Promise<GardenMeta> {
  const db = getDb();
  const meta = await getOrCreateGardenMeta();
  const entryCount = await db.entries.filter((e) => !e.isDeleted).count();
  if (!meta.hasPlantedFirst && entryCount > 0) {
    await db.garden_meta.update(meta.id, { hasPlantedFirst: true });
    return { ...meta, hasPlantedFirst: true };
  }
  return meta;
}

export async function refreshGardenAfterWrite(): Promise<void> {
  const db = getDb();
  const meta = await getOrCreateGardenMeta();
  await db.garden_meta.update(meta.id, {
    lastEntryAt: new Date().toISOString(),
  });
  void afterLocalMutation();
}
