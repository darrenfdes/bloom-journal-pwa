import type { BouquetPayload } from '@bloom/core';

import { getDb, type KeptBouquetRow } from '@/lib/db/client';

/**
 * Save a received bouquet to the local keepsake shelf. Deduped by bouquet id — keeping the same
 * bouquet again is a no-op (the original `receivedAt` and source are preserved). Writes only to the
 * `bouquets` table; never touches the recipient's entries or garden.
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
  };
  await db.bouquets.add(row);
  return row;
}

export async function listKeptBouquets(): Promise<KeptBouquetRow[]> {
  const db = getDb();
  return db.bouquets.orderBy('receivedAt').reverse().toArray();
}

export async function getKeptBouquet(id: string): Promise<KeptBouquetRow | null> {
  const db = getDb();
  return (await db.bouquets.get(id)) ?? null;
}
