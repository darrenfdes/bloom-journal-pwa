export type Mood =
  | 'joyful'
  | 'ecstatic'
  | 'peaceful'
  | 'dreamy'
  | 'loved'
  | 'melancholy'
  | 'energized'
  | 'grateful'
  | 'anxious';

export type Sentiment = 'positive' | 'negative' | 'neutral';

export type FlowerSpecies =
  | 'rose'
  | 'tulip'
  | 'daisy'
  | 'sunflower'
  | 'lily'
  | 'orchid'
  | 'peony'
  | 'carnation';

/** 0–4 meadow ground styles inspired by E Greet bouquet backgrounds */
export type GroundVariant = 0 | 1 | 2 | 3 | 4;

export type PetalShape = 'oval' | 'pointed' | 'wide';

/** x/y = stem base on the scroll canvas (ground contact); z = depth (higher = nearer). */
export interface GardenPosition {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
}

import type { FoliageVariant } from './flowers/foliage';
import type { BloomMood } from './flowers/moodPalettes';
import type { EntryWeatherSnapshot, TimePhase } from './scene/types';
import type { Season } from './theme/seasons';

export interface FlowerGenome {
  seed: number;
  /** @deprecated Retained for legacy DB compatibility; rendering uses `bloomMood`. */
  species: FlowerSpecies;
  mood: Mood;
  bloomMood: BloomMood;
  foliageVariant: FoliageVariant;
  foliageDensity: number;
  wordCount: number;
  petalCount: number;
  innerPetalCount: number;
  petalLayers: 1 | 2;
  petalShape: PetalShape;
  bloomOpenness: number;
  bloomSize: number;
  stamenCount: number;
  colorPalette: {
    petal: string;
    petalAlt: string;
    center: string;
    stem: string;
    leaf: string;
    accent: string;
  };
  leafCount: number;
  stemLean: number;
  hasInnerRing: boolean;
  hasRevisitBud: boolean;
  isFavourited: boolean;
  timeAccent: string;
  wiltFactor: number;
  fadeFactor: number;
  /** When set, render a special easter-egg bloom instead of `bloomMood`. */
  specialBloom?: 'pumpkin';
  /** Maturation stage for the pumpkin easter egg: 0=flower, 1=fruiting, 2=ripe. */
  pumpkinStage?: 0 | 1 | 2;
}

export interface EntryRecord {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  mood: Mood | null;
  inferredSentiment: Sentiment | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  flowerSeed: number;
  flowerStyle: string;
  gardenPosition: GardenPosition | null;
  isFavourited: boolean;
  revisitOf: string | null;
  isDeleted: boolean;
  weather?: EntryWeatherSnapshot | null;
  timePhase?: TimePhase | null;
  sceneSeason?: Season | null;
}

export interface GardenMeta {
  id: string;
  userId: string;
  theme: string;
  layoutMode: string;
  lastEntryAt: string | null;
  hasPlantedFirst: boolean;
  unlockedSeasons: string[];
  createdAt: string;
}

export interface AppSettings {
  biometricLock: boolean;
  pinEnabled: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
}

export interface WriteDraft {
  title: string;
  content: string;
  mood: Mood | null;
  tags: string[];
  createdAtOverride: string | null;
  revisitOf: string | null;
}

export type GardenFilter =
  | { type: 'all' }
  | { type: 'mood'; mood: Mood }
  | { type: 'month'; year: number; month: number };
