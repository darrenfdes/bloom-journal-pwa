import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { getDb } from '@/lib/db/client';

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
