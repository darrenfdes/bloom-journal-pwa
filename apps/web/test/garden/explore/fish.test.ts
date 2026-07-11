import { describe, expect, it } from 'vitest';

import { FISH_SPECIES, fishAt, fishRise, fishSchool, rippleAt } from '@/lib/garden/explore/fish';
import { closestOnStream, type Stream } from '@/lib/garden/explore/stream';

// A straight channel that widens into a pool at z=0.
const stream: Stream = {
  level: -0.15,
  points: [
    { x: 0, z: -20, halfWidth: 1.4 },
    { x: 0, z: 0, halfWidth: 5.5 },
    { x: 0, z: 20, halfWidth: 1.4 },
  ],
};

describe('fishSchool', () => {
  it('is deterministic and sized to the count', () => {
    const a = fishSchool(stream, 7, 8);
    expect(fishSchool(stream, 7, 8)).toEqual(a);
    expect(a).toHaveLength(8);
  });

  it('draws each fish from its species palette and ranges', () => {
    for (const f of fishSchool(stream, 7, 24)) {
      const spec = FISH_SPECIES[f.species];
      expect(spec.colors).toContain(f.color);
      expect(f.size).toBeGreaterThanOrEqual(spec.size[0]);
      expect(f.size).toBeLessThanOrEqual(spec.size[1]);
      expect(f.speed).toBeGreaterThanOrEqual(spec.speed[0]);
      expect(f.speed).toBeLessThanOrEqual(spec.speed[1]);
      expect(f.depth).toBeGreaterThanOrEqual(spec.depth[0]);
      expect(f.depth).toBeLessThanOrEqual(spec.depth[1]);
    }
  });

  it('mixes both species', () => {
    const school = fishSchool(stream, 7, 24);
    expect(school.some((f) => f.species === 'koi')).toBe(true);
    expect(school.some((f) => f.species === 'minnow')).toBe(true);
  });
});

describe('fishAt', () => {
  it('keeps every fish inside the channel and below the surface', () => {
    const school = fishSchool(stream, 7, 10);
    for (const f of school) {
      for (const time of [0, 1.3, 4.2, 9.9, 13.7, 18.1, 23.6, 31.4]) {
        const pose = fishAt(f, stream, time);
        const s = closestOnStream(pose.x, pose.z, stream);
        expect(s.dist).toBeLessThanOrEqual(s.halfWidth + 1e-6);
        expect(pose.y).toBeLessThan(stream.level);
        expect(Number.isFinite(pose.heading)).toBe(true);
      }
    }
  });

  it('swims over time, but holds still under reduced motion', () => {
    const f = fishSchool(stream, 3, 4)[0]!;
    const p0 = fishAt(f, stream, 0);
    const p1 = fishAt(f, stream, 2.5);
    expect(Math.hypot(p1.x - p0.x, p1.z - p0.z)).toBeGreaterThan(0);

    const r0 = fishAt(f, stream, 0, true);
    const r1 = fishAt(f, stream, 2.5, true);
    expect(r1).toEqual(r0);
  });
});

describe('fishRise', () => {
  it('pulses once per period but never lifts the fish above the surface', () => {
    for (const f of fishSchool(stream, 7, 10)) {
      const period = 1 / f.riseHz;
      let peaked = false;
      for (let i = 0; i <= 200; i++) {
        const time = (i / 200) * period;
        const rise = fishRise(f, time);
        expect(rise).toBeGreaterThanOrEqual(0);
        expect(rise).toBeLessThanOrEqual(1);
        if (rise > 0.9) peaked = true;
        expect(fishAt(f, stream, time).y).toBeLessThan(stream.level);
      }
      expect(peaked).toBe(true);
    }
  });

  it('is 0 under reduced motion', () => {
    const f = fishSchool(stream, 7, 1)[0]!;
    for (const time of [0, 1, 5, 20]) expect(fishRise(f, time, true)).toBe(0);
  });
});

describe('rippleAt', () => {
  it('is null most of the time but appears around each rise, anchored and finite', () => {
    for (const f of fishSchool(stream, 7, 6)) {
      const period = 1 / f.riseHz;
      let active = 0;
      const samples = 400;
      for (let i = 0; i < samples; i++) {
        const time = (i / samples) * period;
        const ring = rippleAt(f, stream, time);
        if (!ring) continue;
        active++;
        expect(ring.radius).toBeGreaterThan(0);
        expect(ring.radius).toBeLessThanOrEqual(0.7 * f.size);
        expect(ring.opacity).toBeGreaterThanOrEqual(0);
        expect(ring.opacity).toBeLessThanOrEqual(0.5);
        expect(Number.isFinite(ring.x)).toBe(true);
        expect(Number.isFinite(ring.z)).toBe(true);
      }
      expect(active).toBeGreaterThan(0);
      expect(active).toBeLessThan(samples / 2);
    }
  });

  it('is always null under reduced motion', () => {
    const f = fishSchool(stream, 7, 1)[0]!;
    const period = 1 / f.riseHz;
    for (let i = 0; i < 100; i++) {
      expect(rippleAt(f, stream, (i / 100) * period, true)).toBeNull();
    }
  });
});
