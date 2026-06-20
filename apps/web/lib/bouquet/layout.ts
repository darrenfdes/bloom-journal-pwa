/**
 * Shared geometry for a tied bouquet, used by both the on-screen {@link BouquetArrangement} and the
 * standalone SVG/PNG builder so the two never drift. Flowers fan out from a single low tie point.
 */

/** Degrees between adjacent stems in the fan; the whole fan is centred on the tie point. */
export const FAN_SPREAD_DEG = 15;

/** Each flower's box is this fraction of the arrangement's square size. */
export const FLOWER_SIZE_RATIO = 0.74;

/** The tie point sits this fraction of the size up from the bottom edge (room for the ribbon tails). */
export const TIE_BOTTOM_RATIO = 0.13;

/** Fan angles (degrees) for `n` flowers, symmetric around an upright centre stem. */
export function flowerAngles(n: number): number[] {
  return Array.from({ length: n }, (_, i) => (i - (n - 1) / 2) * FAN_SPREAD_DEG);
}

/** The point where every stem gathers — bottom centre of the square. */
export function tiePoint(size: number): { x: number; y: number } {
  return { x: size / 2, y: size * (1 - TIE_BOTTOM_RATIO) };
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
