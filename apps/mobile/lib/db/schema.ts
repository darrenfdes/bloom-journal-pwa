import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const entries = sqliteTable('entries', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('local'),
  title: text('title'),
  content: text('content').notNull(),
  mood: text('mood'),
  inferredSentiment: text('inferred_sentiment'),
  tags: text('tags').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  flowerSeed: integer('flower_seed').notNull(),
  flowerStyle: text('flower_style').notNull(),
  gardenPosition: text('garden_position'),
  isFavourited: integer('is_favourited', { mode: 'boolean' }).notNull().default(false),
  revisitOf: text('revisit_of'),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
});

export const gardenMeta = sqliteTable('garden_meta', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().default('local'),
  theme: text('theme').notNull().default('watercolor'),
  layoutMode: text('layout_mode').notNull().default('organic'),
  lastEntryAt: text('last_entry_at'),
  hasPlantedFirst: integer('has_planted_first', { mode: 'boolean' }).notNull().default(false),
  unlockedSeasons: text('unlocked_seasons').notNull().default('[]'),
  createdAt: text('created_at').notNull(),
});

export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('default'),
  biometricLock: integer('biometric_lock', { mode: 'boolean' }).notNull().default(false),
  pinEnabled: integer('pin_enabled', { mode: 'boolean' }).notNull().default(false),
  pinHash: text('pin_hash'),
  reminderEnabled: integer('reminder_enabled', { mode: 'boolean' }).notNull().default(false),
  reminderHour: integer('reminder_hour').notNull().default(20),
  reminderMinute: integer('reminder_minute').notNull().default(0),
  writeDraft: text('write_draft'),
});

export const drafts = sqliteTable('drafts', {
  id: text('id').primaryKey().default('current'),
  payload: text('payload').notNull(),
  updatedAt: text('updated_at').notNull(),
});
