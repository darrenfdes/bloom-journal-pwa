import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import {
  blossomTrees,
  bushBands,
  clutterScatter,
  groundCoverScatter,
  scatterInBand,
  scatterInRing,
  streamDecorFor,
  streamPool,
  TREE_MARGIN,
  treeBands,
  treelineRing,
  walkableBand,
  worldExclusions,
  type Band,
} from '@/lib/garden/explore/scatter';
import { closestOnStream } from '@/lib/garden/explore/stream';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
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
  it('covers every flower, the stream channel, and the spawn point', () => {
    const w = world();
    const ex = worldExclusions(w);
    for (const f of w.flowers) {
      expect(ex.some((e) => e.x === f.x && e.z === f.z)).toBe(true);
    }
    expect(ex.some((e) => e.x === w.spawn.x && e.z === w.spawn.z)).toBe(true);
    // The pool centre falls inside an exclusion, so decor never lands in the water.
    const pool = streamPool(w.stream!);
    expect(ex.some((e) => Math.hypot(pool.x - e.x, pool.z - e.z) < e.radius)).toBe(true);
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

describe('streamDecorFor', () => {
  const streamOf = () => world().stream!;

  it('floats lily pads and blossoms inside the pool, deterministically', () => {
    const stream = streamOf();
    const pool = streamPool(stream);
    const a = streamDecorFor(stream);
    expect(streamDecorFor(stream)).toEqual(a);
    expect(a.pads.length).toBeGreaterThan(0);
    for (const pad of a.pads) {
      expect(Math.hypot(pad.x - pool.x, pad.z - pool.z)).toBeLessThanOrEqual(pool.halfWidth + 1e-9);
    }
    for (const b of a.blossoms) {
      expect(Math.hypot(b.x - pool.x, b.z - pool.z)).toBeLessThanOrEqual(pool.halfWidth + 1e-9);
    }
  });

  it('fringes reeds and cattails along the banks, always outside the water', () => {
    const stream = streamOf();
    const a = streamDecorFor(stream);
    expect(a.reeds.length).toBeGreaterThan(0);
    expect(a.cattails.length).toBeGreaterThan(0);
    for (const item of [...a.reeds, ...a.cattails]) {
      const s = closestOnStream(item.x, item.z, stream);
      expect(s.dist).toBeGreaterThanOrEqual(s.halfWidth - 1e-6);
    }
  });

  it('scatters pebbles and bank grass at the waterline, always out of the water', () => {
    const stream = streamOf();
    const a = streamDecorFor(stream);
    // Rejection sampling may drop the odd candidate that can't find dry footing.
    expect(a.pebbles.length).toBeGreaterThan(70 * 0.8);
    expect(a.pebbles.length).toBeLessThanOrEqual(70);
    expect(a.bankGrass.length).toBeGreaterThan(40 * 0.8);
    expect(a.bankGrass.length).toBeLessThanOrEqual(40);
    for (const item of [...a.pebbles, ...a.bankGrass]) {
      const s = closestOnStream(item.x, item.z, stream);
      expect(s.dist).toBeGreaterThanOrEqual(s.halfWidth - 1e-6);
    }
  });

  it('plants every bank item on dry ground (above the water level)', () => {
    const stream = streamOf();
    const a = streamDecorFor(stream);
    for (const item of [...a.reeds, ...a.cattails, ...a.pebbles, ...a.bankGrass]) {
      expect(groundHeightAt(item.x, item.z, stream)).toBeGreaterThanOrEqual(stream.level);
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

describe('blossomTrees', () => {
  it('is a sparse deterministic set sitting off the walkable meadow', () => {
    const w = world();
    const trees = blossomTrees(w);
    expect(blossomTrees(w)).toEqual(trees);
    expect(trees.length).toBeGreaterThan(0);
    expect(trees.length).toBeLessThanOrEqual(8);
    const b = w.bounds;
    for (const t of trees) {
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
