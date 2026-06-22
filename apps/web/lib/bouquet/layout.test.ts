import { describe, expect, it } from 'vitest';

import {
  FAN_SPREAD_DEG,
  MIN_HEIGHT_SCALE,
  flowerAngles,
  flowerHeightScales,
  greeneryOffsets,
  shuffleOrder,
  tiePoint,
} from './layout';

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

describe('greeneryOffsets', () => {
  it('centres a single accent on the tie', () => {
    expect(greeneryOffsets(1)).toEqual([0]);
  });

  it('fans accents symmetrically around the centre', () => {
    const two = greeneryOffsets(2);
    expect(two[0]).toBeCloseTo(-two[1]!);
    const three = greeneryOffsets(3);
    expect(three[1]).toBe(0);
    expect(three[0]).toBeCloseTo(-three[2]!);
  });

  it('spreads accents wide enough to frame the flowers, not hide behind them', () => {
    // The outer accents must fan clearly past the central blooms.
    expect(Math.abs(greeneryOffsets(2)[0]!)).toBeGreaterThanOrEqual(0.15);
    expect(Math.abs(greeneryOffsets(3)[0]!)).toBeGreaterThanOrEqual(0.15);
  });
});

describe('flowerHeightScales', () => {
  it('keeps a lone flower (or none) at full size — staggering needs two', () => {
    expect(flowerHeightScales([])).toEqual([]);
    expect(flowerHeightScales([42])).toEqual([1]);
  });

  it('returns one scale per seed, each within [MIN_HEIGHT_SCALE, 1]', () => {
    const scales = flowerHeightScales([1, 2, 3, 4, 5]);
    expect(scales).toHaveLength(5);
    for (const s of scales) {
      expect(s).toBeGreaterThanOrEqual(MIN_HEIGHT_SCALE);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('is deterministic — same seeds give identical scales', () => {
    expect(flowerHeightScales([7, 11, 13])).toEqual(flowerHeightScales([7, 11, 13]));
  });

  it('staggers distinct seeds to distinct heights', () => {
    const scales = flowerHeightScales([1, 2, 3, 4, 5]);
    expect(new Set(scales).size).toBe(scales.length);
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
