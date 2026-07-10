import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import { buildExploreWorld, monthLabelAt } from '@/lib/garden/explore/world-layout';
import { entry } from '../../fixtures/entry';

const threeMonths = () => [
  entry({ id: 'jan', createdAt: new Date(2026, 0, 5) }),
  entry({ id: 'feb', createdAt: new Date(2026, 1, 10) }),
  entry({ id: 'mar', createdAt: new Date(2026, 2, 20) }),
];

const nineMonths = () =>
  Array.from({ length: 9 }, (_, i) => entry({ id: `m${i}`, createdAt: new Date(2026, i, 10) }));

describe('buildExploreWorld', () => {
  it('is deterministic for the same layout', () => {
    const records = threeMonths();
    const a = buildExploreWorld(buildMeadowLayout(records));
    const b = buildExploreWorld(buildMeadowLayout(records));
    expect(a.flowers.map((f) => [f.x, f.z, f.height])).toEqual(
      b.flowers.map((f) => [f.x, f.z, f.height]),
    );
    expect(a.stream).toEqual(b.stream);
    expect(a.spawn).toEqual(b.spawn);
  });

  it('maps month bands to 28 m strips along +x in chronological order', () => {
    const world = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(world.widthM).toBeCloseTo(84);
    expect(world.months.map((m) => m.xStart)).toEqual([0, 28, 56]);
    expect(world.months[0]!.xCenter).toBeCloseTo(14);
    expect(world.months[0]!.label).toBe('January 2026');
    const xs = world.flowers.map((f) => f.x);
    expect(xs[0]).toBeLessThan(xs[1]!);
    expect(xs[1]).toBeLessThan(xs[2]!);
  });

  it('recovers the 2D depth roll into the north flower band (yB round-trip)', () => {
    const layout = buildMeadowLayout(threeMonths());
    const world = buildExploreWorld(layout);
    layout.entries.forEach((e, i) => {
      const depth = (e.yB - 16) / 72;
      expect(world.flowers[i]!.z).toBeCloseTo(-2 - depth * 16);
    });
  });

  it('keeps every flower inside the walkable bounds', () => {
    const world = buildExploreWorld(buildMeadowLayout(nineMonths()));
    for (const f of world.flowers) {
      expect(f.x).toBeGreaterThan(world.bounds.minX);
      expect(f.x).toBeLessThan(world.bounds.maxX);
      expect(f.z).toBeGreaterThan(world.bounds.minZ);
      expect(f.z).toBeLessThan(world.bounds.maxZ);
    }
  });

  it('gives favourited entries taller billboards', () => {
    const plain = buildExploreWorld(
      buildMeadowLayout([entry({ id: 'e', isFavourited: false })]),
    );
    const fav = buildExploreWorld(buildMeadowLayout([entry({ id: 'e', isFavourited: true })]));
    expect(fav.flowers[0]!.height).toBeGreaterThan(plain.flowers[0]!.height);
    expect(plain.flowers[0]!.height).toBeGreaterThan(0.8);
    expect(fav.flowers[0]!.height).toBeLessThan(2.2);
  });

  it('carves no stream for a single month, and a through-stream for three months', () => {
    const one = buildExploreWorld(buildMeadowLayout([entry({ id: 'solo' })]));
    expect(one.stream).toBeNull();

    const three = buildExploreWorld(buildMeadowLayout(threeMonths()));
    const stream = three.stream!;
    expect(stream).not.toBeNull();
    // Enters from beyond the north edge and exits beyond the south edge — comes from off-map.
    expect(stream.points[0]!.z).toBeLessThan(three.bounds.minZ);
    expect(stream.points[stream.points.length - 1]!.z).toBeGreaterThan(three.bounds.maxZ);
    // Pool sits on a month boundary near mid-world, south of the flower band.
    const pool = stream.points.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
    expect([28, 56]).toContain(pool.x);
    expect(pool.z).toBeGreaterThan(-2);
    expect(stream.level).toBeLessThan(0);
  });

  it('spawns south of the newest month facing the flowers', () => {
    const world = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(world.spawn.x).toBeCloseTo(world.months[2]!.xCenter);
    expect(world.spawn.z).toBeGreaterThan(0);
    expect(world.spawn.yaw).toBe(0);
  });

  it('handles an empty garden without a stream or flowers', () => {
    const world = buildExploreWorld(buildMeadowLayout([]));
    expect(world.flowers).toHaveLength(0);
    expect(world.stream).toBeNull();
    expect(world.bounds.minX).toBeLessThan(world.bounds.maxX);
    expect(Number.isFinite(world.spawn.x)).toBe(true);
  });
});

describe('monthLabelAt', () => {
  it('returns the month band under x, boundaries belonging to the newer month', () => {
    const world = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(monthLabelAt(4, world)).toBe('January 2026');
    expect(monthLabelAt(28, world)).toBe('February 2026');
    expect(monthLabelAt(55.9, world)).toBe('February 2026');
    expect(monthLabelAt(70, world)).toBe('March 2026');
  });

  it('clamps the off-strip walkable margins to the first/last month', () => {
    const world = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(monthLabelAt(world.bounds.minX, world)).toBe('January 2026');
    expect(monthLabelAt(world.bounds.maxX, world)).toBe('March 2026');
  });

  it('handles a single-month garden and returns null for an empty one', () => {
    const one = buildExploreWorld(
      buildMeadowLayout([entry({ id: 'solo', createdAt: new Date(2026, 5, 1) })]),
    );
    expect(monthLabelAt(one.spawn.x, one)).toBe('June 2026');
    const empty = buildExploreWorld(buildMeadowLayout([]));
    expect(monthLabelAt(0, empty)).toBeNull();
  });
});
