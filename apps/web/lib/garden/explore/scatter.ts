/**
 * Deterministic scatter placement for meadow scenery — trees, bushes, rocks, pond decor.
 * All placement is mulberry32-seeded and rejection-sampled around exclusion zones (flowers,
 * ponds, the spawn point) so the same world always produces the same layout.
 *
 * Pure logic — no three.js, no React.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';

import type { ExploreWorld, Pond } from './world-layout';

export interface ScatterItem {
  x: number;
  z: number;
  scale: number;
  rotation: number;
  variant: number;
}

export interface Exclusion {
  x: number;
  z: number;
  radius: number;
}

export interface Band {
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
}

/** Trees sit at least this far outside the walkable bounds — beyond the follow camera's reach. */
export const TREE_MARGIN = 6;
const TREE_DEPTH = 13;

function excluded(x: number, z: number, exclusions: readonly Exclusion[]): boolean {
  for (const e of exclusions) {
    if (Math.hypot(x - e.x, z - e.z) < e.radius) return true;
  }
  return false;
}

export function scatterInBand(opts: {
  seed: number;
  count: number;
  band: Band;
  minScale: number;
  maxScale: number;
  variants: number;
  exclusions?: readonly Exclusion[];
}): ScatterItem[] {
  const { seed, count, band, minScale, maxScale, variants, exclusions = [] } = opts;
  const rng = mulberry32(seed);
  const items: ScatterItem[] = [];
  let guard = 0;
  while (items.length < count && guard++ < count * 6) {
    const x = band.xMin + rng() * (band.xMax - band.xMin);
    const z = band.zMin + rng() * (band.zMax - band.zMin);
    if (excluded(x, z, exclusions)) continue;
    items.push({
      x,
      z,
      scale: minScale + rng() * (maxScale - minScale),
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * variants),
    });
  }
  return items;
}

export function scatterInRing(opts: {
  seed: number;
  count: number;
  cx: number;
  cz: number;
  rMin: number;
  rMax: number;
  minScale: number;
  maxScale: number;
  variants: number;
}): ScatterItem[] {
  const { seed, count, cx, cz, rMin, rMax, minScale, maxScale, variants } = opts;
  const rng = mulberry32(seed);
  const items: ScatterItem[] = [];
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const r = rMin + rng() * (rMax - rMin);
    items.push({
      x: cx + Math.cos(angle) * r,
      z: cz + Math.sin(angle) * r,
      scale: minScale + rng() * (maxScale - minScale),
      rotation: rng() * Math.PI * 2,
      variant: Math.floor(rng() * variants),
    });
  }
  return items;
}

/** Circles the fox should not spawn scenery on top of: flowers, ponds, and the spawn point. */
export function worldExclusions(
  world: ExploreWorld,
  o?: { flowerRadius?: number; pondBuffer?: number; spawnRadius?: number },
): Exclusion[] {
  const flowerRadius = o?.flowerRadius ?? 0.9;
  const pondBuffer = o?.pondBuffer ?? 1.5;
  const spawnRadius = o?.spawnRadius ?? 3;
  return [
    ...world.flowers.map((f) => ({ x: f.x, z: f.z, radius: flowerRadius })),
    ...world.ponds.map((p) => ({ x: p.x, z: p.z, radius: p.radius + pondBuffer })),
    { x: world.spawn.x, z: world.spawn.z, radius: spawnRadius },
  ];
}

/** Four tree frames wrapping the walkable meadow, each fully outside it by ≥ TREE_MARGIN. */
export function treeBands(world: ExploreWorld): Band[] {
  const b = world.bounds;
  const outerX = { xMin: b.minX - 8, xMax: b.maxX + 8 };
  return [
    // North (beyond −z)
    { ...outerX, zMin: b.minZ - TREE_MARGIN - TREE_DEPTH, zMax: b.minZ - TREE_MARGIN },
    // South (beyond +z)
    { ...outerX, zMin: b.maxZ + TREE_MARGIN, zMax: b.maxZ + TREE_MARGIN + TREE_DEPTH },
    // West
    { xMin: b.minX - TREE_MARGIN - TREE_DEPTH, xMax: b.minX - TREE_MARGIN, zMin: b.minZ - TREE_MARGIN, zMax: b.maxZ + TREE_MARGIN },
    // East
    { xMin: b.maxX + TREE_MARGIN, xMax: b.maxX + TREE_MARGIN + TREE_DEPTH, zMin: b.minZ - TREE_MARGIN, zMax: b.maxZ + TREE_MARGIN },
  ];
}

/** Thin bush strips just inside the north and south edges. Bushes are soft — no collision. */
export function bushBands(world: ExploreWorld): Band[] {
  const b = world.bounds;
  return [
    { xMin: b.minX, xMax: b.maxX, zMin: b.minZ, zMax: b.minZ + 1.5 },
    { xMin: b.minX, xMax: b.maxX, zMin: b.maxZ - 1.5, zMax: b.maxZ },
  ];
}

/**
 * Pond dressing: floating lily pads, a reed rim, tall cattails just outside the reeds, and a few
 * lily blossoms sitting on the inner pads. All rings are seeded off the pond index.
 */
export function pondDecorFor(
  pond: Pond,
  index: number,
): {
  pads: ScatterItem[];
  reeds: ScatterItem[];
  cattails: ScatterItem[];
  blossoms: ScatterItem[];
} {
  const seed = 600_000 + index * 1013;
  return {
    pads: scatterInRing({
      seed,
      count: 7,
      cx: pond.x,
      cz: pond.z,
      rMin: pond.radius * 0.15,
      rMax: pond.radius * 0.72,
      minScale: 0.7,
      maxScale: 1.3,
      variants: 1,
    }),
    reeds: scatterInRing({
      seed: seed + 7,
      count: 26,
      cx: pond.x,
      cz: pond.z,
      rMin: pond.radius * 0.95,
      rMax: pond.radius * 1.18,
      minScale: 0.8,
      maxScale: 1.35,
      variants: 1,
    }),
    cattails: scatterInRing({
      seed: seed + 31,
      count: 12,
      cx: pond.x,
      cz: pond.z,
      rMin: pond.radius * 1.02,
      rMax: pond.radius * 1.2,
      minScale: 0.9,
      maxScale: 1.4,
      variants: 1,
    }),
    blossoms: scatterInRing({
      seed: seed + 53,
      count: 5,
      cx: pond.x,
      cz: pond.z,
      rMin: pond.radius * 0.2,
      rMax: pond.radius * 0.62,
      minScale: 0.8,
      maxScale: 1.2,
      variants: 2,
    }),
  };
}

/** The walkable meadow as a single scatter band (floor cover + clutter live here). */
export function walkableBand(world: ExploreWorld): Band {
  const b = world.bounds;
  return { xMin: b.minX, xMax: b.maxX, zMin: b.minZ, zMax: b.maxZ };
}

/**
 * A distant forest edge — a ring of background conifers concentric with the mountain ring (which
 * sits at radius ~160/210 around the world centre), so it reads as depth between the meadow and
 * the hills. Any that land on the walkable meadow (possible for very wide gardens) are dropped.
 */
export function treelineRing(world: ExploreWorld): ScatterItem[] {
  const b = world.bounds;
  const ring = scatterInRing({
    seed: 745_001,
    count: 80,
    cx: world.widthM / 2,
    cz: -7,
    rMin: 118,
    rMax: 145,
    minScale: 2.4,
    maxScale: 4.2,
    variants: 1,
  });
  return ring.filter((t) => t.x < b.minX || t.x > b.maxX || t.z < b.minZ || t.z > b.maxZ);
}

/** Wildflower clumps (5 hue variants) and ferns strewn across the meadow floor, off the flowers. */
export function groundCoverScatter(
  world: ExploreWorld,
): { wildflowers: ScatterItem[]; ferns: ScatterItem[] } {
  const band = walkableBand(world);
  const exclusions = worldExclusions(world);
  const area = (band.xMax - band.xMin) * (band.zMax - band.zMin);
  return {
    wildflowers: scatterInBand({
      seed: 811_001,
      count: Math.min(300, Math.round(area * 0.14)),
      band,
      minScale: 0.6,
      maxScale: 1.2,
      variants: 5,
      exclusions,
    }),
    ferns: scatterInBand({
      seed: 811_777,
      count: Math.min(120, Math.round(area * 0.05)),
      band,
      minScale: 0.7,
      maxScale: 1.3,
      variants: 1,
      exclusions,
    }),
  };
}

/** Small ground clutter — mushrooms, fallen logs, stumps, pebbles — for close-up interest. */
export function clutterScatter(
  world: ExploreWorld,
): { mushrooms: ScatterItem[]; logs: ScatterItem[]; stumps: ScatterItem[]; pebbles: ScatterItem[] } {
  const band = walkableBand(world);
  const exclusions = worldExclusions(world);
  const area = (band.xMax - band.xMin) * (band.zMax - band.zMin);
  return {
    mushrooms: scatterInBand({
      seed: 821_001,
      count: Math.min(70, Math.round(area * 0.03)),
      band,
      minScale: 0.6,
      maxScale: 1.2,
      variants: 2,
      exclusions,
    }),
    logs: scatterInBand({
      seed: 821_333,
      count: Math.min(9, Math.round(area * 0.004)),
      band,
      minScale: 0.85,
      maxScale: 1.3,
      variants: 1,
      exclusions,
    }),
    stumps: scatterInBand({
      seed: 821_555,
      count: Math.min(7, Math.round(area * 0.003)),
      band,
      minScale: 0.7,
      maxScale: 1.1,
      variants: 1,
      exclusions,
    }),
    pebbles: scatterInBand({
      seed: 821_777,
      count: Math.min(100, Math.round(area * 0.05)),
      band,
      minScale: 0.5,
      maxScale: 1.2,
      variants: 2,
      exclusions,
    }),
  };
}
