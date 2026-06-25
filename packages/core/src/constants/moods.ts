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
  // Positive & up
  { id: 'hopeful', label: 'Hopeful', emoji: '🌱', description: 'Looking up' },
  { id: 'excited', label: 'Excited', emoji: '🤩', description: 'Buzzing with anticipation' },
  // Calm
  { id: 'content', label: 'Content', emoji: '😌', description: 'Settled and satisfied' },
  // Low / apathetic
  { id: 'apathetic', label: 'Apathetic', emoji: '😶', description: 'Flat and uninterested' },
  { id: 'numb', label: 'Numb', emoji: '🫥', description: 'Empty and detached' },
  { id: 'indifferent', label: 'Indifferent', emoji: '😐', description: 'Take it or leave it' },
  { id: 'drained', label: 'Drained', emoji: '🪫', description: 'Low and depleted' },
  { id: 'unmotivated', label: 'Unmotivated', emoji: '🥱', description: 'No drive to start' },
  // Difficult
  { id: 'irritated', label: 'Irritated', emoji: '😠', description: 'Annoyed and on edge' },
  { id: 'overwhelmed', label: 'Overwhelmed', emoji: '😩', description: 'Too much at once' },
  { id: 'lonely', label: 'Lonely', emoji: '🥀', description: 'Alone and disconnected' },
  { id: 'guilty', label: 'Guilty', emoji: '😔', description: 'Weighed down by regret' },
];

/** A labelled group of moods, used to lay the picker out in scannable sections. */
export type MoodCategory = { id: string; label: string; moods: Mood[] };

/**
 * Picker grouping + order — the single source of truth the web `MoodPicker`
 * iterates. Every pickable mood appears exactly once; `ecstatic` is omitted
 * (easter-egg only). Keep in sync with {@link MOODS}.
 */
export const MOOD_CATEGORIES: MoodCategory[] = [
  {
    id: 'positive',
    label: 'Positive & up',
    moods: ['joyful', 'grateful', 'loved', 'energized', 'hopeful', 'excited'],
  },
  { id: 'calm', label: 'Calm', moods: ['peaceful', 'dreamy', 'content'] },
  {
    id: 'low',
    label: 'Low & apathetic',
    moods: ['apathetic', 'numb', 'indifferent', 'drained', 'unmotivated'],
  },
  {
    id: 'difficult',
    label: 'Difficult',
    moods: ['melancholy', 'anxious', 'irritated', 'overwhelmed', 'lonely', 'guilty'],
  },
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
  // Positive & up — share the warm/bright bloom families.
  hopeful: {
    petal: '#A8C078',
    petalAlt: '#C8DBA0',
    center: '#5E7A3A',
    stem: '#5E7A48',
    leaf: '#8AA670',
    accent: '#E8F0DC',
  },
  excited: {
    petal: '#F2683E',
    petalAlt: '#FFA070',
    center: '#A8331A',
    stem: '#6E7A48',
    leaf: '#8AA060',
    accent: '#FFD0B0',
  },
  // Calm
  content: {
    petal: '#9DB89A',
    petalAlt: '#C2D6BE',
    center: '#5E7C56',
    stem: '#5E7A52',
    leaf: '#86A07C',
    accent: '#DDEAD6',
  },
  // Low / apathetic — muted, desaturated greys.
  apathetic: {
    petal: '#A6A89C',
    petalAlt: '#C4C6BC',
    center: '#6E7064',
    stem: '#6B7264',
    leaf: '#919486',
    accent: '#D8DAD0',
  },
  numb: {
    petal: '#A2A6AA',
    petalAlt: '#C2C6CA',
    center: '#6A6E72',
    stem: '#6E7276',
    leaf: '#8C9094',
    accent: '#D6DADE',
  },
  indifferent: {
    petal: '#ABA89E',
    petalAlt: '#C8C6BE',
    center: '#71705F',
    stem: '#706E62',
    leaf: '#94927F',
    accent: '#DAD8CE',
  },
  drained: {
    petal: '#8FA0AC',
    petalAlt: '#B4C2CC',
    center: '#566570',
    stem: '#5E6A70',
    leaf: '#828F96',
    accent: '#D2DCE2',
  },
  unmotivated: {
    petal: '#94A0A4',
    petalAlt: '#B8C2C6',
    center: '#5C666A',
    stem: '#646E70',
    leaf: '#868F92',
    accent: '#D4DCDE',
  },
  // Difficult
  irritated: {
    petal: '#D9663E',
    petalAlt: '#EE9268',
    center: '#8C3318',
    stem: '#7A5A40',
    leaf: '#A4845C',
    accent: '#FFD0B0',
  },
  overwhelmed: {
    petal: '#8E7FA0',
    petalAlt: '#B4A6C2',
    center: '#534768',
    stem: '#5A5266',
    leaf: '#9890A6',
    accent: '#DCD4E6',
  },
  lonely: {
    petal: '#6F8AAE',
    petalAlt: '#9CB2CE',
    center: '#3F5A78',
    stem: '#4C5C68',
    leaf: '#7E909E',
    accent: '#D2DEEA',
  },
  guilty: {
    petal: '#6A7E96',
    petalAlt: '#94A6BA',
    center: '#3C4E62',
    stem: '#46525E',
    leaf: '#7A8896',
    accent: '#CCD6E0',
  },
};
