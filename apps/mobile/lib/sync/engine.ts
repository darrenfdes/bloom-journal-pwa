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

import { getSqlite } from '@/lib/db/client';
import { getEntry } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, updateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseClient } from '@/lib/supabase/client';

import { setLastSyncedAt, setPendingCount } from './state';
import { setSyncStatus } from './status';

const PUSH_DEBOUNCE_MS = 2000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let activeUserId: string | null = null;

export function setActiveSyncUser(userId: string | null) {
  activeUserId = userId;
}

export async function refreshPendingCount(): Promise<void> {
  const db = getSqlite();
  const row = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) as n FROM entries WHERE pending_push = 1'
  );
  const count = row?.n ?? 0;
  setPendingCount(count);
  setSyncStatus({ pendingChanges: count });
}

export async function pullForUser(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  activeUserId = userId;
  setSyncStatus({ syncing: true });

  try {
    const db = getSqlite();
    const localRows = await db.getAllAsync<{ updated_at: string }>(
      'SELECT updated_at FROM entries'
    );
    const localMax = localRows.reduce(
      (max, r) => (r.updated_at > max ? r.updated_at : max),
      '1970-01-01T00:00:00.000Z'
    );

    const { data: remoteEntries, error } = await client
      .from('entries')
      .select('*')
      .eq('user_id', userId)
      .gte('updated_at', localMax);

    if (error) throw error;

    for (const row of (remoteEntries ?? []) as RemoteEntryRow[]) {
      const remote = remoteToEntry(row);
      const local = await db.getFirstAsync<{ updated_at: string }>(
        'SELECT updated_at FROM entries WHERE id = ?',
        remote.id
      );
      if (!local || shouldApplyRemote(local.updated_at, remote.updatedAt)) {
        await db.runAsync(
          `INSERT INTO entries (
            id, user_id, title, content, mood, inferred_sentiment, tags,
            created_at, updated_at, flower_seed, flower_style, garden_position,
            is_favourited, revisit_of, is_deleted, weather, time_phase, scene_season,
            synced_at, pending_push
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
          ON CONFLICT(id) DO UPDATE SET
            user_id = excluded.user_id,
            title = excluded.title,
            content = excluded.content,
            mood = excluded.mood,
            inferred_sentiment = excluded.inferred_sentiment,
            tags = excluded.tags,
            updated_at = excluded.updated_at,
            flower_seed = excluded.flower_seed,
            flower_style = excluded.flower_style,
            garden_position = excluded.garden_position,
            is_favourited = excluded.is_favourited,
            revisit_of = excluded.revisit_of,
            is_deleted = excluded.is_deleted,
            weather = excluded.weather,
            time_phase = excluded.time_phase,
            scene_season = excluded.scene_season,
            synced_at = excluded.synced_at,
            pending_push = 0`,
          remote.id,
          remote.userId,
          remote.title,
          remote.content,
          remote.mood,
          remote.inferredSentiment,
          JSON.stringify(remote.tags),
          remote.createdAt,
          remote.updatedAt,
          remote.flowerSeed,
          remote.flowerStyle,
          JSON.stringify(remote.gardenPosition),
          remote.isFavourited ? 1 : 0,
          remote.revisitOf,
          remote.isDeleted ? 1 : 0,
          remote.weather ? JSON.stringify(remote.weather) : null,
          remote.timePhase != null ? remote.timePhase : null,
          remote.sceneSeason != null ? remote.sceneSeason : null,
          new Date().toISOString()
        );
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
        const merged = remoteToGardenMeta(remoteMeta, localMeta.id);
        await db.runAsync(
          `UPDATE garden_meta SET
            user_id = ?, theme = ?, layout_mode = ?, last_entry_at = ?,
            has_planted_first = ?, unlocked_seasons = ?
          WHERE id = ?`,
          merged.userId,
          merged.theme,
          merged.layoutMode,
          merged.lastEntryAt,
          merged.hasPlantedFirst ? 1 : 0,
          JSON.stringify(merged.unlockedSeasons),
          localMeta.id
        );
      }
    }

    const { data: remoteSettings } = await client
      .from('app_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (remoteSettings) {
      const syncable = remoteToSyncableAppSettings(remoteSettings);
      await updateSettings(syncable);
    }

    const syncedAt = new Date().toISOString();
    await setLastSyncedAt(syncedAt);
    await refreshPendingCount();
    setSyncStatus({
      lastSyncedAt: syncedAt,
      syncing: false,
      offline: false,
    });
  } catch {
    setSyncStatus({ offline: true, syncing: false });
  }
}

export async function pushPending(userId: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  activeUserId = userId;
  setSyncStatus({ syncing: true, offline: false });

  try {
    const db = getSqlite();
    const pendingIds = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM entries WHERE user_id = ? AND pending_push = 1',
      userId
    );

    if (pendingIds.length > 0) {
      const payload = [];
      for (const { id } of pendingIds) {
        const entry = await getEntry(id);
        if (entry) payload.push(entryToRemote(entry, userId));
      }

      if (payload.length > 0) {
        const { error } = await client.from('entries').upsert(payload);
        if (error) throw error;
      }

      const now = new Date().toISOString();
      for (const { id } of pendingIds) {
        await db.runAsync(
          'UPDATE entries SET synced_at = ?, pending_push = 0 WHERE id = ?',
          now,
          id
        );
      }
    }

    const meta = await getOrCreateGardenMeta();
    await client.from('garden_meta').upsert(gardenMetaToRemote({ ...meta, userId }, userId));

    const settings = await getOrCreateSettings();
    await client
      .from('app_settings')
      .upsert(appSettingsToRemote(settings, userId, new Date().toISOString()));

    const syncedAt = new Date().toISOString();
    await setLastSyncedAt(syncedAt);
    await refreshPendingCount();
    setSyncStatus({
      lastSyncedAt: syncedAt,
      syncing: false,
      offline: false,
    });
  } catch {
    setSyncStatus({ offline: true, syncing: false });
  }
}

export function schedulePush(userId?: string) {
  const uid = userId ?? activeUserId;
  if (!uid || !getSupabaseClient()) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    void pushPending(uid);
  }, PUSH_DEBOUNCE_MS);
}
