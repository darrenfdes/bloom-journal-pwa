import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { listEntries } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';

export async function exportBackup(): Promise<string | null> {
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
      biometricLock: settings.biometricLock,
      reminderEnabled: settings.reminderEnabled,
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
    },
    entries,
  };

  const fileName = `bloom-journal-backup-${Date.now()}.json`;
  const path = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(path, JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: 'application/json',
      dialogTitle: 'Export Bloom Journal',
    });
  }

  return path;
}
