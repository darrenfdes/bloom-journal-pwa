import type { Mood } from '../types';

export type MoodMeta = {
  id: Mood;
  label: string;
  emoji: string;
  description: string;
};

/** Moods shown in the picker. Ecstatic is easter-egg only (content / random surprise). */
export const MOODS: MoodMeta[] = [
  { id: 'joyful', label: 'Joyful', emoji: '☀️', description: 'Bright and open' },
  { id: 'peaceful', label: 'Peaceful', emoji: '🌿', description: 'Calm and balanced' },
  { id: 'dreamy', label: 'Dreamy', emoji: '☁️', description: 'Soft and layered' },
  { id: 'loved', label: 'Loved', emoji: '💗', description: 'Warm and full' },
  { id: 'melancholy', label: 'Melancholy', emoji: '🌧️', description: 'Quiet and reflective' },
  { id: 'energized', label: 'Energized', emoji: '🔥', description: 'Bold and vivid' },
  { id: 'grateful', label: 'Grateful', emoji: '🍑', description: 'Warm and grounded' },
  { id: 'anxious', label: 'Anxious', emoji: '🌫️', description: 'Tight and cool' },
];

const ECSTATIC_MOOD: MoodMeta = {
  id: 'ecstatic',
  label: 'Ecstatic',
  emoji: '🎃',
  description: 'Extremely happy and excited',
};

/** Lookup mood metadata including easter-egg-only moods (legacy entries). */
export function getMood(id: Mood | null | undefined): MoodMeta | undefined {
  if (!id) return undefined;
  return MOODS.find((m) => m.id === id) ?? (id === 'ecstatic' ? ECSTATIC_MOOD : undefined);
}

export const MOOD_COLORS: Record<
  Mood,
  { petal: string; petalAlt: string; center: string; stem: string; leaf: string; accent: string }
> = {
  joyful: {
    petal: '#F4C840',
    petalAlt: '#FFE07A',
    center: '#C8881F',
    stem: '#5F8050',
    leaf: '#7FAE6A',
    accent: '#FFF6B8',
  },
  ecstatic: {
    petal: '#FFB23A',
    petalAlt: '#FFE066',
    center: '#C25113',
    stem: '#5F8050',
    leaf: '#7FAE6A',
    accent: '#FFE7B8',
  },
  peaceful: {
    petal: '#86B98B',
    petalAlt: '#B3D5B0',
    center: '#4D7C4A',
    stem: '#3F6342',
    leaf: '#7FA67B',
    accent: '#D8ECCE',
  },
  dreamy: {
    petal: '#A88EC8',
    petalAlt: '#CDB8E2',
    center: '#6B4F94',
    stem: '#5A4E78',
    leaf: '#9A8DBE',
    accent: '#E8DAF5',
  },
  loved: {
    petal: '#D88080',
    petalAlt: '#EFB3B3',
    center: '#9C4848',
    stem: '#6B4848',
    leaf: '#C68585',
    accent: '#F8D6D6',
  },
  melancholy: {
    petal: '#6B90BE',
    petalAlt: '#9CB8D6',
    center: '#3F628A',
    stem: '#384C60',
    leaf: '#7E97B4',
    accent: '#D4E2EE',
  },
  energized: {
    petal: '#E47054',
    petalAlt: '#F4A088',
    center: '#A8472F',
    stem: '#76453C',
    leaf: '#D08878',
    accent: '#FFDCC8',
  },
  grateful: {
    petal: '#E0A567',
    petalAlt: '#F4CC95',
    center: '#9E6E2E',
    stem: '#6C5A3A',
    leaf: '#BC9866',
    accent: '#FFE8C0',
  },
  anxious: {
    petal: '#9B8FAF',
    petalAlt: '#C4BAD2',
    center: '#5F5478',
    stem: '#5A5266',
    leaf: '#A89EB8',
    accent: '#E4DCEC',
  },
};
