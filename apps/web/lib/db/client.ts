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

/**
 * A bouquet a recipient chose to keep. Synced per-user at the encryption boundary (like entries) so
 * the shelf travels across devices; never becomes a journal entry. `userId`/`pendingPush`/`syncedAt`
 * mirror the entries sync metadata.
 */
export interface KeptBouquetRow {
  id: string;
  payload: BouquetPayload;
  receivedAt: string;
  source: 'link' | 'file';
  userId: string;
  syncedAt?: string | null;
  pendingPush?: boolean;
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
    this.version(5)
      .stores({
        entries: 'id, userId, createdAt, updatedAt, isDeleted, pendingPush',
        garden_meta: 'id, userId',
        app_settings: 'id',
        drafts: 'id, updatedAt',
        bouquets: 'id, userId, receivedAt, pendingPush',
      })
      .upgrade((tx) =>
        // Existing keepsakes predate sync: tag them local-only so reparenting picks them up on
        // sign-in, exactly like local entries.
        tx
          .table('bouquets')
          .toCollection()
          .modify((bouquet) => {
            if (bouquet.userId === undefined) bouquet.userId = 'local';
            if (bouquet.pendingPush === undefined) bouquet.pendingPush = false;
            if (bouquet.syncedAt === undefined) bouquet.syncedAt = null;
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
