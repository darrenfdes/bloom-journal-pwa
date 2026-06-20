import type { BouquetPayload } from '@bloom/core';

/**
 * Poetic word lists in the project's gentle, nature voice. ~20 × ~20 ≈ 400 stems — enough variety
 * that distinct bouquets rarely collide, while a single bouquet always resolves to the same name.
 */
const ADJECTIVES = [
  'velvet', 'amber', 'twilight', 'gentle', 'golden', 'hushed', 'hazel', 'misty', 'willow', 'honey',
  'ember', 'dewy', 'pale', 'wild', 'sunlit', 'dappled', 'tender', 'faded', 'lilac', 'quiet',
] as const;

const NOUNS = [
  'meadow', 'grove', 'bloom', 'harvest', 'thicket', 'hollow', 'garden', 'orchard', 'blossom', 'petal',
  'fern', 'briar', 'clover', 'heather', 'bramble', 'dahlia', 'marigold', 'poppy', 'thistle', 'glade',
] as const;

/** FNV-1a 32-bit hash — small, stable, well-spread across short id strings. */
function hashId(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * A deterministic, poetic download name for a bouquet — `velvet-meadow.bloom` rather than a UUID
 * slug. Derived from `payload.id` so re-downloading the same bouquet always yields the same stem
 * (and the `.bloom` file and `.png` image of one bouquet share that stem, differing only by `ext`),
 * while different bouquets land on different words.
 */
export function bouquetFilename(payload: Pick<BouquetPayload, 'id'>, ext: string): string {
  const h = hashId(payload.id);
  const adj = ADJECTIVES[h % ADJECTIVES.length]!;
  const noun = NOUNS[Math.floor(h / ADJECTIVES.length) % NOUNS.length]!;
  return `${adj}-${noun}.${ext}`;
}
