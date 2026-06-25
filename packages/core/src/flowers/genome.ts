import { differenceInDays, parseISO } from 'date-fns';

import { MOOD_COLORS } from '../constants/moods';
import { foliageDensityForWordCount, pickFoliageVariant } from '../flowers/foliage';
import { appMoodToBloomMood } from '../flowers/moodBloom';
import { SeededRNG, hashString } from '../flowers/seeded-rng';
import { matchesEcstaticContent } from '../sentiment/infer';
import type {
  EntryRecord,
  FlowerGenome,
  FlowerSpecies,
  Mood,
  PetalShape,
} from '../types';

/**
 * Decide whether an entry should render as the pumpkin easter egg. The
 * pumpkin is a rare surprise on the two happiest moods (joyful + ecstatic);
 * ecstatic otherwise shows the sunflower. Returns true if any rule matches:
 *   1. mood is `joyful`/`ecstatic` AND content contains an ecstatic keyword / `!!!`
 *   2. mood is `joyful`/`ecstatic` AND `seed % 10 === 0` (rare random surprise)
 */
export function resolvePumpkinTrigger(
  entry: { mood: Mood; content: string; flowerSeed: number; id: string }
): boolean {
  if (entry.mood !== 'joyful' && entry.mood !== 'ecstatic') return false;
  if (matchesEcstaticContent(entry.content)) return true;
  const seed = entry.flowerSeed || hashString(entry.id);
  return seed % 10 === 0;
}

/**
 * Map days-since-planted to a 3-stage pumpkin maturation:
 *   0–9   days → stage 0 (yellow flower)
 *   10–19 days → stage 1 (fruiting: petals shrinking, small green pumpkin)
 *   20+   days → stage 2 (ripe orange pumpkin)
 */
export function computePumpkinStage(createdAt: string, now: Date = new Date()): 0 | 1 | 2 {
  const days = differenceInDays(now, parseISO(createdAt));
  if (days >= 20) return 2;
  if (days >= 10) return 1;
  return 0;
}

function getTimeAccent(dateIso: string): string {
  const hour = new Date(dateIso).getHours();
  if (hour < 6) return '#C8D0E0';
  if (hour < 12) return '#FFF4D6';
  if (hour < 18) return '#FFE8D0';
  return '#E8D4EC';
}

const LAYERED_BAND_SPECIES: FlowerSpecies[] = [
  'peony',
  'tulip',
  'sunflower',
  'lily',
  'orchid',
  'carnation',
];

/**
 * Preserves legacy seed bands: daisy (<0.34), rose (was poppy), then subdivides
 * the old layered band among peony + 5 other species.
 */
function speciesFromSeed(rng: SeededRNG): FlowerSpecies {
  const roll = rng.next();
  if (roll < 0.34) return 'daisy';
  if (roll < 0.67) return 'rose';
  const sub = rng.next();
  return LAYERED_BAND_SPECIES[Math.floor(sub * LAYERED_BAND_SPECIES.length)]!;
}

function petalShapeForSpecies(species: FlowerSpecies, rng: SeededRNG): PetalShape {
  switch (species) {
    case 'daisy':
    case 'sunflower':
      return 'pointed';
    case 'rose':
    case 'tulip':
    case 'lily':
      return 'wide';
    case 'carnation':
      return rng.pick(['oval', 'pointed']);
    default:
      return rng.pick(['oval', 'pointed', 'wide']);
  }
}

function speciesPetalConfig(species: FlowerSpecies, rng: SeededRNG, hasTitle: boolean) {
  switch (species) {
    case 'daisy':
      return {
        petalCount: 10 + Math.floor(rng.next() * 5),
        innerPetalCount: 8,
        petalLayers: 2 as const,
        petalShape: 'pointed' as PetalShape,
      };
    case 'rose':
      return {
        petalCount: 5 + Math.floor(rng.next() * 3),
        innerPetalCount: 4 + Math.floor(rng.next() * 2),
        petalLayers: 2 as const,
        petalShape: 'wide' as PetalShape,
      };
    case 'tulip':
      return {
        petalCount: 6,
        innerPetalCount: 0,
        petalLayers: 1 as const,
        petalShape: 'wide' as PetalShape,
      };
    case 'sunflower':
      return {
        petalCount: 12 + Math.floor(rng.next() * 4),
        innerPetalCount: 0,
        petalLayers: 1 as const,
        petalShape: 'pointed' as PetalShape,
      };
    case 'lily':
      return {
        petalCount: 6,
        innerPetalCount: 0,
        petalLayers: 1 as const,
        petalShape: 'wide' as PetalShape,
      };
    case 'orchid':
      return {
        petalCount: 5,
        innerPetalCount: 0,
        petalLayers: 1 as const,
        petalShape: 'oval' as PetalShape,
      };
    case 'peony':
      return {
        petalCount: 8 + Math.floor(rng.next() * 5),
        innerPetalCount: 6 + (hasTitle ? 2 : 0),
        petalLayers: 2 as const,
        petalShape: petalShapeForSpecies('peony', rng),
      };
    case 'carnation':
      return {
        petalCount: 14 + Math.floor(rng.next() * 6),
        innerPetalCount: 0,
        petalLayers: 1 as const,
        petalShape: 'oval' as PetalShape,
      };
  }
}

function moodOpennessModifier(mood: Mood): number {
  switch (mood) {
    case 'ecstatic':
      return 0.18;
    case 'joyful':
    case 'energized':
    case 'grateful':
    case 'excited':
      return 0.12;
    case 'hopeful':
    case 'content':
      return 0.08;
    case 'melancholy':
    case 'anxious':
    case 'irritated':
    case 'overwhelmed':
    case 'lonely':
    case 'guilty':
      return -0.1;
    case 'apathetic':
    case 'numb':
    case 'indifferent':
    case 'drained':
    case 'unmotivated':
      return -0.12;
    case 'dreamy':
      return 0.05;
    default:
      return 0;
  }
}

export function computeBloomOpenness(
  wordCount: number,
  sentimentIntensity: number,
  mood: Mood
): number {
  const lengthFactor = Math.min(wordCount / 200, 1);
  const intensityFactor = Math.min(sentimentIntensity / 8, 1);
  const base = 0.55 + (lengthFactor * 0.3 + intensityFactor * 0.25);
  return Math.min(1, Math.max(0.45, base + moodOpennessModifier(mood)));
}

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function buildFlowerGenome(
  entry: Pick<
    EntryRecord,
    | 'id'
    | 'content'
    | 'mood'
    | 'title'
    | 'tags'
    | 'createdAt'
    | 'isFavourited'
    | 'revisitOf'
    | 'flowerSeed'
  > & { mood: Mood },
  options?: {
    daysSinceLastEntry?: number;
    entryIndex?: number;
    totalEntries?: number;
    streakFactor?: number;
    /** Override "now" for deterministic tests / gallery previews. */
    now?: Date;
  }
): FlowerGenome {
  const seed = entry.flowerSeed || hashString(entry.id);
  const rng = new SeededRNG(seed);
  const mood = entry.mood;
  const wordCount = countWords(entry.content);
  const sentimentIntensity = Math.abs(
    (entry.content.match(/!/g) ?? []).length +
      (entry.content.match(/\?/g) ?? []).length +
      wordCount / 40
  );

  const species = speciesFromSeed(rng);
  const hasTitle = Boolean(entry.title?.trim());
  const petalConfig = speciesPetalConfig(species, rng, hasTitle);

  const bloomOpenness = computeBloomOpenness(wordCount, sentimentIntensity, mood);
  const bloomSize = 1.1 + Math.min(wordCount / 220, 1) * 0.6;
  const leafCount = Math.min(entry.tags.length + 2, 6);
  const stemLean = (options?.streakFactor ?? 0.5) > 0.6 ? rng.range(-4, 4) : rng.range(-12, 8);
  const wiltFactor =
    options?.daysSinceLastEntry != null && options.daysSinceLastEntry > 3
      ? Math.min((options.daysSinceLastEntry - 3) * 0.08, 0.35)
      : 0;
  const fadeFactor =
    options?.entryIndex != null &&
    options?.totalEntries != null &&
    options.totalEntries > 30 &&
    options.entryIndex < options.totalEntries - 30
      ? 0.15
      : 0;

  const palette = MOOD_COLORS[mood];
  const stamenCount = 5 + Math.floor(rng.next() * 4);
  const bloomMood = appMoodToBloomMood(mood);
  const foliageVariant = pickFoliageVariant(seed, wordCount);
  const foliageDensity = foliageDensityForWordCount(wordCount);

  const isPumpkin = resolvePumpkinTrigger({
    mood,
    content: entry.content,
    flowerSeed: seed,
    id: entry.id,
  });
  const pumpkinStage = isPumpkin
    ? computePumpkinStage(entry.createdAt, options?.now)
    : undefined;

  return {
    seed,
    species,
    mood,
    bloomMood,
    foliageVariant,
    foliageDensity,
    wordCount,
    petalCount: petalConfig.petalCount,
    innerPetalCount: petalConfig.innerPetalCount,
    petalLayers: petalConfig.petalLayers,
    petalShape: petalConfig.petalShape,
    bloomOpenness,
    bloomSize,
    stamenCount,
    colorPalette: palette,
    leafCount,
    stemLean,
    hasInnerRing:
      hasTitle ||
      species === 'peony' ||
      species === 'daisy' ||
      species === 'rose' ||
      species === 'carnation',
    hasRevisitBud: Boolean(entry.revisitOf),
    isFavourited: entry.isFavourited,
    timeAccent: getTimeAccent(entry.createdAt),
    wiltFactor,
    fadeFactor,
    ...(isPumpkin ? { specialBloom: 'pumpkin' as const, pumpkinStage } : {}),
  };
}

export function createFlowerSeed(entryId: string): number {
  return hashString(entryId);
}
