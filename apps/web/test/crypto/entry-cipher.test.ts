import { describe, expect, it } from 'vitest';

import {
  decryptBundle,
  encryptBundle,
  ENC_VERSION,
  type EntryPlainBundle,
} from '@/lib/crypto/entry-cipher';

function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

const sample: EntryPlainBundle = {
  content: 'A private memory about my day. 🌻',
  title: 'Quiet morning',
  tags: ['calm', 'reflection'],
  mood: 'peaceful',
  additionalMoods: ['grateful'],
  inferredSentiment: 'positive',
  weather: {
    category: 'clear',
    windSpeed: 3,
    cloudCover: 10,
    visibility: 10000,
    precipitation: 0,
    temperature: 18,
    coords: { latitude: 51.5, longitude: -0.12 },
    locationName: 'Home',
  },
};

describe('entry-cipher', () => {
  it('round-trips a bundle (including nested weather/coords)', async () => {
    const key = await makeKey();
    const blob = await encryptBundle(sample, key);
    const out = await decryptBundle(blob, key);
    expect(out).toEqual(sample);
  });

  it('round-trips null/empty fields', async () => {
    const key = await makeKey();
    const minimal: EntryPlainBundle = {
      content: '',
      title: null,
      tags: [],
      mood: null,
      additionalMoods: [],
      inferredSentiment: null,
      weather: null,
    };
    expect(await decryptBundle(await encryptBundle(minimal, key), key)).toEqual(minimal);
  });

  it('produces a different blob each time (random IV)', async () => {
    const key = await makeKey();
    const a = await encryptBundle(sample, key);
    const b = await encryptBundle(sample, key);
    expect(a).not.toEqual(b);
  });

  it('frames with the current version byte', async () => {
    const key = await makeKey();
    const blob = await encryptBundle(sample, key);
    const firstByte = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0))[0];
    expect(firstByte).toBe(ENC_VERSION);
  });

  it('fails to decrypt with the wrong key', async () => {
    const blob = await encryptBundle(sample, await makeKey());
    await expect(decryptBundle(blob, await makeKey())).rejects.toThrow();
  });

  it('fails to decrypt a tampered blob', async () => {
    const key = await makeKey();
    const bytes = Uint8Array.from(atob(await encryptBundle(sample, key)), (c) => c.charCodeAt(0));
    bytes[bytes.length - 1] ^= 0xff; // flip a ciphertext byte
    const tampered = btoa(String.fromCharCode(...bytes));
    await expect(decryptBundle(tampered, key)).rejects.toThrow();
  });

  it('rejects an unknown version byte', async () => {
    const key = await makeKey();
    const bytes = Uint8Array.from(atob(await encryptBundle(sample, key)), (c) => c.charCodeAt(0));
    bytes[0] = 99;
    const bad = btoa(String.fromCharCode(...bytes));
    let message = '';
    try {
      await decryptBundle(bad, key);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/version/i);
  });
});
