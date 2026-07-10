import { describe, expect, it } from 'vitest';

import {
  BUTTERFLY_WINGS,
  buildButterflies,
  butterflyAt,
  butterflyCountFor,
  type PerchPoint,
} from '@/lib/garden/explore/butterflies';

const perches: PerchPoint[] = [
  { x: 2, y: 1.1, z: -4 },
  { x: 9, y: 0.9, z: -7 },
  { x: 15, y: 1.3, z: -3 },
  { x: 22, y: 1.0, z: -6 },
];

describe('butterflyCountFor', () => {
  it('flies by day and golden hour, thinly at dawn, never after dusk', () => {
    expect(butterflyCountFor('day', 'clear')).toBe(4);
    expect(butterflyCountFor('golden', 'clear')).toBe(4);
    expect(butterflyCountFor('dawn', 'clear')).toBe(2);
    expect(butterflyCountFor('dusk', 'clear')).toBe(0);
    expect(butterflyCountFor('night', 'clear')).toBe(0);
  });

  it('shelters from rain, snow and fog', () => {
    expect(butterflyCountFor('day', 'rain')).toBe(0);
    expect(butterflyCountFor('day', 'drizzle')).toBe(0);
    expect(butterflyCountFor('day', 'snow')).toBe(0);
    expect(butterflyCountFor('day', 'fog')).toBe(0);
    expect(butterflyCountFor('day', 'overcast')).toBeGreaterThan(0);
    expect(butterflyCountFor('day', undefined)).toBe(4);
  });
});

describe('buildButterflies', () => {
  it('is deterministic and wears the 2D wing palette', () => {
    const a = buildButterflies(21, 4);
    const b = buildButterflies(21, 4);
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
    for (const fly of a) {
      expect(fly.legDur).toBeGreaterThanOrEqual(6);
      expect(fly.legDur).toBeLessThanOrEqual(9);
      expect(fly.perchFrac).toBeGreaterThan(0.3);
      expect(fly.perchFrac).toBeLessThan(0.6);
      expect(BUTTERFLY_WINGS).toContainEqual(fly.wing);
    }
  });
});

describe('butterflyAt', () => {
  it('perches early in each leg and flies to a deterministic next flower', () => {
    const [fly] = buildButterflies(7, 1);
    const perchPose = butterflyAt(fly!, perches, 0.1)!;
    expect(perchPose.mode).toBe('perch');
    // Perched exactly on one of the flowers.
    expect(perches.some((p) => p.x === perchPose.x && p.z === perchPose.z)).toBe(true);

    const flyPose = butterflyAt(fly!, perches, fly!.legDur * 0.9)!;
    expect(flyPose.mode).toBe('fly');
    expect(flyPose.flap).toBeGreaterThan(perchPose.flap);
  });

  it('is continuous across leg boundaries', () => {
    const [fly] = buildButterflies(13, 1);
    for (const k of [1, 2, 3]) {
      const before = butterflyAt(fly!, perches, k * fly!.legDur - 1e-4)!;
      const after = butterflyAt(fly!, perches, k * fly!.legDur + 1e-4)!;
      expect(before.x).toBeCloseTo(after.x, 2);
      expect(before.y).toBeCloseTo(after.y, 2);
      expect(before.z).toBeCloseTo(after.z, 2);
    }
  });

  it('arcs above both flowers mid-flight', () => {
    const [fly] = buildButterflies(3, 1);
    // Sample the flight window of several legs; the apex must clear the taller perch.
    for (const k of [0, 1, 2]) {
      const t = (k + fly!.perchFrac + (1 - fly!.perchFrac) / 2) * fly!.legDur;
      const pose = butterflyAt(fly!, perches, t)!;
      const maxPerch = Math.max(...perches.map((p) => p.y));
      expect(pose.y).toBeGreaterThan(Math.min(...perches.map((p) => p.y)));
      expect(pose.y).toBeLessThan(maxPerch + 2);
    }
  });

  it('returns null with no flowers and copes with a single flower', () => {
    const [fly] = buildButterflies(5, 1);
    expect(butterflyAt(fly!, [], 4)).toBeNull();
    const solo = butterflyAt(fly!, [perches[0]!], 12)!;
    expect(solo.x).toBeCloseTo(perches[0]!.x, 0);
  });
});
