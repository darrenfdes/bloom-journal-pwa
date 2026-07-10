/**
 * Per-device ambient-sound preference for the 3D meadow. localStorage like the release-notes
 * seen flag (`lib/release-notes/seen.ts`) — device-scoped, no schema, degrades gracefully when
 * storage is unavailable. Default is ON; only an explicit "off" mutes.
 */
const KEY = 'bloom.explore.ambience';

export function getAmbienceEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setAmbienceEnabled(on: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    // Storage may be unavailable (private mode / disabled) — degrade gracefully.
  }
}
