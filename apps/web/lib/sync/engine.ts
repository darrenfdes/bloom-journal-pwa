import {
  appSettingsToRemote,
  entryToRemote,
  gardenMetaToRemote,
  remoteToEntry,
  remoteToGardenMeta,
  remoteToSyncableAppSettings,
  shouldApplyRemote,
  type RemoteEntryRow,
  type RemoteKeptBouquetRow,
} from '@bloom/core';
import { toast } from 'sonner';

import { decryptKeptBouquet, encryptKeptBouquet } from '@/lib/crypto/bouquet-keepsake-cipher';
import { ENC_VERSION } from '@/lib/crypto/entry-cipher';
import { getDek } from '@/lib/crypto/key-session';
import { decryptRemoteRow, encryptRemoteRow } from '@/lib/crypto/remote-row-cipher';
import { getDb, type LocalEntryRecord } from '@/lib/db/client';
import { PREVIEW_USER_ID } from '@/lib/db/sentinels';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

import { setSyncStatus } from './status';

const PUSH_DEBOUNCE_MS = 2000;
const ERROR_TOAST_COOLDOWN_MS = 10_000;

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let activeUserId: string | null = null;
let lastErrorToastAt = 0;

function supabase() {
  return getSupabaseBrowserClient();
}

function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Record a sync failure. Being offline is expected (the status badge surfaces it), so it never
 * raises a toast; a genuine failure while online does, throttled to avoid spamming on flaky links.
 */
function reportSyncError(err: unknown) {
  if (isOffline()) {
    setSyncStatus({ offline: true, syncing: false });
    return;
  }

  const message = err instanceof Error ? err.message : 'Unknown sync error';
  setSyncStatus({ offline: false, syncing: false, lastError: message });

  const now = Date.now();
  if (now - lastErrorToastAt > ERROR_TOAST_COOLDOWN_MS) {
    lastErrorToastAt = now;
    toast.error("Couldn't sync to the cloud — we'll retry automatically.");
  }
}

async function countPending(): Promise<number> {
  const db = getDb();
  const entries = await db.entries.filter((e) => e.pendingPush === true).count();
  const bouquets = await db.bouquets.filter((b) => b.pendingPush === true).count();
  return entries + bouquets;
}

export async function pullForUser(userId: string): Promise<void> {
  const client = supabase();
  if (!client) return;

  activeUserId = userId;
  setSyncStatus({ syncing: true, offline: !navigator.onLine });

  try {
    const db = getDb();

    const { data: remoteEntries, error: entriesError } = await client
      .from('entries')
      .select('*')
      .eq('user_id', userId);

    if (entriesError) throw entriesError;

    // Only fetch the key if at least one row is encrypted (legacy-only pulls need none). If the key
    // is briefly unavailable we keep going with dek=null: legacy plaintext rows still sync and
    // encrypted rows simply get skipped below, rather than aborting the whole pull.
    const rows = (remoteEntries ?? []) as RemoteEntryRow[];
    const needsKey = rows.some((r) => r.enc_version === 1 && r.enc_blob);
    let dek: CryptoKey | null = null;
    if (needsKey) {
      try {
        dek = await getDek();
      } catch {
        dek = null;
      }
    }

    let skipped = 0;
    for (const row of rows) {
      try {
        const remote = remoteToEntry(await decryptRemoteRow(row, dek));
        const local = await db.entries.get(remote.id);
        if (!local || shouldApplyRemote(local.updatedAt, remote.updatedAt)) {
          await db.entries.put({
            ...remote,
            syncedAt: new Date().toISOString(),
            pendingPush: false,
          });
        }
      } catch {
        // A single undecryptable/corrupt row must not block the rest of the pull.
        skipped += 1;
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
        const remote = remoteToGardenMeta(remoteMeta, localMeta.id);
        const localEntryCount = await db.entries.filter((e) => !e.isDeleted).count();
        await db.garden_meta.put({
          ...remote,
          hasPlantedFirst:
            remote.hasPlantedFirst || localMeta.hasPlantedFirst || localEntryCount > 0,
        });
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
        ...syncable,
      });
    }

    const { data: remoteBouquets } = await client
      .from('kept_bouquets')
      .select('*')
      .eq('user_id', userId);

    const bouquetRows = (remoteBouquets ?? []) as RemoteKeptBouquetRow[];
    if (bouquetRows.length > 0) {
      // Keepsakes are immutable, so only the key matters here (no conflict resolution). A briefly
      // unavailable key just means encrypted keepsakes are skipped this pull, like entries above.
      let bouquetDek: CryptoKey | null = null;
      try {
        bouquetDek = await getDek();
      } catch {
        bouquetDek = null;
      }
      for (const row of bouquetRows) {
        try {
          if (await db.bouquets.get(row.id)) continue; // insert-only: never overwrite a local keepsake
          if (!bouquetDek) throw new Error('Encryption key required to decrypt kept bouquet');
          const { payload, source } = await decryptKeptBouquet(row.enc_blob, bouquetDek);
          await db.bouquets.put({
            id: row.id,
            payload,
            source,
            receivedAt: row.received_at,
            userId,
            syncedAt: new Date().toISOString(),
            pendingPush: false,
          });
        } catch {
          // A single undecryptable/corrupt keepsake must not block the rest of the pull.
        }
      }
    }

    const pending = await countPending();
    setSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      pendingChanges: pending,
      offline: false,
      syncing: false,
      // Surface a non-fatal note when some rows couldn't be read so the failure isn't silent.
      lastError: skipped > 0 ? `${skipped} entr${skipped === 1 ? 'y' : 'ies'} couldn't be read` : null,
    });
  } catch (err) {
    reportSyncError(err);
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
    // The `userId` equality already excludes the in-memory `/preview` sample flowers, but we guard
    // against the `'preview'` sentinel explicitly so preview data can never be pushed to Supabase.
    const entriesForPush = await db.entries
      .filter(
        (e) => e.userId === userId && e.userId !== PREVIEW_USER_ID && e.pendingPush === true
      )
      .toArray();
    const bouquetsForPush = await db.bouquets
      .filter((b) => b.userId === userId && b.pendingPush === true)
      .toArray();

    // Encrypt sensitive data before it leaves the device. Fetch the key once for whatever needs it;
    // if it's unavailable this throws and the catch below leaves rows pendingPush — never plaintext.
    const needsKey = entriesForPush.length > 0 || bouquetsForPush.length > 0;
    const dek = needsKey ? await getDek() : null;

    if (entriesForPush.length > 0 && dek) {
      const payload = await Promise.all(
        entriesForPush.map((e) => encryptRemoteRow(entryToRemote(stripSyncMeta(e), userId), dek)),
      );
      const { error } = await client.from('entries').upsert(payload);
      if (error) throw error;

      const now = new Date().toISOString();
      for (const entry of entriesForPush) {
        await db.entries.update(entry.id, { syncedAt: now, pendingPush: false });
      }
    }

    if (bouquetsForPush.length > 0 && dek) {
      const rows: RemoteKeptBouquetRow[] = await Promise.all(
        bouquetsForPush.map(async (b) => ({
          id: b.id,
          user_id: userId,
          enc_blob: await encryptKeptBouquet({ payload: b.payload, source: b.source }, dek),
          enc_version: ENC_VERSION,
          received_at: b.receivedAt,
        })),
      );
      const { error } = await client.from('kept_bouquets').upsert(rows);
      if (error) throw error;

      const now = new Date().toISOString();
      for (const b of bouquetsForPush) {
        await db.bouquets.update(b.id, { syncedAt: now, pendingPush: false });
      }
    }

    const meta = await getOrCreateGardenMeta();
    const metaRow = gardenMetaToRemote({ ...meta, userId }, userId);
    const { error: metaError } = await client.from('garden_meta').upsert(metaRow);
    if (metaError) throw metaError;

    const settings = await getOrCreateSettings();
    const settingsRow = appSettingsToRemote(settings, userId, new Date().toISOString());
    const { error: settingsError } = await client.from('app_settings').upsert(settingsRow);
    if (settingsError) throw settingsError;

    const pending = await countPending();
    setSyncStatus({
      lastSyncedAt: new Date().toISOString(),
      pendingChanges: pending,
      syncing: false,
      offline: false,
      lastError: null,
    });
  } catch (err) {
    reportSyncError(err);
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

/** The signed-in user id sync is currently bound to, or null when local-only. */
export function getActiveSyncUser(): string | null {
  return activeUserId;
}

/**
 * Re-tag any entries (and garden meta) still owned by the local-only `'local'` pseudo-user to the
 * signed-in account so they become eligible for push. Returns how many entries were merged.
 */
export async function reparentLocalEntries(userId: string): Promise<number> {
  const db = getDb();
  const locals = await db.entries.filter((e) => e.userId === 'local').toArray();

  for (const entry of locals) {
    // Keep updatedAt untouched so conflict resolution is unaffected — only ownership changes.
    await db.entries.update(entry.id, { userId, pendingPush: true });
  }

  const meta = await db.garden_meta.toCollection().first();
  if (meta && meta.userId === 'local') {
    await db.garden_meta.update(meta.id, { userId });
  }

  // Adopt any local-only keepsakes too, so the shelf merges into the account on sign-in.
  const localBouquets = await db.bouquets.filter((b) => b.userId === 'local').toArray();
  for (const bouquet of localBouquets) {
    await db.bouquets.update(bouquet.id, { userId, pendingPush: true });
  }

  if (locals.length > 0 || localBouquets.length > 0) await refreshPendingCount();
  return locals.length;
}

/**
 * Full reconcile for a freshly-connected user: adopt any local-only data, pull remote changes,
 * then push everything pending. Used on sign-in, on app load while signed in, and on reconnect.
 * Returns the number of local-only entries merged (for first-merge messaging).
 */
export async function syncNow(userId: string): Promise<{ merged: number }> {
  if (!supabase()) return { merged: 0 };

  activeUserId = userId;
  const merged = await reparentLocalEntries(userId);
  await pullForUser(userId);
  await pushPending(userId);
  return { merged };
}

export async function refreshPendingCount() {
  const n = await countPending();
  setSyncStatus({ pendingChanges: n });
}
