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
  // Muted blooms reuse existing species' geometry with a desaturated palette.
  apathetic: 'aster',
  drained: 'bluebell',
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
  'apathetic',
  'drained',
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
  apathetic: 'Apathetic',
  drained: 'Drained',
};

/**
 * Map the app moods onto the visual blooms. Several feelings deliberately share
 * a bloom "family" look: the low/apathetic moods collapse onto the two muted
 * blooms, and a few additions reuse an existing flower (excited→energized,
 * content→calm, overwhelmed→anxious, lonely/guilty→wistful). `irritated`
 * finally puts the otherwise-unmapped `restless`/dahlia bloom to use.
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
    // Positive & up
    case 'hopeful':
      return 'hopeful';
    case 'excited':
      return 'energized';
    // Calm
    case 'content':
      return 'calm';
    // Low / apathetic
    case 'apathetic':
    case 'numb':
    case 'indifferent':
      return 'apathetic';
    case 'drained':
    case 'unmotivated':
      return 'drained';
    // Difficult
    case 'irritated':
      return 'restless';
    case 'overwhelmed':
      return 'anxious';
    case 'lonely':
    case 'guilty':
      return 'wistful';
    default:
      return 'calm';
  }
}
