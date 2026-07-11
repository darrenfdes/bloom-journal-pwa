/**
 * Riffles: spots where the creek narrows and the water breaks white. Deterministic sites along the
 * narrow runs of the stream, each dressed with a few shimmering foam blobs and a stone or two
 * poking above the surface. The view layer reads `foamPulse` each frame for the shimmer.
 *
 * Pure logic — no three.js, no React.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';

import { STREAM_HALF_WIDTH } from './constants';
import { closestOnStream, pointAlongStream, type Stream } from './stream';

/** Channel half-widths at or below this count as a riffle-able narrows. */
const RIFFLE_MAX_HALF_WIDTH = STREAM_HALF_WIDTH + 0.5;
/** Minimum arc-length-fraction separation between riffles. */
const MIN_T_GAP = 0.08;
/** The visible creek runs; the pool sits mid-stream between them. */
const CREEK_RUNS: readonly [number, number][] = [
  [0.12, 0.42],
  [0.58, 0.88],
];

export interface RiffleSite {
  t: number;
  x: number;
  z: number;
  halfWidth: number;
  tangent: { x: number; z: number };
}

/** Pick narrow-channel spots in the visible creek runs, spaced apart. Deterministic per seed. */
export function riffleSites(stream: Stream, seed: number, count = 3): RiffleSite[] {
  const rng = mulberry32(seed);
  const sites: RiffleSite[] = [];
  for (let attempt = 0; attempt < count * 12 && sites.length < count; attempt++) {
    const run = CREEK_RUNS[attempt % CREEK_RUNS.length]!;
    const t = run[0] + rng() * (run[1] - run[0]);
    const p = pointAlongStream(stream, t);
    if (p.halfWidth > RIFFLE_MAX_HALF_WIDTH) continue;
    if (sites.some((s) => Math.abs(s.t - t) < MIN_T_GAP)) continue;
    sites.push({ t, x: p.x, z: p.z, halfWidth: p.halfWidth, tangent: p.tangent });
  }
  return sites;
}

export interface FoamBlob {
  x: number;
  z: number;
  scale: number;
  phase: number;
}

/** Small white blobs scattered across the channel at each riffle, always inside the water. */
export function foamBlobs(sites: RiffleSite[], stream: Stream, seed: number, perSite = 6): FoamBlob[] {
  const rng = mulberry32(seed);
  const blobs: FoamBlob[] = [];
  for (const site of sites) {
    for (let i = 0; i < perSite; i++) {
      // Left-hand normal of the downstream tangent.
      const nx = -site.tangent.z;
      const nz = site.tangent.x;
      const lat = (rng() * 2 - 1) * site.halfWidth * 0.7;
      const along = (rng() * 2 - 1) * 1.2;
      const x = site.x + nx * lat + site.tangent.x * along;
      const z = site.z + nz * lat + site.tangent.z * along;
      const s = closestOnStream(x, z, stream);
      if (s.dist >= s.halfWidth) continue;
      blobs.push({ x, z, scale: 0.5 + rng() * 0.7, phase: rng() * Math.PI * 2 });
    }
  }
  return blobs;
}

/** Closed-form shimmer for one blob; frozen at a mid pose under reduced motion. */
export function foamPulse(
  blob: FoamBlob,
  time: number,
  reducedMotion = false,
): { scale: number; opacity: number } {
  if (reducedMotion) return { scale: blob.scale, opacity: 0.45 };
  return {
    scale: blob.scale * (0.85 + 0.15 * Math.sin(time * 1.8 + blob.phase)),
    opacity: 0.35 + 0.2 * Math.sin(time * 2.6 + blob.phase * 1.7),
  };
}

export interface RiffleStone {
  x: number;
  z: number;
  scale: number;
  rotation: number;
}

/** 1–2 stones per riffle poking just above the water to sell the narrows. */
export function riffleStones(sites: RiffleSite[], seed: number): RiffleStone[] {
  const rng = mulberry32(seed);
  const stones: RiffleStone[] = [];
  for (const site of sites) {
    const n = 1 + (rng() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const nx = -site.tangent.z;
      const nz = site.tangent.x;
      const lat = (rng() * 2 - 1) * site.halfWidth * 0.55;
      stones.push({
        x: site.x + nx * lat,
        z: site.z + nz * lat,
        scale: 0.22 + rng() * 0.22,
        rotation: rng() * Math.PI * 2,
      });
    }
  }
  return stones;
}
