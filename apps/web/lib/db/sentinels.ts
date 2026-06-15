/**
 * Reserved `userId` values that never belong to a real Supabase account.
 *
 * - `'local'` (see `entries.ts` / `engine.ts`) — the local-only pseudo-user used while signed out;
 *   reparented to the signed-in account on connect.
 * - `PREVIEW_USER_ID` — sample flowers shown in the `/preview/meadow` playground. They live only in
 *   memory and must never be persisted to Dexie or pushed to Supabase.
 */
export const PREVIEW_USER_ID = 'preview';
