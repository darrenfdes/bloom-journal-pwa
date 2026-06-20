import {
  BOUQUET_KIND,
  BOUQUET_VERSION,
  MAX_BOUQUET_FLOWERS,
  type BouquetGreenery,
  type BouquetPayload,
} from './types';

const REJECT = 'That doesn’t look like a Bloom bouquet.';

const GREENERY_KINDS: readonly BouquetGreenery[] = [
  'reeds',
  'sprigs',
  'fern',
  'babys-breath',
  'wheat',
];

export function serializeBouquet(bouquet: BouquetPayload): string {
  return JSON.stringify(bouquet);
}

/** Parse + validate an incoming bouquet (from a link blob or a `.bloom` file). */
export function parseBouquet(json: string): BouquetPayload {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error(REJECT);
  }
  return validateBouquet(raw);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Light structural check — enough to trust the payload renders without crashing. */
export function validateBouquet(raw: unknown): BouquetPayload {
  if (!isRecord(raw)) throw new Error(REJECT);
  if (raw.kind !== BOUQUET_KIND) throw new Error(REJECT);
  if (raw.version !== BOUQUET_VERSION) throw new Error(REJECT);
  if (!Array.isArray(raw.flowers)) throw new Error(REJECT);
  if (raw.flowers.length < 1 || raw.flowers.length > MAX_BOUQUET_FLOWERS) {
    throw new Error(REJECT);
  }
  for (const flower of raw.flowers) {
    if (!isRecord(flower) || !isRecord(flower.genome)) throw new Error(REJECT);
    const g = flower.genome;
    if (
      typeof g.seed !== 'number' ||
      typeof g.bloomMood !== 'string' ||
      typeof g.foliageVariant !== 'number' ||
      typeof g.wordCount !== 'number'
    ) {
      throw new Error(REJECT);
    }
  }
  if (raw.greenery !== undefined && raw.greenery !== null) {
    if (!Array.isArray(raw.greenery)) throw new Error(REJECT);
    for (const g of raw.greenery) {
      if (typeof g !== 'string' || !GREENERY_KINDS.includes(g as BouquetGreenery)) {
        throw new Error(REJECT);
      }
    }
  }
  return raw as unknown as BouquetPayload;
}
