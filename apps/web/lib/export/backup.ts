import { getDb, type LocalEntryRecord } from '@/lib/db/client';
import { listEntries } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings, updateSettings } from '@/lib/db/repositories/settings';
import { getActiveSyncUser, syncNow } from '@/lib/sync/engine';
import type { EntryRecord, GardenMeta } from '@/lib/types';

export async function exportBackup(): Promise<void> {
  const [entries, garden, settings] = await Promise.all([
    listEntries(true),
    getOrCreateGardenMeta(),
    getOrCreateSettings(),
  ]);

  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    garden,
    settings: {
      reminderEnabled: settings.reminderEnabled,
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
    },
    entries,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bloom-journal-backup-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

type BackupPayload = {
  version: number;
  exportedAt?: string;
  garden?: Partial<GardenMeta>;
  settings?: { reminderEnabled?: boolean; reminderHour?: number; reminderMinute?: number };
  entries?: EntryRecord[];
};

/**
 * Restore a JSON backup produced by {@link exportBackup}. Imported entries are re-owned by the
 * current user (or `'local'` when signed out) and queued for push, then synced if signed in.
 */
export async function importBackup(file: File): Promise<{ imported: number }> {
  let payload: BackupPayload;
  try {
    payload = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t valid JSON.');
  }

  if (!payload || payload.version !== 1 || !Array.isArray(payload.entries)) {
    throw new Error('Unrecognised backup file — expected a Bloom Journal export.');
  }

  const db = getDb();
  const userId = getActiveSyncUser() ?? 'local';

  const rows: LocalEntryRecord[] = payload.entries.map((entry) => ({
    ...entry,
    userId,
    pendingPush: true,
    syncedAt: null,
  }));

  await db.entries.bulkPut(rows);

  if (payload.settings) {
    await updateSettings({
      reminderEnabled: payload.settings.reminderEnabled,
      reminderHour: payload.settings.reminderHour,
      reminderMinute: payload.settings.reminderMinute,
    });
  }

  const meta = await getOrCreateGardenMeta();
  const g = payload.garden;
  await db.garden_meta.update(meta.id, {
    theme: g?.theme ?? meta.theme,
    layoutMode: g?.layoutMode ?? meta.layoutMode,
    unlockedSeasons: g?.unlockedSeasons ?? meta.unlockedSeasons,
    lastEntryAt: g?.lastEntryAt ?? meta.lastEntryAt,
    hasPlantedFirst:
      Boolean(g?.hasPlantedFirst) || meta.hasPlantedFirst || rows.some((r) => !r.isDeleted),
  });

  if (userId !== 'local') {
    await syncNow(userId);
  }

  return { imported: rows.length };
}
