import { describe, expect, it } from 'vitest';

import { FAN_SPREAD_DEG, flowerAngles, shuffleOrder, tiePoint } from './layout';

describe('flowerAngles', () => {
  it('centres a single flower upright', () => {
    expect(flowerAngles(1)).toEqual([0]);
  });

  it('fans flowers symmetrically around the tie point', () => {
    expect(flowerAngles(2)).toEqual([-FAN_SPREAD_DEG / 2, FAN_SPREAD_DEG / 2]);
    expect(flowerAngles(5)).toEqual([
      -2 * FAN_SPREAD_DEG,
      -FAN_SPREAD_DEG,
      0,
      FAN_SPREAD_DEG,
      2 * FAN_SPREAD_DEG,
    ]);
  });
});

describe('tiePoint', () => {
  it('sits low and centred, leaving room for the ribbon below', () => {
    expect(tiePoint(100)).toEqual({ x: 50, y: 87 });
    expect(tiePoint(260)).toEqual({ x: 130, y: 260 * 0.87 });
  });
});

describe('shuffleOrder', () => {
  it('keeps a single id untouched', () => {
    expect(shuffleOrder(['a'])).toEqual(['a']);
  });

  it('returns a permutation of the same ids', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const out = shuffleOrder(ids, () => 0.5);
    expect([...out].sort()).toEqual([...ids].sort());
    expect(out).toHaveLength(ids.length);
  });

  it('produces a different order than the input when it can', () => {
    // A reverse-ish rng that would otherwise be the identity gets rotated.
    const out = shuffleOrder(['a', 'b'], () => 0);
    expect(out).not.toEqual(['a', 'b']);
    expect([...out].sort()).toEqual(['a', 'b']);
  });
});
