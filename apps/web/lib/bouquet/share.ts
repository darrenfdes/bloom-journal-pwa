import type { BouquetPayload } from '@bloom/core';

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { openBouquet, sealBouquet } from './crypto';

export interface BouquetLink {
  /** Shareable URL with the decryption key in the fragment (`#k=...`). */
  url: string;
  /** Supabase row id (also the `[id]` path segment). */
  id: string;
}

/**
 * Encrypt a bouquet and store the ciphertext in Supabase, returning a shareable link. The key rides
 * in the URL fragment (`#k=`), which the browser never sends to the server — so the row holds only
 * ciphertext. Requires sign-in (insert is gated by RLS to authenticated users).
 */
export async function shareBouquetLink(payload: BouquetPayload): Promise<BouquetLink> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Sign in to share a bouquet link.');

  const { ciphertext, keyB64 } = await sealBouquet(payload);

  const { data, error } = await client
    .from('bouquets')
    .insert({ ciphertext, enc_version: 1 })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error('Could not create a share link. Make sure you are signed in.');
  }

  const id = (data as { id: string }).id;
  const url = `${window.location.origin}/bouquet/${id}#k=${keyB64}`;
  return { url, id };
}

/**
 * Recipient side: fetch a shared bouquet's ciphertext by id (anon-readable — useless without the
 * key) and decrypt it with the fragment key. Throws friendly errors the viewer turns into empty
 * states.
 */
export async function openSharedBouquet(id: string, keyB64: string): Promise<BouquetPayload> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('This bouquet link can’t be opened here.');

  const { data, error } = await client
    .from('bouquets')
    .select('ciphertext')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error('Something went wrong opening this bouquet.');
  if (!data) throw new Error('This bouquet could not be found — the link may be broken.');

  return openBouquet((data as { ciphertext: string }).ciphertext, keyB64);
}

/**
 * Read the decryption key from a URL fragment (`#k=<base64>`). Parsed manually rather than with
 * `URLSearchParams`, which would turn the `+` in standard base64 into a space and corrupt the key.
 */
export function parseFragmentKey(hash: string): string | null {
  const body = hash.startsWith('#') ? hash.slice(1) : hash;
  const match = body.match(/(?:^|&)k=([^&]*)/);
  return match && match[1] ? match[1] : null;
}

/** Offer a link via the Web Share API, falling back to clipboard. Returns how it was shared. */
export async function shareOrCopyLink(url: string): Promise<'shared' | 'copied'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: 'A bouquet for you', url });
      return 'shared';
    } catch {
      // User dismissed the share sheet, or it failed — fall through to clipboard.
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}
