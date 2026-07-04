import { describe, expect, it } from 'vitest';

import { duckSessionChance } from '@/lib/garden/bloom/ducks';

describe('duckSessionChance', () => {
  it('ducks fly at golden hour and dusk only', () => {
    expect(duckSessionChance('golden')).toBeGreaterThan(0);
    expect(duckSessionChance('dusk')).toBeGreaterThan(0);
    expect(duckSessionChance('dawn')).toBe(0);
    expect(duckSessionChance('day')).toBe(0);
    expect(duckSessionChance('night')).toBe(0);
  });

  it('is weighted toward golden hour over dusk', () => {
    expect(duckSessionChance('golden')).toBeGreaterThan(duckSessionChance('dusk'));
  });
});
