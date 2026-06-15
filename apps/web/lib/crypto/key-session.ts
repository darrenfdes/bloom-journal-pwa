import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { base64ToBytes } from './base64';

/** Thrown when the per-user Data Encryption Key cannot be obtained (offline, auth, edge fn down). */
export class KeyUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KeyUnavailableError';
  }
}

let cachedKey: CryptoKey | null = null;
let inflight: Promise<CryptoKey> | null = null;

async function fetchDek(): Promise<CryptoKey> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new KeyUnavailableError('Supabase is not configured');

  const { data, error } = await client.functions.invoke('get-encryption-key');
  if (error) {
    throw new KeyUnavailableError(`Failed to fetch encryption key: ${error.message}`);
  }

  const dekB64 = (data as { dek?: string } | null)?.dek;
  if (!dekB64) throw new KeyUnavailableError('Encryption key missing from response');

  return crypto.subtle.importKey(
    'raw',
    base64ToBytes(dekB64),
    { name: 'AES-GCM' },
    false, // non-extractable: cannot be read back out of memory
    ['encrypt', 'decrypt'],
  );
}

/**
 * Returns the session's Data Encryption Key, fetching it from the edge function on first use and
 * caching it in memory. Concurrent callers share a single in-flight request. Throws
 * {@link KeyUnavailableError} on failure (callers fail closed — never push plaintext).
 */
export function getDek(): Promise<CryptoKey> {
  if (cachedKey) return Promise.resolve(cachedKey);
  if (inflight) return inflight;

  inflight = fetchDek()
    .then((key) => {
      cachedKey = key;
      return key;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function hasDek(): boolean {
  return cachedKey !== null;
}

/** Drop the cached key — call on sign-out so a different user can't reuse it. */
export function clearDek(): void {
  cachedKey = null;
  inflight = null;
}
