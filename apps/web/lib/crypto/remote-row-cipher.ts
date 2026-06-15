import type { RemoteEntryRow } from '@bloom/core';

import { decryptBundle, encryptBundle, ENC_VERSION, type EntryPlainBundle } from './entry-cipher';

/**
 * Move the sensitive fields of a (plaintext) remote row into an encrypted blob, nulling the
 * original columns. The result is what gets upserted to Supabase. Keeps `mappers.ts` pure —
 * this crypto step wraps the mapper output.
 */
export async function encryptRemoteRow(
  row: RemoteEntryRow,
  dek: CryptoKey,
): Promise<RemoteEntryRow> {
  const bundle: EntryPlainBundle = {
    content: row.content ?? '',
    title: row.title,
    tags: row.tags ?? [],
    mood: row.mood,
    inferredSentiment: row.inferred_sentiment,
    weather: row.weather,
  };

  const encBlob = await encryptBundle(bundle, dek);

  return {
    ...row,
    content: null,
    title: null,
    tags: [],
    mood: null,
    inferred_sentiment: null,
    weather: null,
    enc_blob: encBlob,
    enc_version: ENC_VERSION,
  };
}

/**
 * Reverse of {@link encryptRemoteRow}. Encrypted rows (enc_version 1) are decrypted back into the
 * plaintext columns so the pure `remoteToEntry` mapper works unchanged. Legacy plaintext rows
 * (no enc_version) are returned untouched, which is how old data stays readable during transition.
 */
export async function decryptRemoteRow(
  row: RemoteEntryRow,
  dek: CryptoKey | null,
): Promise<RemoteEntryRow> {
  if (row.enc_version === ENC_VERSION && row.enc_blob) {
    if (!dek) throw new Error('Encryption key required to decrypt entry');
    const bundle = await decryptBundle(row.enc_blob, dek);
    return {
      ...row,
      content: bundle.content,
      title: bundle.title,
      tags: bundle.tags,
      mood: bundle.mood,
      inferred_sentiment: bundle.inferredSentiment,
      weather: bundle.weather,
      enc_blob: null,
      enc_version: 0,
    };
  }

  return row;
}
