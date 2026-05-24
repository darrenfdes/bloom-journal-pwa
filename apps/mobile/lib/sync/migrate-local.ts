import { appSettingsToRemote, entryToRemote, gardenMetaToRemote } from '@bloom/core';

import { getSqlite } from '@/lib/db/client';
import { listEntries } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseClient } from '@/lib/supabase/client';

import { pullForUser } from './engine';

export async function hasLocalOnlyData(): Promise<boolean> {
  const db = getSqlite();
  const row = await db.getFirstAsync<{ id: string }>(
    "SELECT id FROM entries WHERE user_id = 'local' LIMIT 1"
  );
  return Boolean(row);
}

export async function uploadLocalGarden(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error('Supabase is not configured');

  const db = getSqlite();
  const entries = await listEntries(true);
  const now = new Date().toISOString();

  for (const entry of entries) {
    await db.runAsync('UPDATE entries SET user_id = ?, pending_push = 0, synced_at = ? WHERE id = ?', userId, now, entry.id);
  }

  const meta = await getOrCreateGardenMeta();
  await db.runAsync('UPDATE garden_meta SET user_id = ? WHERE id = ?', userId, meta.id);

  const payload = entries.map((e) => entryToRemote({ ...e, userId }, userId));
  if (payload.length > 0) {
    const { error } = await client.from('entries').upsert(payload);
    if (error) throw error;
  }

  await client.from('garden_meta').upsert(gardenMetaToRemote({ ...meta, userId }, userId));

  const settings = await getOrCreateSettings();
  await client.from('app_settings').upsert(appSettingsToRemote(settings, userId, now));

  await pullForUser(userId);
}
