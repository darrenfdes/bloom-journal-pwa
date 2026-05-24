import * as SQLite from 'expo-sqlite';

let sqliteDb: SQLite.SQLiteDatabase | null = null;

const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'local',
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT,
  inferred_sentiment TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  flower_seed INTEGER NOT NULL,
  flower_style TEXT NOT NULL,
  garden_position TEXT,
  is_favourited INTEGER NOT NULL DEFAULT 0,
  revisit_of TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS garden_meta (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'local',
  theme TEXT NOT NULL DEFAULT 'watercolor',
  layout_mode TEXT NOT NULL DEFAULT 'organic',
  last_entry_at TEXT,
  has_planted_first INTEGER NOT NULL DEFAULT 0,
  unlocked_seasons TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'default',
  biometric_lock INTEGER NOT NULL DEFAULT 0,
  pin_enabled INTEGER NOT NULL DEFAULT 0,
  pin_hash TEXT,
  reminder_enabled INTEGER NOT NULL DEFAULT 0,
  reminder_hour INTEGER NOT NULL DEFAULT 20,
  reminder_minute INTEGER NOT NULL DEFAULT 0,
  write_draft TEXT
);

CREATE TABLE IF NOT EXISTS drafts (
  id TEXT PRIMARY KEY NOT NULL DEFAULT 'current',
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

async function migrateEntriesV2(db: SQLite.SQLiteDatabase) {
  const cols = await db.getAllAsync<{ name: string }>('PRAGMA table_info(entries)');
  const names = new Set(cols.map((c) => c.name));
  if (!names.has('weather')) {
    await db.execAsync('ALTER TABLE entries ADD COLUMN weather TEXT');
  }
  if (!names.has('time_phase')) {
    await db.execAsync('ALTER TABLE entries ADD COLUMN time_phase TEXT');
  }
  if (!names.has('scene_season')) {
    await db.execAsync('ALTER TABLE entries ADD COLUMN scene_season TEXT');
  }
}

export async function initDatabase() {
  if (sqliteDb) return sqliteDb;

  const sqlite = await SQLite.openDatabaseAsync('bloom.db');
  await sqlite.execAsync(MIGRATION_SQL);
  await migrateEntriesV2(sqlite);
  sqliteDb = sqlite;
  return sqliteDb;
}

/** Use async expo-sqlite APIs — required for reliable web support (avoids sync JSON worker bugs). */
export function getSqlite() {
  if (!sqliteDb) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return sqliteDb;
}
