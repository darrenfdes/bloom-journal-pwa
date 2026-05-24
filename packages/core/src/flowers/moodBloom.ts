import type { BloomMood } from '../flowers/moodPalettes';
import type { Mood } from '../types';

/** One of six botanical bloom species, paired 1:1 with a visual mood. */
export type BloomSpecies = 'daisy' | 'lavender' | 'rose' | 'bluebell' | 'dahlia' | 'tulip';

export const BLOOM_FOR_MOOD: Record<BloomMood, BloomSpecies> = {
  joy: 'daisy',
  calm: 'lavender',
  love: 'rose',
  wistful: 'bluebell',
  restless: 'dahlia',
  hopeful: 'tulip',
};

export const BLOOM_MOODS: BloomMood[] = ['joy', 'calm', 'love', 'wistful', 'restless', 'hopeful'];

export const BLOOM_MOOD_LABEL: Record<BloomMood, string> = {
  joy: 'Joy',
  calm: 'Calm',
  love: 'Love',
  wistful: 'Wistful',
  restless: 'Restless',
  hopeful: 'Hopeful',
};

/**
 * Map the eight app moods onto the six visual blooms.
 * peaceful + dreamy share calm/lavender; energized + anxious share
 * restless/dahlia. Other moods are 1:1.
 */
export function appMoodToBloomMood(mood: Mood | null | undefined): BloomMood {
  switch (mood) {
    case 'joyful':
    case 'ecstatic':
      return 'joy';
    case 'peaceful':
    case 'dreamy':
      return 'calm';
    case 'loved':
      return 'love';
    case 'melancholy':
      return 'wistful';
    case 'energized':
    case 'anxious':
      return 'restless';
    case 'grateful':
      return 'hopeful';
    default:
      return 'calm';
  }
}
