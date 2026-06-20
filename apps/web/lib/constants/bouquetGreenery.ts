import type { BouquetGreenery } from '@bloom/core';

export type BouquetGreeneryMeta = {
  id: BouquetGreenery;
  label: string;
  description: string;
};

/**
 * Non-flower accents the sender can add to frame a bouquet's tie. Three reuse the rendered foliage
 * styles; two (baby's breath, wheat) are bouquet-only. Shown as single-select chips in the builder.
 */
export const BOUQUET_GREENERY: BouquetGreeneryMeta[] = [
  { id: 'reeds', label: 'Reeds', description: 'Tall slender blades' },
  { id: 'sprigs', label: 'Sprigs', description: 'Leafy forked shoots' },
  { id: 'fern', label: 'Fern', description: 'Feathered fronds' },
  { id: 'babys-breath', label: "Baby's breath", description: 'Clusters of tiny white blossoms' },
  { id: 'wheat', label: 'Wheat', description: 'Golden grain stalks' },
];
