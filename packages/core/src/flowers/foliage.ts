import { xorshiftRand } from '../flowers/prng';

/**
 * Eight foliage base styles painted behind the stem.
 *
 *  0 Tuft   1 Clump   2 Wild   3 Fern   4 Reeds
 *  5 Moss   6 Clover  7 Sprigs
 *
 * Selection is seeded but biased by entry word count: short entries pick
 * sparser bases (tuft, reeds, sprigs); long entries pick denser bases
 * (clump, wild, fern, moss); medium entries roll across all eight.
 */
export type FoliageVariant = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

export const FOLIAGE_NAMES: Record<FoliageVariant, string> = {
  0: 'Tuft',
  1: 'Clump',
  2: 'Wild',
  3: 'Fern',
  4: 'Reeds',
  5: 'Moss',
  6: 'Clover',
  7: 'Sprigs',
};

const SPARSE: FoliageVariant[] = [0, 4, 7];
const LUSH: FoliageVariant[] = [1, 2, 3, 5];

export function pickFoliageVariant(seed: number, wordCount: number): FoliageVariant {
  if (wordCount >= 150) {
    const idx = Math.floor(xorshiftRand(seed ^ 0x10551) * LUSH.length);
    return LUSH[idx]!;
  }
  if (wordCount < 15) {
    const idx = Math.floor(xorshiftRand(seed ^ 0x5043ce) * SPARSE.length);
    return SPARSE[idx]!;
  }
  const base = Math.floor(xorshiftRand(seed ^ 0xf01a6e) * 8);
  const bias = wordCount > 100 ? 1 : 0;
  return ((base + bias) % 8) as FoliageVariant;
}

/**
 * Density multiplier 0.6–1.4 scales blade count and opacity within a
 * variant. Longer entries grow lusher ground cover without changing the
 * variant itself.
 */
export function foliageDensityForWordCount(wordCount: number): number {
  const d = 0.6 + wordCount / 200;
  if (d < 0.6) return 0.6;
  if (d > 1.4) return 1.4;
  return d;
}
