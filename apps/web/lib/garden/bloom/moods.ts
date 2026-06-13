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
};

export const FALLBACK_BLOOM: Exclude<BloomKind, 'pumpkin'> = 'lavender';
