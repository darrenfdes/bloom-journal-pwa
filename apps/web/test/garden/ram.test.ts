import { describe, expect, it } from 'vitest';

import { isDifficultMood, ramAppearanceChance, ramDayRoll } from '@/lib/garden/bloom/ram';

describe('isDifficultMood', () => {
  it('is true for moods in the shared Difficult category', () => {
    for (const mood of [
      'melancholy',
      'anxious',
      'irritated',
      'overwhelmed',
      'lonely',
      'guilty',
      'angry',
      'jealous',
      'cribby',
    ] as const) {
      expect(isDifficultMood(mood)).toBe(true);
    }
  });

  it('is false for non-difficult moods and for null/undefined', () => {
    expect(isDifficultMood('joyful')).toBe(false);
    expect(isDifficultMood('drained')).toBe(false); // low/apathetic, not difficult
    expect(isDifficultMood(null)).toBe(false);
    expect(isDifficultMood(undefined)).toBe(false);
  });
});

describe('ramAppearanceChance', () => {
  it('always shows on a difficult-mood entry, regardless of weather or time', () => {
    expect(ramAppearanceChance({ difficult: true, raining: false, night: false })).toBe(1);
    expect(ramAppearanceChance({ difficult: true, raining: true, night: true })).toBe(1);
  });

  it('shows with 20% chance when raining (day or night), absent a difficult mood', () => {
    expect(ramAppearanceChance({ difficult: false, raining: true, night: false })).toBe(0.2);
    expect(ramAppearanceChance({ difficult: false, raining: true, night: true })).toBe(0.2);
  });

  it('shows with a 1/10 chance on a clear night', () => {
    expect(ramAppearanceChance({ difficult: false, raining: false, night: true })).toBe(0.1);
  });

  it('stays hidden on a clear, non-difficult day', () => {
    expect(ramAppearanceChance({ difficult: false, raining: false, night: false })).toBe(0);
  });

  it('ranks rain above night when both apply', () => {
    expect(ramAppearanceChance({ difficult: false, raining: true, night: true })).toBe(0.2);
  });
});

describe('ramDayRoll', () => {
  it('is deterministic for the same day and conditions', () => {
    expect(ramDayRoll('2026-07-04', true, false)).toBe(ramDayRoll('2026-07-04', true, false));
    expect(ramDayRoll('2026-07-04', false, true)).toBe(ramDayRoll('2026-07-04', false, true));
  });

  it('stays within [0, 1)', () => {
    for (const day of ['2026-07-04', '2026-07-05', '2026-12-31', '2027-01-01']) {
      const roll = ramDayRoll(day, true, false);
      expect(roll).toBeGreaterThanOrEqual(0);
      expect(roll).toBeLessThan(1);
    }
  });

  it('varies across days and across conditions', () => {
    const rolls = new Set([
      ramDayRoll('2026-07-04', true, false),
      ramDayRoll('2026-07-05', true, false),
      ramDayRoll('2026-07-06', true, false),
      ramDayRoll('2026-07-04', false, true),
      ramDayRoll('2026-07-04', false, false),
    ]);
    expect(rolls.size).toBeGreaterThan(1);
  });
});
