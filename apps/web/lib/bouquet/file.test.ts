import { describe, expect, it } from 'vitest';

import { buildBouquet, serializeBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { readBouquetFile } from './file';

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

describe('readBouquetFile', () => {
  it('parses a .bloom file back into a bouquet', async () => {
    const payload = buildBouquet([entry()], { note: 'hi' });
    const file = new File([serializeBouquet(payload)], 'bloom-bouquet-x.bloom', {
      type: 'application/json',
    });
    expect(await readBouquetFile(file)).toEqual(payload);
  });

  it('rejects a file that is not a Bloom bouquet', async () => {
    const file = new File(['{"nope":true}'], 'not-a-bouquet.bloom');
    const err = await readBouquetFile(file).then(
      () => null,
      (e: unknown) => e as Error,
    );
    expect(err).toBeInstanceOf(Error);
    expect(err?.message).toMatch(/bouquet/i);
  });
});
