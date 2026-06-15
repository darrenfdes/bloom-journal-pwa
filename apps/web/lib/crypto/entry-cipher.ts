import type { EntryWeatherSnapshot } from '@bloom/core/scene/types';

import { base64ToBytes, bytesToBase64 } from './base64';

/** Bumped only when the on-the-wire framing/algorithm changes. */
export const ENC_VERSION = 1;

const IV_BYTES = 12;

/** The sensitive entry fields that get bundled and encrypted before reaching Supabase. */
export interface EntryPlainBundle {
  content: string;
  title: string | null;
  tags: string[];
  mood: string | null;
  inferredSentiment: string | null;
  weather: EntryWeatherSnapshot | null;
}

/** Encrypt the bundle with AES-GCM. Output: base64( version(1) || iv(12) || ciphertext+tag ). */
export async function encryptBundle(bundle: EntryPlainBundle, dek: CryptoKey): Promise<string> {
  const plaintext = new TextEncoder().encode(JSON.stringify(bundle));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dek, plaintext),
  );

  const framed = new Uint8Array(1 + IV_BYTES + ciphertext.length);
  framed[0] = ENC_VERSION;
  framed.set(iv, 1);
  framed.set(ciphertext, 1 + IV_BYTES);
  return bytesToBase64(framed);
}

/** Reverse of {@link encryptBundle}. Throws on unknown version or auth-tag failure. */
export async function decryptBundle(blob: string, dek: CryptoKey): Promise<EntryPlainBundle> {
  const framed = base64ToBytes(blob);
  const version = framed[0];
  if (version !== ENC_VERSION) {
    throw new Error(`Unsupported entry encryption version: ${version}`);
  }

  const iv = framed.slice(1, 1 + IV_BYTES);
  const ciphertext = framed.slice(1 + IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as EntryPlainBundle;
}
