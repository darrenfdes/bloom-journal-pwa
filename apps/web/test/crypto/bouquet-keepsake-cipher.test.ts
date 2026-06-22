import { describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import {
  decryptKeptBouquet,
  encryptKeptBouquet,
  type KeptBouquetBundle,
} from '@/lib/crypto/bouquet-keepsake-cipher';

function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

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

const sample: KeptBouquetBundle = {
  payload: buildBouquet([entry()], { from: 'Mara', to: 'You', note: 'thinking of you 🌷' }),
  source: 'link',
};

describe('bouquet-keepsake-cipher', () => {
  it('round-trips a keepsake bundle (payload + source)', async () => {
    const key = await makeKey();
    const out = await decryptKeptBouquet(await encryptKeptBouquet(sample, key), key);
    expect(out).toEqual(sample);
  });

  it('produces a different blob each time (random IV)', async () => {
    const key = await makeKey();
    const a = await encryptKeptBouquet(sample, key);
    const b = await encryptKeptBouquet(sample, key);
    expect(a).not.toEqual(b);
  });

  it('fails to decrypt with the wrong key', async () => {
    const blob = await encryptKeptBouquet(sample, await makeKey());
    await expect(decryptKeptBouquet(blob, await makeKey())).rejects.toThrow();
  });

  it('rejects an unknown version byte', async () => {
    const key = await makeKey();
    const bytes = Uint8Array.from(atob(await encryptKeptBouquet(sample, key)), (c) =>
      c.charCodeAt(0),
    );
    bytes[0] = 99;
    const bad = btoa(String.fromCharCode(...bytes));
    let message = '';
    try {
      await decryptKeptBouquet(bad, key);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/version/i);
  });
});
