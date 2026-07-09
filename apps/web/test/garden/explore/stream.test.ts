import { describe, expect, it } from 'vitest';

import { POND_LEVEL, POOL_HALF_WIDTH, STREAM_HALF_WIDTH } from '@/lib/garden/explore/constants';
import { buildStream, closestOnStream, pointAlongStream, type Stream } from '@/lib/garden/explore/stream';
import type { MonthRegion, WorldBounds } from '@/lib/garden/explore/world-layout';

const bounds: WorldBounds = { minX: -12, maxX: 96, minZ: -26, maxZ: 12 };
const months = (n: number): MonthRegion[] =>
  Array.from({ length: n }, (_, i) => ({ key: i, label: `M${i}`, xStart: i * 28, xCenter: i * 28 + 14 }));
const worldish = (n: number) => ({ months: months(n), bounds, widthM: n * 28 });

// A hand-checkable stream: a straight north→south centerline at x=0 that widens toward the mouth.
const straight: Stream = {
  level: -0.15,
  points: [
    { x: 0, z: 0, halfWidth: 2 },
    { x: 0, z: 10, halfWidth: 4 },
  ],
};

describe('closestOnStream', () => {
  it('projects a point onto the centerline with interpolated half-width and unit tangent', () => {
    const s = closestOnStream(3, 5, straight);
    expect(s.dist).toBeCloseTo(3);
    expect(s.halfWidth).toBeCloseTo(3); // midway between 2 and 4
    expect(s.t).toBeCloseTo(0.5);
    expect(Math.hypot(s.tangent.x, s.tangent.z)).toBeCloseTo(1);
    expect(s.tangent.x).toBeCloseTo(0);
    expect(s.tangent.z).toBeCloseTo(1); // downstream = +z here
  });

  it('clamps to the source endpoint for points upstream of it', () => {
    const s = closestOnStream(0, -5, straight);
    expect(s.dist).toBeCloseTo(5);
    expect(s.t).toBeCloseTo(0);
    expect(s.halfWidth).toBeCloseTo(2);
  });

  it('clamps to the mouth endpoint for points downstream of it', () => {
    const s = closestOnStream(0, 15, straight);
    expect(s.dist).toBeCloseTo(5);
    expect(s.t).toBeCloseTo(1);
    expect(s.halfWidth).toBeCloseTo(4);
  });

  it('reports dist < halfWidth for a point sitting in the channel', () => {
    const s = closestOnStream(1, 5, straight);
    expect(s.dist).toBeLessThan(s.halfWidth);
  });
});

describe('pointAlongStream', () => {
  it('returns the endpoints at t=0 and t=1', () => {
    const head = pointAlongStream(straight, 0);
    expect(head.x).toBeCloseTo(0);
    expect(head.z).toBeCloseTo(0);
    expect(head.halfWidth).toBeCloseTo(2);
    const mouth = pointAlongStream(straight, 1);
    expect(mouth.z).toBeCloseTo(10);
    expect(mouth.halfWidth).toBeCloseTo(4);
  });

  it('interpolates the midpoint with a unit tangent', () => {
    const mid = pointAlongStream(straight, 0.5);
    expect(mid.x).toBeCloseTo(0);
    expect(mid.z).toBeCloseTo(5);
    expect(mid.halfWidth).toBeCloseTo(3);
    expect(Math.hypot(mid.tangent.x, mid.tangent.z)).toBeCloseTo(1);
  });
});

describe('buildStream', () => {
  it('returns null for gardens with fewer than two months', () => {
    expect(buildStream(worldish(0))).toBeNull();
    expect(buildStream(worldish(1))).toBeNull();
  });

  it('is deterministic', () => {
    expect(buildStream(worldish(3))).toEqual(buildStream(worldish(3)));
  });

  it('runs south (points ordered by ascending z) with both ends off the map', () => {
    const stream = buildStream(worldish(3))!;
    expect(stream.points.length).toBeGreaterThanOrEqual(4);
    for (let i = 1; i < stream.points.length; i++) {
      expect(stream.points[i]!.z).toBeGreaterThan(stream.points[i - 1]!.z);
    }
    expect(stream.points[0]!.z).toBeLessThan(bounds.minZ); // enters from beyond the north edge
    expect(stream.points[stream.points.length - 1]!.z).toBeGreaterThan(bounds.maxZ); // exits south
    expect(stream.level).toBe(POND_LEVEL);
  });

  it('widens into a pool near the south (POND_Z) and stays narrow at the ends', () => {
    const stream = buildStream(worldish(3))!;
    const widest = stream.points.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
    expect(widest.halfWidth).toBeGreaterThanOrEqual(POOL_HALF_WIDTH - 1e-9);
    expect(widest.z).toBeGreaterThan(0); // the pool sits south of the flower band
    expect(stream.points[0]!.halfWidth).toBeLessThanOrEqual(STREAM_HALF_WIDTH + 1e-9);
    expect(stream.points[stream.points.length - 1]!.halfWidth).toBeLessThanOrEqual(
      STREAM_HALF_WIDTH + 1e-9,
    );
  });

  it('centers the pool on a month boundary near mid-world', () => {
    const stream = buildStream(worldish(3))!;
    const widest = stream.points.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
    expect([28, 56]).toContain(widest.x);
  });
});
