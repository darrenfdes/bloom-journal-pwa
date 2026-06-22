import type { BouquetPayload } from '@bloom/core';

import { base64ToBytes, bytesToBase64 } from './base64';
import { ENC_VERSION } from './entry-cipher';

const IV_BYTES = 12;

/**
 * The keepsake fields that get encrypted before a kept bouquet leaves the device. The whole bouquet
 * payload is sensitive (sender note, recipient name, flower content), so it is bundled wholesale
 * alongside how it arrived.
 */
export interface KeptBouquetBundle {
  payload: BouquetPayload;
  source: 'link' | 'file';
}

/** Encrypt the keepsake bundle with AES-GCM. Output: base64( version(1) || iv(12) || ciphertext+tag ). */
export async function encryptKeptBouquet(
  bundle: KeptBouquetBundle,
  dek: CryptoKey,
): Promise<string> {
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

/** Reverse of {@link encryptKeptBouquet}. Throws on unknown version or auth-tag failure. */
export async function decryptKeptBouquet(blob: string, dek: CryptoKey): Promise<KeptBouquetBundle> {
  const framed = base64ToBytes(blob);
  const version = framed[0];
  if (version !== ENC_VERSION) {
    throw new Error(`Unsupported kept-bouquet encryption version: ${version}`);
  }

  const iv = framed.slice(1, 1 + IV_BYTES);
  const ciphertext = framed.slice(1 + IV_BYTES);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, dek, ciphertext);
  return JSON.parse(new TextDecoder().decode(plaintext)) as KeptBouquetBundle;
}
