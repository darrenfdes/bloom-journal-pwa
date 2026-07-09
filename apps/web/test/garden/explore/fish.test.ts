import { describe, expect, it } from 'vitest';

import { fishAt, fishSchool } from '@/lib/garden/explore/fish';
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
});

describe('fishAt', () => {
  it('keeps every fish inside the channel and below the surface', () => {
    const school = fishSchool(stream, 7, 10);
    for (const f of school) {
      for (const time of [0, 1.3, 4.2, 9.9]) {
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
