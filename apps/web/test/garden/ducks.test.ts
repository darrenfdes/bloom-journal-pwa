import { describe, expect, it } from 'vitest';

import { duckSpawnChance } from '@/lib/garden/bloom/ducks';

describe('duckSpawnChance', () => {
  it('ducks fly at golden hour and dusk only', () => {
    expect(duckSpawnChance('golden')).toBeGreaterThan(0);
    expect(duckSpawnChance('dusk')).toBeGreaterThan(0);
    expect(duckSpawnChance('dawn')).toBe(0);
    expect(duckSpawnChance('day')).toBe(0);
    expect(duckSpawnChance('night')).toBe(0);
  });

  it('is weighted toward golden hour over dusk', () => {
    expect(duckSpawnChance('golden')).toBeGreaterThan(duckSpawnChance('dusk'));
  });
});
