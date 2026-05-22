import * as SecureStore from 'expo-secure-store';

import { getSqlite } from '@/lib/db/client';
import { parseJsonObject } from '@/lib/db/json';
import type { AppSettings, WriteDraft } from '@/lib/types';

const EMPTY_DRAFT: WriteDraft = {
  title: '',
  content: '',
  mood: null,
  tags: [],
  createdAtOverride: null,
  revisitOf: null,
};

type SettingsRow = {
  id: string;
  biometric_lock: number;
  pin_enabled: number;
  pin_hash: string | null;
  reminder_enabled: number;
  reminder_hour: number;
  reminder_minute: number;
};

function rowToSettings(row: SettingsRow): AppSettings {
  return {
    biometricLock: Boolean(row.biometric_lock),
    pinEnabled: Boolean(row.pin_enabled),
    reminderEnabled: Boolean(row.reminder_enabled),
    reminderHour: row.reminder_hour,
    reminderMinute: row.reminder_minute,
  };
}

export async function getOrCreateSettings(): Promise<AppSettings & { pinHash: string | null }> {
  const db = getSqlite();
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT * FROM app_settings WHERE id = ?',
    'default'
  );
  if (row) return { ...rowToSettings(row), pinHash: row.pin_hash };

  await db.runAsync('INSERT INTO app_settings (id) VALUES (?)', 'default');
  return {
    biometricLock: false,
    pinEnabled: false,
    reminderEnabled: false,
    reminderHour: 20,
    reminderMinute: 0,
    pinHash: null,
  };
}

export async function updateSettings(
  patch: Partial<AppSettings> & { pinHash?: string | null }
): Promise<void> {
  const current = await getOrCreateSettings();
  const db = getSqlite();
  const biometricLock = patch.biometricLock ?? current.biometricLock;
  const pinEnabled = patch.pinEnabled ?? current.pinEnabled;
  const reminderEnabled = patch.reminderEnabled ?? current.reminderEnabled;

  await db.runAsync(
    `UPDATE app_settings SET
      biometric_lock = ?,
      pin_enabled = ?,
      reminder_enabled = ?,
      reminder_hour = ?,
      reminder_minute = ?,
      pin_hash = ?
    WHERE id = ?`,
    biometricLock ? 1 : 0,
    pinEnabled ? 1 : 0,
    reminderEnabled ? 1 : 0,
    patch.reminderHour ?? current.reminderHour,
    patch.reminderMinute ?? current.reminderMinute,
    patch.pinHash !== undefined ? patch.pinHash : current.pinHash,
    'default'
  );
}

export async function saveWriteDraft(draft: WriteDraft): Promise<void> {
  const db = getSqlite();
  const payload = JSON.stringify(draft);
  const updatedAt = new Date().toISOString();
  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM drafts WHERE id = ?',
    'current'
  );
  if (existing) {
    await db.runAsync(
      'UPDATE drafts SET payload = ?, updated_at = ? WHERE id = ?',
      payload,
      updatedAt,
      'current'
    );
  } else {
    await db.runAsync(
      'INSERT INTO drafts (id, payload, updated_at) VALUES (?, ?, ?)',
      'current',
      payload,
      updatedAt
    );
  }
}

export async function loadWriteDraft(): Promise<WriteDraft> {
  const db = getSqlite();
  const row = await db.getFirstAsync<{ payload: string }>(
    'SELECT payload FROM drafts WHERE id = ?',
    'current'
  );
  if (!row) return { ...EMPTY_DRAFT };
  return { ...EMPTY_DRAFT, ...parseJsonObject<Partial<WriteDraft>>(row.payload, {}) };
}

export async function clearWriteDraft(): Promise<void> {
  const db = getSqlite();
  await db.runAsync('DELETE FROM drafts WHERE id = ?', 'current');
}

export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync('bloom_pin_hash', pin);
  await updateSettings({ pinEnabled: true, pinHash: 'stored' });
}

export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync('bloom_pin_hash');
  return stored === pin;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync('bloom_pin_hash');
  await updateSettings({ pinEnabled: false, pinHash: null });
}
