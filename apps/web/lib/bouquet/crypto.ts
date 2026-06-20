import { parseBouquet, serializeBouquet, type BouquetPayload } from '@bloom/core';

import { base64ToBytes, bytesToBase64 } from '@/lib/crypto/base64';

const IV_BYTES = 12;

export interface SealedBouquet {
  /** base64( iv(12) || ciphertext+tag ) — what gets stored server-side. */
  ciphertext: string;
  /** base64 raw AES key — travels only in the URL fragment, never to the server. */
  keyB64: string;
}

/**
 * Encrypt a bouquet under a freshly generated random AES-GCM key. The key is independent of the
 * user's DEK — the recipient has no key relationship with the sender, so the key is carried in the
 * share URL's fragment. Returns the ciphertext (server-stored) and the base64 key (fragment-only).
 */
export async function sealBouquet(payload: BouquetPayload): Promise<SealedBouquet> {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(serializeBouquet(payload));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext));

  const framed = new Uint8Array(IV_BYTES + ct.length);
  framed.set(iv, 0);
  framed.set(ct, IV_BYTES);

  const rawKey = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  return { ciphertext: bytesToBase64(framed), keyB64: bytesToBase64(rawKey) };
}

/** Reverse of {@link sealBouquet}. Throws on a wrong key (auth-tag failure) or malformed payload. */
export async function openBouquet(ciphertext: string, keyB64: string): Promise<BouquetPayload> {
  const key = await crypto.subtle.importKey(
    'raw',
    base64ToBytes(keyB64),
    { name: 'AES-GCM' },
    false,
    ['decrypt'],
  );
  const framed = base64ToBytes(ciphertext);
  const iv = framed.slice(0, IV_BYTES);
  const ct = framed.slice(IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return parseBouquet(new TextDecoder().decode(plaintext));
}
