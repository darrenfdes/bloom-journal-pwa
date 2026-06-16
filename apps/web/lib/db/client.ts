import Dexie, { type Table } from 'dexie';

import type { AppSettings, EntryRecord, GardenMeta, WriteDraft } from '@/lib/types';

/** Local Dexie entry row with sync metadata (not stored in Postgres). */
export type LocalEntryRecord = EntryRecord & {
  syncedAt?: string | null;
  pendingPush?: boolean;
};

export interface AppSettingsRow extends AppSettings {
  id: string;
}

export interface DraftRow {
  id: string;
  payload: WriteDraft;
  updatedAt: string;
}

export class BloomDatabase extends Dexie {
  entries!: Table<LocalEntryRecord, string>;
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
    this.version(2).stores({
      entries: 'id, userId, createdAt, updatedAt, isDeleted',
      garden_meta: 'id, userId',
      app_settings: 'id',
      drafts: 'id, updatedAt',
    });
    this.version(3)
      .stores({
        entries: 'id, userId, createdAt, updatedAt, isDeleted, pendingPush',
        garden_meta: 'id, userId',
        app_settings: 'id',
        drafts: 'id, updatedAt',
      })
      .upgrade((tx) =>
        tx
          .table('entries')
          .toCollection()
          .modify((entry) => {
            if (entry.pendingPush === undefined) entry.pendingPush = false;
            if (entry.syncedAt === undefined) entry.syncedAt = null;
          })
      );
  }
}

let db: BloomDatabase | null = null;

export function getDb(): BloomDatabase {
  if (!db) {
    db = new BloomDatabase();
  }
  return db;
}
