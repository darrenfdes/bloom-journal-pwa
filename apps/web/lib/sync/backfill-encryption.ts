import { entryToRemote, remoteToEntry, type RemoteEntryRow } from '@bloom/core';

import { getDek } from '@/lib/crypto/key-session';
import { encryptRemoteRow } from '@/lib/crypto/remote-row-cipher';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const BATCH = 50;

/**
 * One-time re-encryption of any legacy plaintext rows (enc_version 0) already in Supabase.
 * Idempotent: filtered on enc_version 0, so already-encrypted rows are skipped and it is safe to
 * re-run. Round-trips through the mappers so JSON shapes match the normal push path exactly.
 */
export async function backfillEncryption(userId: string): Promise<{ migrated: number }> {
  const client = getSupabaseBrowserClient();
  if (!client) return { migrated: 0 };

  const { data: legacy, error } = await client
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .eq('enc_version', 0);
  if (error) throw error;
  if (!legacy || legacy.length === 0) return { migrated: 0 };

  const dek = await getDek();
  let migrated = 0;
  for (let i = 0; i < legacy.length; i += BATCH) {
    const slice = legacy.slice(i, i + BATCH) as RemoteEntryRow[];
    const payload = await Promise.all(
      slice.map((row) => encryptRemoteRow(entryToRemote(remoteToEntry(row), userId), dek)),
    );
    const { error: upErr } = await client.from('entries').upsert(payload);
    if (upErr) throw upErr;
    migrated += slice.length;
  }
  return { migrated };
}
