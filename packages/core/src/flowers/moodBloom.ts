import type { BloomMood } from '../flowers/moodPalettes';
import type { Mood } from '../types';

/** Botanical bloom species, each paired 1:1 with a visual mood. */
export type BloomSpecies =
  | 'daisy'
  | 'lavender'
  | 'rose'
  | 'bluebell'
  | 'dahlia'
  | 'tulip'
  | 'cosmos'
  | 'aster'
  | 'poppy'
  | 'sunflower';

export const BLOOM_FOR_MOOD: Record<BloomMood, BloomSpecies> = {
  joy: 'daisy',
  calm: 'lavender',
  love: 'rose',
  wistful: 'bluebell',
  restless: 'dahlia',
  hopeful: 'tulip',
  dreamy: 'cosmos',
  anxious: 'aster',
  energized: 'poppy',
  ecstatic: 'sunflower',
};

export const BLOOM_MOODS: BloomMood[] = [
  'joy',
  'calm',
  'love',
  'wistful',
  'restless',
  'hopeful',
  'dreamy',
  'anxious',
  'energized',
  'ecstatic',
];

export const BLOOM_MOOD_LABEL: Record<BloomMood, string> = {
  joy: 'Joy',
  calm: 'Calm',
  love: 'Love',
  wistful: 'Wistful',
  restless: 'Restless',
  hopeful: 'Hopeful',
  dreamy: 'Dreamy',
  anxious: 'Anxious',
  energized: 'Energized',
  ecstatic: 'Ecstatic',
};

/**
 * Map the nine app moods onto the visual blooms. Each app mood now has its
 * own distinct bloom except joyful (joy/daisy) and peaceful (calm/lavender).
 * The legacy `restless`/dahlia bloom is no longer mapped to a mood (energized
 * → poppy, anxious → aster) but is kept for the flower gallery.
 */
export function appMoodToBloomMood(mood: Mood | null | undefined): BloomMood {
  switch (mood) {
    case 'joyful':
      return 'joy';
    case 'ecstatic':
      return 'ecstatic';
    case 'peaceful':
      return 'calm';
    case 'dreamy':
      return 'dreamy';
    case 'loved':
      return 'love';
    case 'melancholy':
      return 'wistful';
    case 'energized':
      return 'energized';
    case 'anxious':
      return 'anxious';
    case 'grateful':
      return 'hopeful';
    default:
      return 'calm';
  }
}
