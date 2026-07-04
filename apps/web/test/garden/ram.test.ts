import { describe, expect, it } from 'vitest';

import { isDifficultMood, ramAppearanceChance } from '@/lib/garden/bloom/ram';

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
