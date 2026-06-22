/**
 * Shared geometry for a tied bouquet, used by both the on-screen {@link BouquetArrangement} and the
 * standalone SVG/PNG builder so the two never drift. Flowers fan out from a single low tie point.
 */

import { xorshiftRand } from '@bloom/core/flowers/prng';

/** Degrees between adjacent stems in the fan; the whole fan is centred on the tie point. */
export const FAN_SPREAD_DEG = 15;

/** Shortest flower as a fraction of the tallest; the rest stagger between this and 1. */
export const MIN_HEIGHT_SCALE = 0.85; // subtle ~15% stagger

/** Each flower's box is this fraction of the arrangement's square size. */
export const FLOWER_SIZE_RATIO = 0.74;

/** The tie point sits this fraction of the size up from the bottom edge (room for the ribbon tails). */
export const TIE_BOTTOM_RATIO = 0.13;

/** Fan angles (degrees) for `n` flowers, symmetric around an upright centre stem. */
export function flowerAngles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * FAN_SPREAD_DEG);
}

/**
 * Per-flower height scale (0 < s ≤ 1) keyed to each flower's seed, so heads sit at staggered heights
 * while bases stay gathered at the tie. Scale-down only, so the tallest equals today's size and
 * nothing clips. A lone flower (or none) stays full size — staggering needs at least two. Shared by
 * the live preview and the PNG builder so the two never drift.
 */
export function flowerHeightScales(seeds: number[]): number[] {
  if (seeds.length < 2) return seeds.map(() => 1);
  return seeds.map((seed) => MIN_HEIGHT_SCALE + xorshiftRand(seed ^ 0x4f1b) * (1 - MIN_HEIGHT_SCALE));
}

/** The point where every stem gathers — bottom centre of the square. */
export function tiePoint(size: number): { x: number; y: number } {
  return { x: size / 2, y: size * (1 - TIE_BOTTOM_RATIO) };
}

/**
 * Horizontal offsets for `n` greenery accents, spread symmetrically around the tie point so they
 * frame the gather without crowding the centre stem. Returned as fractions of `size`; the caller
 * multiplies by `size`. Shared by the live preview and the PNG builder so the two never drift.
 */
export function greeneryOffsets(n: number): number[] {
  if (n <= 0) return [];
  // Fan accents symmetrically left/right of centre, endpoints at ±SPREAD regardless of count, so the
  // fuller greenery frames the flowers rather than hiding behind the central blooms.
  const SPREAD = 0.18;
  return Array.from({ length: n }, (_, i) => {
    if (n === 1) return 0;
    const t = (i - (n - 1) / 2) / ((n - 1) / 2); // normalised to -1 .. 1
    return t * SPREAD;
  });
}

/**
 * Fisher–Yates shuffle of flower ids. For two-or-more ids it guarantees a different order than the
 * input (rotates once if the shuffle happened to land on the identity), so a "reshuffle" tap always
 * visibly moves the flowers.
 */
export function shuffleOrder(ids: string[], rng: () => number = Math.random): string[] {
  if (ids.length < 2) return [...ids];
  const out = [...ids];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  const unchanged = out.every((id, i) => id === ids[i]);
  if (unchanged) out.push(out.shift()!);
  return out;
}
