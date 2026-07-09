/**
 * Deterministic gentle terrain undulation for the explorable meadow, shared by the terrain mesh,
 * flower placement, and the walking camera so nothing ever floats or sinks. The stream carves a
 * channel into it — shallow at the creek, deep under the pool.
 *
 * Pure logic — no three.js, no React.
 */
import {
  FOX_FLOAT_SUBMERSION,
  POOL_BED_MAX_DROP,
  POOL_BED_MIN_DROP,
  POOL_HALF_WIDTH,
  STREAM_BLEND,
  STREAM_HALF_WIDTH,
  WADE_HALF_WIDTH,
} from './constants';
import { closestOnStream, type Stream } from './stream';

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

/** How far the streambed drops below the water surface — deeper where the channel is wider. */
function bedDropFor(halfWidth: number): number {
  const f = clamp01((halfWidth - STREAM_HALF_WIDTH) / (POOL_HALF_WIDTH - STREAM_HALF_WIDTH));
  return POOL_BED_MIN_DROP + f * (POOL_BED_MAX_DROP - POOL_BED_MIN_DROP);
}

export function groundHeightAt(x: number, z: number, stream: Stream | null = null): number {
  // Three fixed sines (wavelengths ~45/22/18 m, total amplitude ≤ 0.5 m) — no RNG, so the
  // ground is identical everywhere it's sampled.
  let h =
    0.22 * Math.sin(x * 0.14 + 1.3) +
    0.16 * Math.sin(z * 0.28 + 4.1) +
    0.12 * Math.sin((x + z) * 0.35 + 2.2);

  if (stream) {
    const s = closestOnStream(x, z, stream);
    const bed = stream.level - bedDropFor(s.halfWidth);
    const t = clamp01((s.dist - s.halfWidth) / STREAM_BLEND);
    const k = smoothstep(t); // 0 inside the channel → 1 past the blend ring
    h = bed + (h - bed) * k;
  }
  return h;
}

/**
 * The height the fox (and its follow camera) rest on: the water surface where the fox floats in
 * the deep pool, otherwise the ground/bed it wades or walks on.
 */
export function surfaceHeightAt(x: number, z: number, stream: Stream | null = null): number {
  if (stream) {
    const s = closestOnStream(x, z, stream);
    if (s.dist < s.halfWidth && s.halfWidth >= WADE_HALF_WIDTH) {
      return stream.level - FOX_FLOAT_SUBMERSION;
    }
  }
  return groundHeightAt(x, z, stream);
}
