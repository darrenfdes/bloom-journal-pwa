import Dexie, { type Table } from 'dexie';

import type { BouquetPayload } from '@bloom/core';

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

/** A bouquet a recipient chose to keep. Local-only keepsake — never synced, never a journal entry. */
export interface KeptBouquetRow {
  id: string;
  payload: BouquetPayload;
  receivedAt: string;
  source: 'link' | 'file';
}

export class BloomDatabase extends Dexie {
  entries!: Table<LocalEntryRecord, string>;
  garden_meta!: Table<GardenMeta, string>;
  app_settings!: Table<AppSettingsRow, string>;
  drafts!: Table<DraftRow, string>;
  bouquets!: Table<KeptBouquetRow, string>;

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
    this.version(4).stores({
      entries: 'id, userId, createdAt, updatedAt, isDeleted, pendingPush',
      garden_meta: 'id, userId',
      app_settings: 'id',
      drafts: 'id, updatedAt',
      bouquets: 'id, receivedAt',
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
