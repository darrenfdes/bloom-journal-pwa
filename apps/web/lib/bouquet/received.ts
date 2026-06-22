import type { BouquetPayload } from '@bloom/core';

import { getDb, type KeptBouquetRow } from '@/lib/db/client';
import { getActiveSyncUser, schedulePush } from '@/lib/sync/engine';

/**
 * Save a received bouquet to the keepsake shelf. Deduped by bouquet id — keeping the same bouquet
 * again is a no-op (the original `receivedAt`, source, and owner are preserved). Writes only to the
 * `bouquets` table; never touches the recipient's entries or garden. Stamps the active user and
 * queues a push so a signed-in shelf syncs across devices.
 */
export async function keepBouquet(
  payload: BouquetPayload,
  source: 'link' | 'file',
): Promise<KeptBouquetRow> {
  const db = getDb();
  const existing = await db.bouquets.get(payload.id);
  if (existing) return existing;

  const row: KeptBouquetRow = {
    id: payload.id,
    payload,
    receivedAt: new Date().toISOString(),
    source,
    userId: getActiveSyncUser() ?? 'local',
    pendingPush: true,
    syncedAt: null,
  };
  await db.bouquets.add(row);
  schedulePush();
  return row;
}

/** Kept bouquets on the active shelf (signed-in user, or the local-only shelf when signed out). */
export async function listKeptBouquets(): Promise<KeptBouquetRow[]> {
  const db = getDb();
  const owner = getActiveSyncUser() ?? 'local';
  return db.bouquets.orderBy('receivedAt').reverse().filter((b) => b.userId === owner).toArray();
}

export async function getKeptBouquet(id: string): Promise<KeptBouquetRow | null> {
  const db = getDb();
  return (await db.bouquets.get(id)) ?? null;
}
