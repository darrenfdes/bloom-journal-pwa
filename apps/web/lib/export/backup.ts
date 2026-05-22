import { listEntries } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';

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
