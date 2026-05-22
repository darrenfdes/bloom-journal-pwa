import { getSqlite } from '@/lib/db/client';
import { createId } from '@/lib/id';
import { parseJsonObject } from '@/lib/db/json';
import type { GardenMeta } from '@/lib/types';

type GardenMetaRow = {
  id: string;
  user_id: string;
  theme: string;
  layout_mode: string;
  last_entry_at: string | null;
  has_planted_first: number;
  unlocked_seasons: string;
  created_at: string;
};

function rowToMeta(row: GardenMetaRow): GardenMeta {
  return {
    id: row.id,
    userId: row.user_id,
    theme: row.theme,
    layoutMode: row.layout_mode,
    lastEntryAt: row.last_entry_at,
    hasPlantedFirst: Boolean(row.has_planted_first),
    unlockedSeasons: parseJsonObject<string[]>(row.unlocked_seasons, []),
    createdAt: row.created_at,
  };
}

export async function getOrCreateGardenMeta(): Promise<GardenMeta> {
  const db = getSqlite();
  const row = await db.getFirstAsync<GardenMetaRow>('SELECT * FROM garden_meta LIMIT 1');
  if (row) return rowToMeta(row);

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

  await db.runAsync(
    `INSERT INTO garden_meta (
      id, user_id, theme, layout_mode, last_entry_at, has_planted_first, unlocked_seasons, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    meta.id,
    meta.userId,
    meta.theme,
    meta.layoutMode,
    meta.lastEntryAt,
    meta.hasPlantedFirst ? 1 : 0,
    JSON.stringify(meta.unlockedSeasons),
    meta.createdAt
  );

  return meta;
}

export async function refreshGardenAfterWrite(): Promise<void> {
  const db = getSqlite();
  const meta = await getOrCreateGardenMeta();
  await db.runAsync('UPDATE garden_meta SET last_entry_at = ? WHERE id = ?', new Date().toISOString(), meta.id);
}
