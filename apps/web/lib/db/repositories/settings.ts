import { getDb } from '@/lib/db/client';
import { afterLocalMutation } from '@/lib/sync/hooks';
import type { AppSettings, WriteDraft } from '@/lib/types';

const EMPTY_DRAFT: WriteDraft = {
  title: '',
  content: '',
  mood: null,
  tags: [],
  createdAtOverride: null,
  revisitOf: null,
};

const DEFAULT_SETTINGS: AppSettings = {
  biometricLock: false,
  pinEnabled: false,
  reminderEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  birthday: null,
  useBirthdayForStars: false,
};

export async function getOrCreateSettings(): Promise<AppSettings> {
  const db = getDb();
  const row = await db.app_settings.get('default');
  if (row) {
    const { id, ...settings } = row;
    return settings;
  }

  await db.app_settings.add({
    id: 'default',
    ...DEFAULT_SETTINGS,
  });

  return { ...DEFAULT_SETTINGS };
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getOrCreateSettings();
  const db = getDb();

  await db.app_settings.put({
    id: 'default',
    biometricLock: patch.biometricLock ?? current.biometricLock,
    pinEnabled: patch.pinEnabled ?? current.pinEnabled,
    reminderEnabled: patch.reminderEnabled ?? current.reminderEnabled,
    reminderHour: patch.reminderHour ?? current.reminderHour,
    reminderMinute: patch.reminderMinute ?? current.reminderMinute,
    birthday: patch.birthday !== undefined ? patch.birthday : current.birthday,
    useBirthdayForStars: patch.useBirthdayForStars ?? current.useBirthdayForStars,
  });

  const syncable =
    patch.reminderEnabled !== undefined ||
    patch.reminderHour !== undefined ||
    patch.reminderMinute !== undefined;
  if (syncable) void afterLocalMutation();
}

export async function saveWriteDraft(draft: WriteDraft): Promise<void> {
  const db = getDb();
  const updatedAt = new Date().toISOString();
  const existing = await db.drafts.get('current');

  if (existing) {
    await db.drafts.update('current', { payload: draft, updatedAt });
  } else {
    await db.drafts.add({ id: 'current', payload: draft, updatedAt });
  }
}

export async function loadWriteDraft(): Promise<WriteDraft> {
  const db = getDb();
  const row = await db.drafts.get('current');
  if (!row) return { ...EMPTY_DRAFT };
  return { ...EMPTY_DRAFT, ...row.payload };
}

export async function clearWriteDraft(): Promise<void> {
  await getDb().drafts.delete('current');
}
