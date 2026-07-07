import { describe, expect, it } from 'vitest';

import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { Pond } from '@/lib/garden/explore/world-layout';

const pond: Pond = { x: 28, z: 7, radius: 5, level: -0.15 };

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

  it('stays a gentle undulation (|h| ≤ 0.6) without ponds', () => {
    for (let x = -20; x <= 120; x += 3.7) {
      for (let z = -30; z <= 15; z += 3.1) {
        expect(Math.abs(groundHeightAt(x, z))).toBeLessThanOrEqual(0.6);
      }
    }
  });

  it('flattens exactly to the pond level inside a pond', () => {
    expect(groundHeightAt(pond.x, pond.z, [pond])).toBeCloseTo(pond.level, 10);
    expect(groundHeightAt(pond.x + 4.9, pond.z, [pond])).toBeCloseTo(pond.level, 10);
    expect(groundHeightAt(pond.x, pond.z - 4.5, [pond])).toBeCloseTo(pond.level, 10);
  });

  it('blends smoothly at the rim and leaves far terrain untouched', () => {
    const far = pond.x + pond.radius + 3.01;
    expect(groundHeightAt(far, pond.z, [pond])).toBeCloseTo(groundHeightAt(far, pond.z), 10);

    const mid = pond.x + pond.radius + 1.5;
    const blended = groundHeightAt(mid, pond.z, [pond]);
    const untouched = groundHeightAt(mid, pond.z);
    const lo = Math.min(pond.level, untouched);
    const hi = Math.max(pond.level, untouched);
    expect(blended).toBeGreaterThanOrEqual(lo);
    expect(blended).toBeLessThanOrEqual(hi);
  });
});
