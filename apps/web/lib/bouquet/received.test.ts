import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { getDb } from '@/lib/db/client';
import { setActiveSyncUser } from '@/lib/sync/engine';

import { getKeptBouquet, keepBouquet, listKeptBouquets } from './received';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'e1',
    userId: 'local',
    title: null,
    content: 'A quiet memory.',
    mood: 'peaceful',
    inferredSentiment: null,
    tags: [],
    createdAt: '2026-05-15T12:00:00.000Z',
    updatedAt: '2026-05-15T12:00:00.000Z',
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: null,
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    weather: null,
    timePhase: 'day',
    sceneSeason: null,
    ...overrides,
  };
}

beforeEach(async () => {
  const db = getDb();
  await Promise.all([db.bouquets.clear(), db.entries.clear(), db.garden_meta.clear()]);
  setActiveSyncUser(null);
});

describe('keepBouquet', () => {
  it('writes one kept row and reads it back', async () => {
    const payload = buildBouquet([entry()], { from: 'Mara', note: 'hi' });
    await keepBouquet(payload, 'link');

    const kept = await listKeptBouquets();
    expect(kept).toHaveLength(1);
    expect(kept[0].id).toBe(payload.id);
    expect(kept[0].source).toBe('link');
    expect(kept[0].payload).toEqual(payload);
    expect(typeof kept[0].receivedAt).toBe('string');
  });

  it('stamps the local owner and queues a push when signed out', async () => {
    const row = await keepBouquet(buildBouquet([entry()]), 'link');
    expect(row.userId).toBe('local');
    expect(row.pendingPush).toBe(true);
  });

  it('stamps the signed-in user and scopes the shelf to that user', async () => {
    setActiveSyncUser(null);
    await keepBouquet(buildBouquet([entry({ id: 'a' })]), 'link');

    setActiveSyncUser('user-1');
    const mine = await keepBouquet(buildBouquet([entry({ id: 'b' })]), 'file');
    expect(mine.userId).toBe('user-1');

    // Only the signed-in user's keepsake shows on their shelf...
    const signedInShelf = await listKeptBouquets();
    expect(signedInShelf).toHaveLength(1);
    expect(signedInShelf[0].userId).toBe('user-1');

    // ...and the local-only keepsake shows again when signed out.
    setActiveSyncUser(null);
    const localShelf = await listKeptBouquets();
    expect(localShelf).toHaveLength(1);
    expect(localShelf[0].userId).toBe('local');
  });

  it('dedupes by bouquet id — keeping the same bouquet twice stays one row', async () => {
    const payload = buildBouquet([entry()]);
    await keepBouquet(payload, 'link');
    await keepBouquet(payload, 'file');

    expect(await listKeptBouquets()).toHaveLength(1);
  });

  it('never writes into entries or garden_meta', async () => {
    const payload = buildBouquet([entry()]);
    await keepBouquet(payload, 'file');

    const db = getDb();
    expect(await db.entries.count()).toBe(0);
    expect(await db.garden_meta.count()).toBe(0);
  });

  it('getKeptBouquet returns the row by id, or null when absent', async () => {
    const payload = buildBouquet([entry()]);
    await keepBouquet(payload, 'link');

    expect((await getKeptBouquet(payload.id))?.id).toBe(payload.id);
    expect(await getKeptBouquet('missing')).toBeNull();
  });
});
