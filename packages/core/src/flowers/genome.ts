import { MOOD_COLORS } from '../constants/moods';
import { foliageDensityForWordCount, pickFoliageVariant } from '../flowers/foliage';
import { appMoodToBloomMood } from '../flowers/moodBloom';
import { SeededRNG, hashString } from '../flowers/seeded-rng';
import type {
  EntryRecord,
  FlowerGenome,
  FlowerSpecies,
  Mood,
  PetalShape,
} from '../types';

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
    case 'joyful':
    case 'energized':
    case 'grateful':
      return 0.12;
    case 'melancholy':
    case 'anxious':
      return -0.1;
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
  };
}

export function createFlowerSeed(entryId: string): number {
  return hashString(entryId);
}
