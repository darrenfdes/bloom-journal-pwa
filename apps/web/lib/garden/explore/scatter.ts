/**
 * Deterministic scatter placement for meadow scenery — trees, bushes, rocks, stream decor.
 * All placement is mulberry32-seeded and rejection-sampled around exclusion zones (flowers,
 * the stream, the spawn point) so the same world always produces the same layout.
 *
 * Pure logic — no three.js, no React.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';

import { closestOnStream, pointAlongStream, type Stream } from './stream';
import { groundHeightAt } from './terrain';
import type { ExploreWorld } from './world-layout';

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

/** How many circles trace the stream channel — enough to overlap and fully cover it. */
const STREAM_EXCLUSION_SAMPLES = 40;

/** Overlapping circles tracing the whole channel, so scenery never lands in the water. */
export function streamExclusions(stream: Stream, buffer: number): Exclusion[] {
  const out: Exclusion[] = [];
  for (let i = 0; i <= STREAM_EXCLUSION_SAMPLES; i++) {
    const p = pointAlongStream(stream, i / STREAM_EXCLUSION_SAMPLES);
    out.push({ x: p.x, z: p.z, radius: p.halfWidth + buffer });
  }
  return out;
}

/** Circles the fox should not spawn scenery on top of: flowers, the stream, and the spawn point. */
export function worldExclusions(
  world: ExploreWorld,
  o?: { flowerRadius?: number; streamBuffer?: number; spawnRadius?: number },
): Exclusion[] {
  const flowerRadius = o?.flowerRadius ?? 0.9;
  const streamBuffer = o?.streamBuffer ?? 1.2;
  const spawnRadius = o?.spawnRadius ?? 3;
  return [
    ...world.flowers.map((f) => ({ x: f.x, z: f.z, radius: flowerRadius })),
    ...(world.stream ? streamExclusions(world.stream, streamBuffer) : []),
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

/**
 * A handful of flowering accent trees dotted through the same frame as the ordinary trees — always
 * outside the walkable meadow (they reuse `treeBands`), sparse (≤ 2 per band), and deterministic.
 */
export function blossomTrees(world: ExploreWorld): ScatterItem[] {
  const exclusions = worldExclusions(world);
  return treeBands(world).flatMap((band, i) =>
    scatterInBand({
      seed: 743_101 + i * 17,
      count: 2,
      band,
      minScale: 1.3,
      maxScale: 2.2,
      variants: 1,
      exclusions,
    }),
  );
}

/** Thin bush strips just inside the north and south edges. Bushes are soft — no collision. */
export function bushBands(world: ExploreWorld): Band[] {
  const b = world.bounds;
  return [
    { xMin: b.minX, xMax: b.maxX, zMin: b.minZ, zMax: b.minZ + 1.5 },
    { xMin: b.minX, xMax: b.maxX, zMin: b.maxZ - 1.5, zMax: b.maxZ },
  ];
}

/** The widest point of the stream — the pool where lily pads and blossoms float. */
export function streamPool(stream: Stream): { x: number; z: number; halfWidth: number } {
  return stream.points.reduce((a, b) => (b.halfWidth > a.halfWidth ? b : a));
}

/**
 * Scatter items hugging the stream banks: pick an arc-length fraction, then step out along the
 * channel normal to one side by the local half-width plus a margin. Candidates that fall back
 * inside the channel (the inside of a bend) are rejected, so bank decor is always out of the water.
 * Kept within the visible span (t ∈ [0.1, 0.9]) so nothing is wasted off-map.
 */
export function streamBankScatter(
  stream: Stream,
  seed: number,
  count: number,
  offMin: number,
  offMax: number,
  minScale: number,
  maxScale: number,
  requireDry = false,
): ScatterItem[] {
  const rng = mulberry32(seed);
  const out: ScatterItem[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 10) {
    const p = pointAlongStream(stream, 0.1 + rng() * 0.8);
    // Left-hand normal of the downstream tangent (unit length).
    const nx = -p.tangent.z;
    const nz = p.tangent.x;
    const side = rng() < 0.5 ? 1 : -1;
    const off = p.halfWidth + offMin + rng() * (offMax - offMin);
    const scale = minScale + rng() * (maxScale - minScale);
    const rotation = rng() * Math.PI * 2;
    const x = p.x + nx * side * off;
    const z = p.z + nz * side * off;
    const s = closestOnStream(x, z, stream);
    if (s.dist < s.halfWidth + offMin * 0.5) continue; // fell into the water on a bend — retry
    // The carved bank stays below the water level for a stretch past the channel edge. Reeds and
    // cattails are happy standing in the shallows, but decor that must read as dry land (pebbles,
    // grass tufts) rejects submerged spots and gathers along the true waterline instead.
    if (requireDry && groundHeightAt(x, z, stream) < stream.level) continue;
    out.push({ x, z, scale, rotation, variant: 0 });
  }
  return out;
}

/**
 * Stream dressing: floating lily pads + open blossoms in the pool, a reed fringe hugging both
 * banks, tall cattails a little further out, pebbles right at the waterline, and short grass
 * tufts overhanging the edge. All bank decor keeps dry footing (the carved bank is submerged for
 * a stretch past the channel edge). Seeded deterministically off the pool position.
 */
export function streamDecorFor(stream: Stream): {
  pads: ScatterItem[];
  reeds: ScatterItem[];
  cattails: ScatterItem[];
  blossoms: ScatterItem[];
  pebbles: ScatterItem[];
  bankGrass: ScatterItem[];
} {
  const pool = streamPool(stream);
  const seed = 600_000 + Math.round(pool.x) * 13;
  return {
    pads: scatterInRing({
      seed,
      count: 7,
      cx: pool.x,
      cz: pool.z,
      rMin: pool.halfWidth * 0.15,
      rMax: pool.halfWidth * 0.72,
      minScale: 0.7,
      maxScale: 1.3,
      variants: 1,
    }),
    blossoms: scatterInRing({
      seed: seed + 53,
      count: 5,
      cx: pool.x,
      cz: pool.z,
      rMin: pool.halfWidth * 0.2,
      rMax: pool.halfWidth * 0.6,
      minScale: 0.8,
      maxScale: 1.2,
      variants: 2,
    }),
    reeds: streamBankScatter(stream, seed + 7, 34, 0.05, 1.6, 0.8, 1.35, true),
    cattails: streamBankScatter(stream, seed + 31, 16, 0.55, 2.2, 0.9, 1.4, true),
    pebbles: streamBankScatter(stream, seed + 89, 70, 0.3, 2.4, 0.35, 0.9, true),
    bankGrass: streamBankScatter(stream, seed + 97, 40, 0.3, 2.0, 0.8, 1.3, true),
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
      count: Math.min(180, Math.round(area * 0.09)),
      band,
      minScale: 0.6,
      maxScale: 1.2,
      variants: 5,
      exclusions,
    }),
    ferns: scatterInBand({
      seed: 811_777,
      count: Math.min(70, Math.round(area * 0.03)),
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
      count: Math.min(40, Math.round(area * 0.018)),
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
      count: Math.min(55, Math.round(area * 0.03)),
      band,
      minScale: 0.5,
      maxScale: 1.2,
      variants: 2,
      exclusions,
    }),
  };
}
