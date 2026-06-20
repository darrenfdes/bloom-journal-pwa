import { describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { openBouquet, sealBouquet } from './crypto';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'e1',
    userId: 'local',
    title: 'A title',
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

describe('sealBouquet / openBouquet', () => {
  it('round-trips a bouquet through seal and open', async () => {
    const payload = buildBouquet([entry()], { from: 'Mara', note: 'thinking of you' });
    const { ciphertext, keyB64 } = await sealBouquet(payload);
    const restored = await openBouquet(ciphertext, keyB64);
    expect(restored).toEqual(payload);
  });

  it('fails to open with the wrong key', async () => {
    const payload = buildBouquet([entry()]);
    const { ciphertext } = await sealBouquet(payload);
    const { keyB64: wrongKey } = await sealBouquet(payload);
    await expect(openBouquet(ciphertext, wrongKey)).rejects.toThrow();
  });

  it('uses a fresh random key and IV for every seal', async () => {
    const payload = buildBouquet([entry()]);
    const a = await sealBouquet(payload);
    const b = await sealBouquet(payload);
    expect(a.keyB64).not.toBe(b.keyB64);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });
});
