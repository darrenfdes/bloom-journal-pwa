import { buildFlowerGenome } from '../flowers/genome';
import { createId } from '../id';
import type { EntryRecord, Mood } from '../types';
import {
  BOUQUET_KIND,
  BOUQUET_VERSION,
  MAX_BOUQUET_FLOWERS,
  type BouquetFlower,
  type BouquetGreenery,
  type BouquetPayload,
} from './types';

export interface BuildBouquetOptions {
  /** Entry ids whose words the sender chose to include; others stay visual-only. */
  includeTextFor?: Iterable<string>;
  /** Recipient name. */
  to?: string | null;
  /** Sender name. */
  from?: string | null;
  note?: string | null;
  /** Non-flower accents the sender chose to frame the tie. */
  greenery?: BouquetGreenery[];
}

/** A null mood still needs a renderable bloom; pick the calmest default. */
const DEFAULT_MOOD: Mood = 'peaceful';

/**
 * Gather up to {@link MAX_BOUQUET_FLOWERS} entries into a shareable bouquet. Each flower carries a
 * deterministic visual snapshot ({@link buildFlowerGenome}); the entry's words are attached only
 * for ids in `includeTextFor`. Genomes are built without wilt/fade-inducing options so a gifted
 * flower always renders fresh, regardless of the sender's journalling streak.
 */
export function buildBouquet(
  entries: EntryRecord[],
  options: BuildBouquetOptions = {},
): BouquetPayload {
  const selected = entries.slice(0, MAX_BOUQUET_FLOWERS);
  if (selected.length === 0) {
    throw new Error('A bouquet needs at least one flower.');
  }

  const includeText = new Set(options.includeTextFor ?? []);

  const flowers: BouquetFlower[] = selected.map((entry) => {
    const genome = buildFlowerGenome({ ...entry, mood: entry.mood ?? DEFAULT_MOOD });
    const flower: BouquetFlower = { genome, createdAt: entry.createdAt };
    if (includeText.has(entry.id)) {
      flower.title = entry.title;
      flower.content = entry.content;
    }
    return flower;
  });

  return {
    kind: BOUQUET_KIND,
    version: BOUQUET_VERSION,
    id: createId(),
    createdAt: new Date().toISOString(),
    to: options.to ?? null,
    from: options.from ?? null,
    note: options.note ?? null,
    greenery: options.greenery?.length ? [...options.greenery] : null,
    flowers,
  };
}
