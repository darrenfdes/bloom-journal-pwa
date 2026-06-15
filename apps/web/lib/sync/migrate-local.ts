import { entryToRemote, gardenMetaToRemote, appSettingsToRemote } from '@bloom/core';

import { getDek } from '@/lib/crypto/key-session';
import { encryptRemoteRow } from '@/lib/crypto/remote-row-cipher';
import { getDb } from '@/lib/db/client';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { pullForUser } from './engine';

export async function hasLocalOnlyData(): Promise<boolean> {
  const db = getDb();
  const localEntry = await db.entries.filter((e) => e.userId === 'local').first();
  return Boolean(localEntry);
}

export async function uploadLocalGarden(userId: string): Promise<void> {
  const client = getSupabaseBrowserClient();
  if (!client) throw new Error('Supabase is not configured');

  const db = getDb();
  const entries = await db.entries.toArray();
  const now = new Date().toISOString();

  for (const entry of entries) {
    const updated = { ...entry, userId, pendingPush: false, syncedAt: now };
    await db.entries.put(updated);
  }

  const meta = await getOrCreateGardenMeta();
  await db.garden_meta.put({ ...meta, userId });

  if (entries.length > 0) {
    const dek = await getDek();
    const payload = await Promise.all(
      entries.map((e) => encryptRemoteRow(entryToRemote({ ...e, userId }, userId), dek)),
    );
    const { error } = await client.from('entries').upsert(payload);
    if (error) throw error;
  }

  const metaRow = gardenMetaToRemote({ ...meta, userId }, userId);
  await client.from('garden_meta').upsert(metaRow);

  const settings = await getOrCreateSettings();
  await client
    .from('app_settings')
    .upsert(appSettingsToRemote(settings, userId, now));

  await pullForUser(userId);
}
