import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import { entry } from '../fixtures/entry';

describe('buildMeadowLayout', () => {
  it('excludes deleted entries', () => {
    const layout = buildMeadowLayout([
      entry({ id: 'keep', createdAt: new Date(2026, 0, 1) }),
      entry({ id: 'gone', createdAt: new Date(2026, 0, 2), isDeleted: true }),
    ]);
    expect(layout.entries.map((e) => e.id)).toEqual(['keep']);
  });

  it('sorts entries chronologically left to right', () => {
    const layout = buildMeadowLayout([
      entry({ id: 'later', createdAt: new Date(2026, 2, 1) }),
      entry({ id: 'earlier', createdAt: new Date(2026, 0, 1) }),
    ]);
    expect(layout.entries.map((e) => e.id)).toEqual(['earlier', 'later']);
    expect(layout.entries[0]!.x).toBeLessThan(layout.entries[1]!.x);
  });

  it('creates one month marker per distinct month', () => {
    const layout = buildMeadowLayout([
      entry({ id: 'a', createdAt: new Date(2026, 0, 5) }),
      entry({ id: 'b', createdAt: new Date(2026, 0, 20) }),
      entry({ id: 'c', createdAt: new Date(2026, 2, 1) }),
    ]);
    expect(layout.months).toHaveLength(2);
    expect(layout.months[0]!.m).toBe(0);
    expect(layout.months[1]!.m).toBe(2);
  });

  it('grows world width with month count', () => {
    const oneMonth = buildMeadowLayout([entry({ createdAt: new Date(2026, 0, 1) })]);
    const threeMonths = buildMeadowLayout([
      entry({ id: 'a', createdAt: new Date(2026, 0, 1) }),
      entry({ id: 'b', createdAt: new Date(2026, 1, 1) }),
      entry({ id: 'c', createdAt: new Date(2026, 2, 1) }),
    ]);
    expect(threeMonths.W).toBeGreaterThan(oneMonth.W);
  });

  it('is deterministic for the same entry id', () => {
    const records = [entry({ id: 'stable', title: 'Hello', createdAt: new Date(2026, 4, 10) })];
    const a = buildMeadowLayout(records);
    const b = buildMeadowLayout(records);
    expect(a.entries[0]!.x).toBe(b.entries[0]!.x);
    expect(a.entries[0]!.scale).toBe(b.entries[0]!.scale);
  });

  it('boosts scale for favourited entries', () => {
    const base = buildMeadowLayout([
      entry({ id: 'plain', createdAt: new Date(2026, 0, 1), isFavourited: false }),
    ]);
    const fav = buildMeadowLayout([
      entry({ id: 'plain', createdAt: new Date(2026, 0, 1), isFavourited: true }),
    ]);
    expect(fav.entries[0]!.scale).toBeGreaterThan(base.entries[0]!.scale);
  });
});
