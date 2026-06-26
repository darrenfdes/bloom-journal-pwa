/**
 * Per-device record of the newest release version whose notes the user has seen. Stored in
 * localStorage (like the welcome flag in lib/onboarding/welcome.ts) — it's device-scoped, needs no
 * schema, and degrades gracefully when storage is unavailable (private mode / disabled).
 */
const LAST_SEEN_KEY = 'bloom.releaseNotes.lastSeenVersion';

export function getLastSeenReleaseVersion(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LAST_SEEN_KEY);
  } catch {
    return null;
  }
}

export function setLastSeenReleaseVersion(version: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LAST_SEEN_KEY, version);
  } catch {
    // Storage may be unavailable (private mode / disabled) — degrade gracefully.
  }
}
