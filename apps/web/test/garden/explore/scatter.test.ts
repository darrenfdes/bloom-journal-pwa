import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import {
  bushBands,
  clutterScatter,
  groundCoverScatter,
  pondDecorFor,
  scatterInBand,
  scatterInRing,
  TREE_MARGIN,
  treeBands,
  treelineRing,
  walkableBand,
  worldExclusions,
  type Band,
} from '@/lib/garden/explore/scatter';
import { buildExploreWorld } from '@/lib/garden/explore/world-layout';
import { entry } from '../../fixtures/entry';

const world = () =>
  buildExploreWorld(
    buildMeadowLayout(
      Array.from({ length: 10 }, (_, i) =>
        entry({ id: `e${i}`, createdAt: new Date(2026, i % 12, 3 + i), flowerSeed: 100 + i }),
      ),
    ),
  );

const band: Band = { xMin: 0, xMax: 20, zMin: -10, zMax: 10 };

describe('scatterInBand', () => {
  it('is deterministic for a given seed', () => {
    const a = scatterInBand({ seed: 42, count: 20, band, minScale: 0.5, maxScale: 1.5, variants: 3 });
    const b = scatterInBand({ seed: 42, count: 20, band, minScale: 0.5, maxScale: 1.5, variants: 3 });
    expect(a).toEqual(b);
  });

  it('places items inside the band with valid scale/variant', () => {
    const items = scatterInBand({ seed: 7, count: 30, band, minScale: 0.4, maxScale: 1.2, variants: 2 });
    for (const it of items) {
      expect(it.x).toBeGreaterThanOrEqual(band.xMin);
      expect(it.x).toBeLessThanOrEqual(band.xMax);
      expect(it.z).toBeGreaterThanOrEqual(band.zMin);
      expect(it.z).toBeLessThanOrEqual(band.zMax);
      expect(it.scale).toBeGreaterThanOrEqual(0.4);
      expect(it.scale).toBeLessThanOrEqual(1.2);
      expect([0, 1]).toContain(it.variant);
    }
  });

  it('respects exclusion circles', () => {
    const exclusions = [{ x: 10, z: 0, radius: 8 }];
    const items = scatterInBand({ seed: 3, count: 40, band, minScale: 1, maxScale: 1, variants: 1, exclusions });
    for (const it of items) {
      expect(Math.hypot(it.x - 10, it.z - 0)).toBeGreaterThanOrEqual(8);
    }
  });

  it('terminates (does not hang) when exclusions make the band nearly impossible', () => {
    const exclusions = [{ x: 10, z: 0, radius: 100 }];
    const items = scatterInBand({ seed: 1, count: 50, band, minScale: 1, maxScale: 1, variants: 1, exclusions });
    expect(items.length).toBeLessThan(50); // guard cut it short rather than looping forever
  });
});

describe('scatterInRing', () => {
  it('places items within the annulus and is deterministic', () => {
    const args = { seed: 9, count: 25, cx: 5, cz: -3, rMin: 2, rMax: 4, minScale: 1, maxScale: 1, variants: 1 };
    const a = scatterInRing(args);
    expect(scatterInRing(args)).toEqual(a);
    for (const it of a) {
      const r = Math.hypot(it.x - 5, it.z + 3);
      expect(r).toBeGreaterThanOrEqual(2 - 1e-9);
      expect(r).toBeLessThanOrEqual(4 + 1e-9);
    }
  });
});

describe('worldExclusions', () => {
  it('covers every flower, pond (buffered) and the spawn point', () => {
    const w = world();
    const ex = worldExclusions(w);
    expect(ex.length).toBe(w.flowers.length + w.ponds.length + 1);
    for (const p of w.ponds) {
      const match = ex.find((e) => e.x === p.x && e.z === p.z);
      expect(match?.radius).toBeGreaterThan(p.radius);
    }
    expect(ex.some((e) => e.x === w.spawn.x && e.z === w.spawn.z)).toBe(true);
  });
});

describe('treeBands', () => {
  it('keeps every band at least TREE_MARGIN outside the walkable bounds', () => {
    const w = world();
    const b = w.bounds;
    for (const band of treeBands(w)) {
      const outside =
        band.zMax <= b.minZ - TREE_MARGIN + 1e-9 || // north
        band.zMin >= b.maxZ + TREE_MARGIN - 1e-9 || // south
        band.xMax <= b.minX - TREE_MARGIN + 1e-9 || // west
        band.xMin >= b.maxX + TREE_MARGIN - 1e-9; // east
      expect(outside).toBe(true);
    }
  });
});

describe('bushBands', () => {
  it('returns thin strips inside the north and south edges', () => {
    const w = world();
    const bands = bushBands(w);
    expect(bands).toHaveLength(2);
    for (const band of bands) {
      expect(band.zMax - band.zMin).toBeCloseTo(1.5);
    }
  });
});

describe('pondDecorFor', () => {
  it('floats pads inside the pond and rings reeds around the rim, deterministically', () => {
    const pond = { x: 20, z: 7, radius: 5, level: -0.15 };
    const a = pondDecorFor(pond, 0);
    expect(pondDecorFor(pond, 0)).toEqual(a);
    for (const pad of a.pads) {
      expect(Math.hypot(pad.x - pond.x, pad.z - pond.z)).toBeLessThanOrEqual(pond.radius * 0.72 + 1e-9);
    }
    for (const reed of a.reeds) {
      const r = Math.hypot(reed.x - pond.x, reed.z - pond.z);
      expect(r).toBeGreaterThanOrEqual(pond.radius * 0.95 - 1e-9);
      expect(r).toBeLessThanOrEqual(pond.radius * 1.18 + 1e-9);
    }
    // different pond index → different layout
    expect(pondDecorFor(pond, 1)).not.toEqual(a);
  });

  it('rings cattails outside the reeds and floats blossoms on the inner water', () => {
    const pond = { x: 20, z: 7, radius: 5, level: -0.15 };
    const a = pondDecorFor(pond, 0);
    expect(a.cattails.length).toBeGreaterThan(0);
    for (const c of a.cattails) {
      expect(Math.hypot(c.x - pond.x, c.z - pond.z)).toBeGreaterThanOrEqual(pond.radius * 1.02 - 1e-9);
    }
    for (const b of a.blossoms) {
      expect(Math.hypot(b.x - pond.x, b.z - pond.z)).toBeLessThanOrEqual(pond.radius * 0.62 + 1e-9);
    }
  });
});

describe('treelineRing', () => {
  it('is deterministic and sits off the walkable meadow', () => {
    const w = world();
    expect(treelineRing(w)).toEqual(treelineRing(w));
    const b = w.bounds;
    for (const t of treelineRing(w)) {
      const outside = t.x < b.minX || t.x > b.maxX || t.z < b.minZ || t.z > b.maxZ;
      expect(outside).toBe(true);
    }
  });
});

describe('groundCoverScatter', () => {
  it('keeps wildflowers and ferns inside the meadow and off the flowers/ponds/spawn', () => {
    const w = world();
    const band = walkableBand(w);
    const ex = worldExclusions(w);
    const { wildflowers, ferns } = groundCoverScatter(w);
    expect(wildflowers.length).toBeGreaterThan(0);
    for (const item of [...wildflowers, ...ferns]) {
      expect(item.x).toBeGreaterThanOrEqual(band.xMin);
      expect(item.x).toBeLessThanOrEqual(band.xMax);
      for (const e of ex) expect(Math.hypot(item.x - e.x, item.z - e.z)).toBeGreaterThanOrEqual(e.radius);
    }
    expect(groundCoverScatter(w)).toEqual({ wildflowers, ferns });
  });
});

describe('clutterScatter', () => {
  it('deterministically scatters clutter off the exclusions', () => {
    const w = world();
    const ex = worldExclusions(w);
    const c = clutterScatter(w);
    expect(clutterScatter(w)).toEqual(c);
    for (const item of [...c.mushrooms, ...c.logs, ...c.stumps, ...c.pebbles]) {
      for (const e of ex) expect(Math.hypot(item.x - e.x, item.z - e.z)).toBeGreaterThanOrEqual(e.radius);
    }
  });
});
