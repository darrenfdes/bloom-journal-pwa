# Bloom Web — Supabase Sync Design

Cloud backup for the Next.js web app and Expo mobile app. **Local-first by default** — Dexie (web) and SQLite (mobile) work without sign-in. Sync activates when the user signs in and Supabase env vars are configured.

## Goals

- Same account can back up and restore a garden across devices (web + mobile).
- Local writes stay instant; sync is asynchronous and non-blocking.
- Conflicts are rare and resolved predictably (LWW on `updated_at`).

## Auth

- **Provider:** Supabase Auth.
- **Methods:** Email + password (sign up / sign in) and **Google OAuth**.
- **Session (web):** Cookies via `@supabase/ssr`, refreshed in `middleware.ts` (`updateSession`).
- **Session (mobile):** `expo-secure-store` adapter; OAuth returns via `bloomjournal://auth/callback`.
- **No forced login** — garden and write flows work unsigned; Settings offers sign-in.

## Environment

**Web** — copy `apps/web/.env.local.example` → `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Mobile** — `apps/mobile/.env` or Expo `extra`:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Clients return `null` when env is unset (local-only dev, no errors).

## Postgres schema

Migrations live in `supabase/migrations/`. All user-owned rows use `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE`.

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
| `revisit_of` | `text` | nullable |
| `is_deleted` | `boolean` | soft delete |
| `weather` | `jsonb` | nullable snapshot |
| `time_phase` | `text` | nullable |
| `scene_season` | `text` | nullable |

Index: `(user_id, updated_at DESC)` for pull queries.

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

Syncable reminder prefs only (no PIN / biometric on server):

| Column | Type |
|--------|------|
| `user_id` | `uuid` PK |
| `reminder_enabled` | `boolean` |
| `reminder_hour` | `integer` |
| `reminder_minute` | `integer` |
| `updated_at` | `timestamptz` |

PIN hash stays **client-only** (Web Crypto / SecureStore); never written to Postgres.

## Row Level Security

Every table: `auth.uid() = user_id` for ALL operations (SELECT/INSERT/UPDATE/DELETE).

## Sync model (v1): Last-Write-Wins

Shared logic in `packages/core/src/sync/` (`mappers`, `merge`).

1. **Local mutation** — Write to Dexie/SQLite immediately; mark `pendingPush` (entries); debounced push (~2s).
2. **Push** — Upsert rows to Supabase with client `updated_at`.
3. **Pull on sign-in / focus** — Fetch rows for `user_id`; merge if `remote.updated_at >= local.updated_at`.
4. **Soft delete** — `is_deleted = true` syncs; garden UI filters deleted rows.

No Realtime in v1; pull on `visibilitychange` (web) and `AppState` foreground (mobile).

## First migration (anonymous → signed in)

When local rows use `userId: 'local'` and the user signs in:

1. Dialog: **Upload this device's garden to your account?**
2. **Upload** — Rewrite `userId` to `auth.uid()`, bulk upsert, then pull.
3. **Skip** — Keep local data; cloud stays empty until upload later.

## Dexie (web)

Version 3 adds on entries:

- `syncedAt: string | null`
- `pendingPush: boolean`

## Mobile deep link

Register in Supabase Auth redirect URLs:

- `bloomjournal://auth/callback`

Scheme: `bloomjournal` in `app.json`.

## Activation checklist

- [ ] Fill `apps/web/.env.local` from `.env.local.example`
- [ ] Fill mobile `EXPO_PUBLIC_SUPABASE_*` env
- [ ] Enable Email + Google in Supabase Auth; add redirect URLs (localhost + production `/auth/callback`, mobile deep link)
- [ ] Run `supabase db push` or apply migrations in dashboard
- [ ] Sign in on web → plant entry → verify row in `entries`
- [ ] Second device: sign in → pull on focus → see entry
- [ ] First sign-in with local garden → migration dialog → upload

## Storage (future)

No attachments in v1. When images are added: bucket `entry_attachments`, path `{user_id}/{entry_id}/{filename}`, RLS on `auth.uid()`.
