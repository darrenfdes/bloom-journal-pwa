import { describe, expect, it } from 'vitest';

import {
  FOX_FLOAT_SUBMERSION,
  POND_LEVEL,
  POOL_BED_MAX_DROP,
  POOL_HALF_WIDTH,
  STREAM_HALF_WIDTH,
} from '@/lib/garden/explore/constants';
import { groundHeightAt, surfaceHeightAt } from '@/lib/garden/explore/terrain';
import type { Stream } from '@/lib/garden/explore/stream';

// A straight north→south channel at x=28 that widens into a pool at z=7 and narrows again.
const stream: Stream = {
  level: POND_LEVEL,
  points: [
    { x: 28, z: -20, halfWidth: STREAM_HALF_WIDTH },
    { x: 28, z: 7, halfWidth: POOL_HALF_WIDTH },
    { x: 28, z: 20, halfWidth: STREAM_HALF_WIDTH },
  ],
};

describe('groundHeightAt', () => {
  it('is deterministic and continuous', () => {
    expect(groundHeightAt(10, -5)).toBe(groundHeightAt(10, -5));
    for (let x = -10; x <= 90; x += 7.3) {
      for (let z = -25; z <= 11; z += 5.1) {
        const dh = Math.abs(groundHeightAt(x + 0.01, z) - groundHeightAt(x, z));
        expect(dh).toBeLessThan(0.02);
      }
    }
  });

  it('stays a gentle undulation (|h| ≤ 0.6) without a stream', () => {
    for (let x = -20; x <= 120; x += 3.7) {
      for (let z = -30; z <= 15; z += 3.1) {
        expect(Math.abs(groundHeightAt(x, z))).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('carves down to a deep bed under the pool and stays below the surface in the channel', () => {
    // At the pool centre the bed drops the full amount below the water surface.
    expect(groundHeightAt(28, 7, stream)).toBeCloseTo(POND_LEVEL - POOL_BED_MAX_DROP, 6);
    // Anywhere inside the channel the bed sits at or below the water surface.
    for (let z = -18; z <= 18; z += 4) {
      expect(groundHeightAt(28, z, stream)).toBeLessThanOrEqual(POND_LEVEL + 1e-9);
    }
  });

  it('blends smoothly at the bank and leaves far terrain untouched', () => {
    const far = 28 + POOL_HALF_WIDTH + 6;
    expect(groundHeightAt(far, 7, stream)).toBeCloseTo(groundHeightAt(far, 7), 10);

    const mid = 28 + POOL_HALF_WIDTH + 1.5;
    const blended = groundHeightAt(mid, 7, stream);
    const bed = POND_LEVEL - POOL_BED_MAX_DROP;
    const untouched = groundHeightAt(mid, 7);
    expect(blended).toBeGreaterThanOrEqual(Math.min(bed, untouched) - 1e-9);
    expect(blended).toBeLessThanOrEqual(Math.max(bed, untouched) + 1e-9);
  });
});

describe('surfaceHeightAt', () => {
  it('floats at the waterline in the deep pool (above the bed)', () => {
    expect(surfaceHeightAt(28, 7, stream)).toBeCloseTo(POND_LEVEL - FOX_FLOAT_SUBMERSION, 6);
    expect(surfaceHeightAt(28, 7, stream)).toBeGreaterThan(groundHeightAt(28, 7, stream));
  });

  it('sits on the bed in the shallow creek (wading, not floating)', () => {
    expect(surfaceHeightAt(28, -18, stream)).toBeCloseTo(groundHeightAt(28, -18, stream), 10);
  });

  it('matches the ground away from the water', () => {
    expect(surfaceHeightAt(60, 7, stream)).toBeCloseTo(groundHeightAt(60, 7, stream), 10);
    expect(surfaceHeightAt(10, -5, null)).toBeCloseTo(groundHeightAt(10, -5), 10);
  });
});
