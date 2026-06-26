import type { ReleaseNote } from './notes';

/**
 * Compares two dot-separated version strings numerically. Returns >0 when `a` is newer than `b`,
 * <0 when older, 0 when equal. Tolerant of differing segment counts ('1.0' == '1.0.0').
 */
export function compareVersions(a: string, b: string): number {
  const as = a.split('.').map(Number);
  const bs = b.split('.').map(Number);
  const len = Math.max(as.length, bs.length);
  for (let i = 0; i < len; i++) {
    const diff = (as[i] ?? 0) - (bs[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * Returns the notes a returning user hasn't seen yet — entries strictly newer than `lastSeen`,
 * preserving the input's newest-first order. `null` lastSeen is the first-run/seed case and yields
 * nothing (the caller seeds the flag instead of showing a backlog).
 */
export function selectUnseenNotes(notes: ReleaseNote[], lastSeen: string | null): ReleaseNote[] {
  if (lastSeen === null) return [];
  return notes.filter((note) => compareVersions(note.version, lastSeen) > 0);
}
