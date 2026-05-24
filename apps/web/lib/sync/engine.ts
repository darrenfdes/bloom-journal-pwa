import {
  appSettingsToRemote,
  entryToRemote,
  gardenMetaToRemote,
  remoteToEntry,
  remoteToGardenMeta,
  remoteToSyncableAppSettings,
  shouldApplyRemote,
  type RemoteEntryRow,
} from '@bloom/core';

import { getDb, type LocalEntryRecord } from '@/lib/db/client';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { setSyncStatus } from './status';

const PUSH_DEBOUNCE_MS = 2000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let activeUserId: string | null = null;

function supabase() {
  return getSupabaseBrowserClient();
}

async function countPending(): Promise<number> {
  const db = getDb();
  const pending = await db.entries.filter((e) => e.pendingPush === true).count();
  return pending;
}

export async function pullForUser(userId: string): Promise<void> {
  const client = supabase();
  if (!client) return;

  activeUserId = userId;
  setSyncStatus({ syncing: true, offline: !navigator.onLine });

  try {
    const db = getDb();
    const localEntries = await db.entries.toArray();
    const localMax = localEntries.reduce(
      (max, e) => (e.updatedAt > max ? e.updatedAt : max),
      '1970-01-01T00:00:00.000Z'
    );

    const { data: remoteEntries, error: entriesError } = await client
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', localMax);

    if (entriesError) throw entriesError;

    for (const row of (remoteEntries ?? []) as RemoteEntryRow[]) {
      const remote = remoteToEntry(row);
      const local = await db.entries.get(remote.id);
      if (!local || shouldApplyRemote(local.updatedAt, remote.updatedAt)) {
        await db.entries.put({
          ...remote,
          syncedAt: new Date().toISOString(),
          pendingPush: false,
        });
      }
    }

    const { data: remoteMeta } = await client
      .from('garden_meta')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (remoteMeta) {
      const localMeta = await getOrCreateGardenMeta();
      const localStamp = localMeta.lastEntryAt ?? localMeta.createdAt;
      const remoteStamp = remoteMeta.last_entry_at ?? remoteMeta.created_at;
      if (shouldApplyRemote(localStamp, remoteStamp)) {
        await db.garden_meta.put(remoteToGardenMeta(remoteMeta, localMeta.id));
      }
    }

    const { data: remoteSettings } = await client
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (remoteSettings) {
      const local = await getOrCreateSettings();
      const syncable = remoteToSyncableAppSettings(remoteSettings);
      await db.app_settings.put({
        id: 'default',
        biometricLock: local.biometricLock,
        pinEnabled: local.pinEnabled,
        pinHash: local.pinHash,
        ...syncable,
      });
    }

    const pending = await countPending();
    setSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      pendingChanges: pending,
      offline: false,
      syncing: false,
    });
  } catch {
    setSyncStatus({ offline: true, syncing: false });
  }
}

export async function pushPending(userId: string): Promise<void> {
  const client = supabase();
  if (!client || !navigator.onLine) {
    setSyncStatus({ offline: true });
    return;
  }

  activeUserId = userId;
  setSyncStatus({ syncing: true, offline: false });

  try {
    const db = getDb();
    const entriesForPush = await db.entries
      .filter((e) => e.userId === userId && e.pendingPush === true)
      .toArray();

    if (entriesForPush.length > 0) {
      const payload = entriesForPush.map((e) => entryToRemote(stripSyncMeta(e), userId));
      const { error } = await client.from('entries').upsert(payload);
      if (error) throw error;

      const now = new Date().toISOString();
      for (const entry of entriesForPush) {
        await db.entries.update(entry.id, { syncedAt: now, pendingPush: false });
      }
    }

    const meta = await getOrCreateGardenMeta();
    const metaRow = gardenMetaToRemote({ ...meta, userId }, userId);
    await client.from('garden_meta').upsert(metaRow);

    const settings = await getOrCreateSettings();
    const settingsRow = appSettingsToRemote(settings, userId, new Date().toISOString());
    await client.from('app_settings').upsert(settingsRow);

    const pending = await countPending();
    setSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      pendingChanges: pending,
      syncing: false,
      offline: false,
    });
  } catch {
    setSyncStatus({ offline: true, syncing: false });
  }
}

function stripSyncMeta(entry: LocalEntryRecord) {
  const { syncedAt: _s, pendingPush: _p, ...rest } = entry;
  return rest;
}

export function schedulePush(userId?: string) {
  const uid = userId ?? activeUserId;
  if (!uid || !supabase()) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushPending(uid);
  }, PUSH_DEBOUNCE_MS);

  void countPending().then((n) => setSyncStatus({ pendingChanges: n }));
}

export function setActiveSyncUser(userId: string | null) {
  activeUserId = userId;
}

export async function refreshPendingCount() {
  const n = await countPending();
  setSyncStatus({ pendingChanges: n });
}
