/**
 * Mood → bloom mapping, ported from the Bloom Meadow reference (spec §5.2) and extended to
 * cover the app's 9th mood (`ecstatic`, which the reference folds into the joyful/daisy
 * family). Null/unknown moods fall back to lavender.
 */
import type { Mood } from '@bloom/core';

export type BloomKind = 'daisy' | 'lavender' | 'rose' | 'bluebell' | 'dahlia' | 'tulip' | 'pumpkin';

export interface MoodMeta {
  label: string;
  chip: string;
  bloom: Exclude<BloomKind, 'pumpkin'>;
}

export const MOODS: Record<Mood, MoodMeta> = {
  joyful: { label: 'Joyful', chip: '#e2a23b', bloom: 'daisy' },
  ecstatic: { label: 'Ecstatic', chip: '#e2a23b', bloom: 'daisy' },
  peaceful: { label: 'Peaceful', chip: '#8d80c2', bloom: 'lavender' },
  dreamy: { label: 'Dreamy', chip: '#7da4c8', bloom: 'lavender' },
  loved: { label: 'Loved', chip: '#d4708f', bloom: 'rose' },
  melancholy: { label: 'Melancholy', chip: '#7488ba', bloom: 'bluebell' },
  energized: { label: 'Energized', chip: '#dd7440', bloom: 'dahlia' },
  anxious: { label: 'Anxious', chip: '#b56f9f', bloom: 'dahlia' },
  grateful: { label: 'Grateful', chip: '#c98a40', bloom: 'tulip' },
  // Positive & up
  hopeful: { label: 'Hopeful', chip: '#8aa86a', bloom: 'tulip' },
  excited: { label: 'Excited', chip: '#e8632e', bloom: 'dahlia' },
  // Calm
  content: { label: 'Content', chip: '#8fae8a', bloom: 'lavender' },
  // Low / apathetic (muted greys)
  apathetic: { label: 'Apathetic', chip: '#9a9c90', bloom: 'bluebell' },
  numb: { label: 'Numb', chip: '#9aa0a4', bloom: 'bluebell' },
  indifferent: { label: 'Indifferent', chip: '#a09e94', bloom: 'bluebell' },
  drained: { label: 'Drained', chip: '#8497a2', bloom: 'bluebell' },
  unmotivated: { label: 'Unmotivated', chip: '#909a9e', bloom: 'bluebell' },
  // Difficult
  irritated: { label: 'Irritated', chip: '#d9663e', bloom: 'dahlia' },
  overwhelmed: { label: 'Overwhelmed', chip: '#8a7c9c', bloom: 'dahlia' },
  lonely: { label: 'Lonely', chip: '#6f8aae', bloom: 'bluebell' },
  guilty: { label: 'Guilty', chip: '#62768e', bloom: 'bluebell' },
  angry: { label: 'Angry', chip: '#c23b2e', bloom: 'dahlia' },
  jealous: { label: 'Jealous', chip: '#8fa05a', bloom: 'dahlia' },
  cribby: { label: 'Cribby', chip: '#b98255', bloom: 'dahlia' },
};

export const FALLBACK_BLOOM: Exclude<BloomKind, 'pumpkin'> = 'lavender';
