import { describe, expect, it } from 'vitest';

import { entryToRemote, remoteToEntry } from '@bloom/core';

import { ENC_VERSION } from '@/lib/crypto/entry-cipher';
import { decryptRemoteRow, encryptRemoteRow } from '@/lib/crypto/remote-row-cipher';

import { entry } from '../fixtures/entry';

function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]) as Promise<CryptoKey>;
}

describe('remote-row-cipher', () => {
  it('nulls sensitive columns and sets enc fields, preserving metadata', async () => {
    const key = await makeKey();
    const row = entryToRemote(
      entry({
        content: 'secret',
        title: 'T',
        tags: ['x'],
        mood: 'joyful',
        additionalMoods: ['angry'],
        inferredSentiment: 'positive',
      }),
      'user-1',
    );
    const enc = await encryptRemoteRow(row, key);

    expect(enc.content).toBeNull();
    expect(enc.title).toBeNull();
    expect(enc.mood).toBeNull();
    expect(enc.inferred_sentiment).toBeNull();
    expect(enc.weather).toBeNull();
    expect(enc.tags).toEqual([]);
    expect(enc.additional_moods).toEqual([]);
    expect(enc.enc_version).toBe(ENC_VERSION);
    expect(typeof enc.enc_blob).toBe('string');

    // plaintext metadata passes through untouched
    expect(enc.id).toBe(row.id);
    expect(enc.user_id).toBe('user-1');
    expect(enc.flower_seed).toBe(row.flower_seed);
    expect(enc.created_at).toBe(row.created_at);
    expect(enc.is_deleted).toBe(row.is_deleted);
  });

  it('round-trips encrypt -> decrypt -> remoteToEntry', async () => {
    const key = await makeKey();
    const original = entry({
      content: 'secret',
      title: 'T',
      tags: ['x', 'y'],
      mood: 'joyful',
      additionalMoods: ['jealous', 'cribby'],
      inferredSentiment: 'positive',
    });
    const enc = await encryptRemoteRow(entryToRemote(original, 'user-1'), key);
    const back = remoteToEntry(await decryptRemoteRow(enc, key));
    expect(back).toEqual({ ...original, userId: 'user-1' });
  });

  it('returns legacy plaintext rows unchanged without a key', async () => {
    const row = entryToRemote(entry({ content: 'plain' }), 'user-1'); // no enc_version
    const dec = await decryptRemoteRow(row, null);
    expect(dec).toBe(row);
    expect(remoteToEntry(dec).content).toBe('plain');
  });

  it('throws when decrypting an encrypted row without a key', async () => {
    const key = await makeKey();
    const enc = await encryptRemoteRow(entryToRemote(entry(), 'user-1'), key);
    let message = '';
    try {
      await decryptRemoteRow(enc, null);
    } catch (e) {
      message = (e as Error).message;
    }
    expect(message).toMatch(/key/i);
  });
});
