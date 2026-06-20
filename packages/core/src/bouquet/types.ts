import type { FlowerGenome } from '../types';

export const BOUQUET_KIND = 'bloom-bouquet' as const;
export const BOUQUET_VERSION = 1 as const;
export const MAX_BOUQUET_FLOWERS = 5;

/** One picked flower. `genome` is a pure visual snapshot; text is included only when opted in. */
export interface BouquetFlower {
  genome: FlowerGenome;
  /** Original entry date, for display ("planted Mar 3"). */
  createdAt: string;
  title?: string | null;
  content?: string | null;
}

/**
 * Non-flower accents the sender chose to frame the tie point. Three reuse the rendered
 * foliage styles (reeds, sprigs, fern); two are bouquet-only (baby's breath, wheat). Stored on the
 * payload so kept/shared bouquets keep their accents. Optional for backwards compatibility.
 */
export type BouquetGreenery = 'reeds' | 'sprigs' | 'fern' | 'babys-breath' | 'wheat';

/** The serialized, shareable bouquet — identical shape for both link and file delivery. */
export interface BouquetPayload {
  kind: typeof BOUQUET_KIND;
  version: typeof BOUQUET_VERSION;
  id: string;
  createdAt: string;
  /** Who the bouquet is for (recipient). */
  to?: string | null;
  /** Who sent it (sender). */
  from?: string | null;
  note?: string | null;
  flowers: BouquetFlower[];
  /** Non-flower accents the sender chose to frame the tie, or `null` when none were picked. */
  greenery?: BouquetGreenery[] | null;
}
