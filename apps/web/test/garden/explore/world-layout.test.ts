import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import { buildExploreWorld } from '@/lib/garden/explore/world-layout';
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
    expect(a.ponds).toEqual(b.ponds);
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

  it('places no pond for a single month, one for three months, clear of the flowers', () => {
    const one = buildExploreWorld(buildMeadowLayout([entry({ id: 'solo' })]));
    expect(one.ponds).toHaveLength(0);

    const three = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(three.ponds).toHaveLength(1);
    const pond = three.ponds[0]!;
    expect([28, 56]).toContain(pond.x);
    // South of the flower band: the pond edge never reaches the flowers' z range.
    expect(pond.z - pond.radius).toBeGreaterThan(-2);
    expect(pond.level).toBeLessThan(0);
  });

  it('adds a second pond for gardens spanning eight or more months', () => {
    const world = buildExploreWorld(buildMeadowLayout(nineMonths()));
    expect(world.ponds).toHaveLength(2);
    expect(world.ponds[0]!.x).not.toBe(world.ponds[1]!.x);
  });

  it('spawns south of the newest month facing the flowers', () => {
    const world = buildExploreWorld(buildMeadowLayout(threeMonths()));
    expect(world.spawn.x).toBeCloseTo(world.months[2]!.xCenter);
    expect(world.spawn.z).toBeGreaterThan(0);
    expect(world.spawn.yaw).toBe(0);
  });

  it('handles an empty garden without ponds or flowers', () => {
    const world = buildExploreWorld(buildMeadowLayout([]));
    expect(world.flowers).toHaveLength(0);
    expect(world.ponds).toHaveLength(0);
    expect(world.bounds.minX).toBeLessThan(world.bounds.maxX);
    expect(Number.isFinite(world.spawn.x)).toBe(true);
  });
});
