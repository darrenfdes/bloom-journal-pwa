# Bloom Web — Supabase Sync Design

This document is the contract for enabling cloud sync on the Next.js web app. **Nothing here is implemented in v1** — the app is local-first via Dexie (IndexedDB). Supabase client stubs exist but are inactive without env vars.

## Goals

- Same account can back up and restore a garden across devices (web first, mobile later).
- Local writes stay instant; sync is asynchronous and non-blocking.
- Conflicts are rare and resolved predictably (LWW on `updated_at`).

## Auth

- **Provider:** Supabase Auth.
- **v1 method:** Email magic link (passwordless).
- **Later:** OAuth (Google, Apple).
- Session cookies managed via `@supabase/ssr` and `middleware.ts` `updateSession` (not active in v1).

## Postgres schema

Tables mirror Dexie / mobile SQLite shape. All user-owned rows include `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.

### `public.entries`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `text` PK | UUID from client |
| `user_id` | `uuid` | RLS scope |
| `title` | `text` | nullable |
| `content` | `text` | required |
| `mood` | `text` | nullable enum string |
| `inferred_sentiment` | `text` | nullable |
| `tags` | `jsonb` | string array |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | LWW key |
| `flower_seed` | `integer` | |
| `flower_style` | `text` | JSON string |
| `garden_position` | `jsonb` | nullable |
| `is_favourited` | `boolean` | default false |
| `revisit_of` | `text` | nullable FK to entries.id |
| `is_deleted` | `boolean` | soft delete |

### `public.garden_meta`

| Column | Type |
|--------|------|
| `user_id` | `uuid` PK |
| `theme` | `text` |
| `layout_mode` | `text` |
| `last_entry_at` | `timestamptz` |
| `has_planted_first` | `boolean` |
| `unlocked_seasons` | `jsonb` |
| `created_at` | `timestamptz` |

### `public.app_settings`

| Column | Type |
|--------|------|
| `user_id` | `uuid` PK |
| `biometric_lock` | `boolean` |
| `pin_enabled` | `boolean` |
| `reminder_enabled` | `boolean` |
| `reminder_hour` | `integer` |
| `reminder_minute` | `integer` |

PIN hash stays **client-only** on web (Web Crypto in IndexedDB); do not store raw PIN in Postgres.

## Row Level Security

Every table:

```sql
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own entries"
  ON public.entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

Repeat for `garden_meta` and `app_settings`. Service role is for migrations/admin scripts only.

## Sync model (v1): Last-Write-Wins

1. **Local mutation** — Write to Dexie immediately; enqueue push with debounce (~2s).
2. **Push** — Upsert row to Supabase with client `updated_at`.
3. **Pull on sign-in / focus** — `SELECT * WHERE user_id = $uid AND updated_at > $localMax`.
4. **Merge into Dexie** — For each remote row, if `remote.updated_at >= local.updated_at`, overwrite local.
5. **Conflict** — Server timestamp wins; optional toast: "Updated from cloud".
6. **Soft delete** — `is_deleted = true` propagates; garden UI filters deleted rows.

No realtime in v1; refresh on `visibilitychange` / manual pull.

## First migration (anonymous → signed in)

When a local-only user (`userId: 'local'`) signs in:

1. Show dialog: **"Upload this device's garden to your account?"**
2. **Yes** — Bulk insert all Dexie rows with `user_id = auth.uid()`, then pull server state.
3. **No** — Clear local Dexie (or keep read-only export JSON first).

Mobile will use the same flow when sync ships.

## Dexie migration notes

When sync ships, add Dexie v2 columns if needed:

- `syncedAt: string | null` on entries
- `pendingPush: boolean` on entries

Use `db.version(2).stores(...).upgrade(...)` for additive migrations.

## Storage (future)

No attachments in v1. When images are added:

- Bucket: `entry_attachments`
- Path: `{user_id}/{entry_id}/{filename}`
- RLS via storage policies on `auth.uid()`

## Activation checklist (next PR)

- [ ] Fill `.env.local` from `.env.local.example`
- [ ] Run Supabase migrations for tables + RLS
- [ ] Implement `middleware.ts` `updateSession`
- [ ] Auth UI (magic link)
- [ ] Sync engine module `lib/sync/`
- [ ] First-migration dialog
- [ ] E2E: write offline → sign in → pull → see entry on second device
