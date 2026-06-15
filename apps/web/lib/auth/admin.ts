import type { User } from '@supabase/supabase-js';

/**
 * Whether admin-only surfaces (the `/preview*` playgrounds) should be unlocked for this user.
 *
 * Always unlocked in development. In production it requires a Supabase user whose server-controlled
 * `app_metadata.role` is `'admin'` (set via the Supabase dashboard / admin API — see apps/web/AGENTS.md).
 *
 * Pure (no React) so it can run in middleware and on the client alike.
 */
export function isAdminUser(user: User | null): boolean {
  if (process.env.NODE_ENV === 'development') return true;
  return user?.app_metadata?.role === 'admin';
}
