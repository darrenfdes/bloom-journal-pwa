import Dexie, { type Table } from 'dexie';

import type { AppSettings, EntryRecord, GardenMeta, WriteDraft } from '@/lib/types';

export interface AppSettingsRow extends AppSettings {
  id: string;
  pinHash: string | null;
}

export interface DraftRow {
  id: string;
  payload: WriteDraft;
  updatedAt: string;
}

export class BloomDatabase extends Dexie {
  entries!: Table<EntryRecord, string>;
  garden_meta!: Table<GardenMeta, string>;
  app_settings!: Table<AppSettingsRow, string>;
  drafts!: Table<DraftRow, string>;

  constructor() {
    super('bloom-web');
    this.version(1).stores({
      entries: 'id, userId, createdAt, updatedAt, isDeleted',
      garden_meta: 'id, userId',
      app_settings: 'id',
      drafts: 'id, updatedAt',
    });
  }
}

let db: BloomDatabase | null = null;

export function getDb(): BloomDatabase {
  if (!db) {
    db = new BloomDatabase();
  }
  return db;
}
