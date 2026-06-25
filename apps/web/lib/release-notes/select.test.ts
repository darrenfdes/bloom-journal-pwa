import { describe, expect, it } from 'vitest';

import type { ReleaseNote } from './notes';
import { compareVersions, selectUnseenNotes } from './select';

const note = (version: string): ReleaseNote => ({
  version,
  date: '2026-01-01',
  title: 'x',
  items: ['x'],
});

describe('compareVersions', () => {
  it('orders by numeric dot segments', () => {
    expect(compareVersions('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareVersions('1.1.0', '1.2.0')).toBeLessThan(0);
    expect(compareVersions('1.2.0', '1.2.0')).toBe(0);
  });

  it('compares segments numerically, not lexically (0.10.0 > 0.9.0)', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBeGreaterThan(0);
  });

  it('tolerates differing segment counts (1.0 == 1.0.0)', () => {
    expect(compareVersions('1.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0.1', '1.0')).toBeGreaterThan(0);
  });
});

describe('selectUnseenNotes', () => {
  // newest-first, as the real RELEASE_NOTES list is maintained
  const notes = [note('0.3.0'), note('0.2.0'), note('0.1.0')];

  it('returns [] when lastSeen is null (seed / first-run case)', () => {
    expect(selectUnseenNotes(notes, null)).toEqual([]);
  });

  it('returns [] when lastSeen is the current version', () => {
    expect(selectUnseenNotes(notes, '0.3.0')).toEqual([]);
  });

  it('returns only entries newer than lastSeen, newest-first', () => {
    expect(selectUnseenNotes(notes, '0.1.0').map((n) => n.version)).toEqual(['0.3.0', '0.2.0']);
  });

  it('returns all entries when lastSeen is older than every entry', () => {
    expect(selectUnseenNotes(notes, '0.0.1').map((n) => n.version)).toEqual([
      '0.3.0',
      '0.2.0',
      '0.1.0',
    ]);
  });

  it('returns [] for an empty notes list', () => {
    expect(selectUnseenNotes([], '0.1.0')).toEqual([]);
  });
});
