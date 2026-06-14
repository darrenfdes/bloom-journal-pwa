import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { agoLabel, isAnniv, phaseFromHour } from '@/lib/garden/bloom/phases';

describe('phaseFromHour', () => {
  it('maps hour boundaries to meadow phases', () => {
    expect(phaseFromHour(4)).toBe('night');
    expect(phaseFromHour(5)).toBe('dawn');
    expect(phaseFromHour(6)).toBe('dawn');
    expect(phaseFromHour(7)).toBe('day');
    expect(phaseFromHour(15)).toBe('day');
    expect(phaseFromHour(16)).toBe('golden');
    expect(phaseFromHour(17)).toBe('golden');
    expect(phaseFromHour(18)).toBe('dusk');
    expect(phaseFromHour(19)).toBe('dusk');
    expect(phaseFromHour(20)).toBe('night');
    expect(phaseFromHour(23)).toBe('night');
  });
});

describe('agoLabel', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns anniversary copy for same calendar day in a prior year', () => {
    const d = new Date(2025, 4, 30, 8, 0, 0);
    expect(agoLabel(d)).toBe('1 year ago today');
  });

  it('returns month-based copy for other dates', () => {
    expect(agoLabel(new Date(2026, 3, 30, 8, 0, 0))).toBe('last month');
    expect(agoLabel(new Date(2026, 4, 1, 8, 0, 0))).toBe('this month');
  });
});

describe('isAnniv', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 30, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is true for same day/month in a prior year', () => {
    expect(isAnniv(new Date(2025, 4, 30, 18, 0, 0))).toBe(true);
  });

  it('is false for same year or different day', () => {
    expect(isAnniv(new Date(2026, 4, 30, 8, 0, 0))).toBe(false);
    expect(isAnniv(new Date(2025, 5, 1, 8, 0, 0))).toBe(false);
  });
});
