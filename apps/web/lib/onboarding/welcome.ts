/**
 * Per-device flag tracking whether the new-user welcome flow has been shown. Stored in localStorage
 * (not Dexie/Supabase) because the primary audience is an unauthenticated first-time visitor — a
 * device-scoped flag is the right granularity and needs no schema.
 */
const WELCOME_SEEN_KEY = 'bloom.hasSeenWelcome';

export function hasSeenWelcome(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markWelcomeSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    // Storage may be unavailable (private mode / disabled) — degrade gracefully.
  }
}
