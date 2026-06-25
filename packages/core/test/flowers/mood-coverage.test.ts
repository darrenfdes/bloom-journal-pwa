import { describe, expect, it } from 'vitest';

import { MOODS, MOOD_CATEGORIES } from '../../src/constants/moods';
import { appMoodToBloomMood, BLOOM_FOR_MOOD } from '../../src/flowers/moodBloom';
import { BLOOM_PALETTES } from '../../src/flowers/moodPalettes';

const pickableMoods = MOODS.map((m) => m.id);
const categorizedMoods = MOOD_CATEGORIES.flatMap((c) => c.moods);

describe('mood ↔ category ↔ bloom wiring stays complete', () => {
  it('every pickable mood is in exactly one category (and ecstatic is omitted)', () => {
    expect([...categorizedMoods].sort()).toEqual([...pickableMoods].sort());
    expect(categorizedMoods).not.toContain('ecstatic');
    // No mood appears in two categories.
    expect(new Set(categorizedMoods).size).toBe(categorizedMoods.length);
  });

  it('every mood maps to a bloom that has both a palette and a species', () => {
    for (const mood of [...pickableMoods, 'ecstatic' as const]) {
      const bloomMood = appMoodToBloomMood(mood);
      expect(BLOOM_PALETTES[bloomMood], `${mood} → ${bloomMood} palette`).toBeDefined();
      expect(BLOOM_FOR_MOOD[bloomMood], `${mood} → ${bloomMood} species`).toBeDefined();
    }
  });

  it('the new low/apathetic family uses the muted blooms', () => {
    expect(appMoodToBloomMood('apathetic')).toBe('apathetic');
    expect(appMoodToBloomMood('numb')).toBe('apathetic');
    expect(appMoodToBloomMood('indifferent')).toBe('apathetic');
    expect(appMoodToBloomMood('drained')).toBe('drained');
    expect(appMoodToBloomMood('unmotivated')).toBe('drained');
  });
});
