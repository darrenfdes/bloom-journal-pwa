/**
 * Six mood-locked botanical palettes. Each palette exposes five petal
 * tiers (light highlight → deepest), a center color, pollen color, stem
 * and leaf colors. The bloom renderers consume these directly via
 * multi-stop SVG gradients.
 */
export type BloomMood =
  | 'joy'
  | 'calm'
  | 'love'
  | 'wistful'
  | 'restless'
  | 'hopeful'
  | 'dreamy'
  | 'anxious'
  | 'energized'
  | 'ecstatic';

export interface BloomPalette {
  petalHighlight: string;
  petalMid: string;
  petalWash: string;
  petalDark: string;
  petalDeepest: string;
  center: string;
  pollen: string;
  stem: string;
  leaf: string;
}

/**
 * Pumpkin easter-egg palette. Petal ramp = the yellow/orange squash flower
 * shown reference; fruit ramp = ripe pumpkin oranges. Used by the Pumpkin
 * bloom across all three maturation stages.
 */
export interface PumpkinPalette {
  petalHighlight: string;
  petalMid: string;
  petalDark: string;
  fruitHighlight: string;
  fruitMid: string;
  fruitDark: string;
  fruitDeepest: string;
  fruitGreen: string;
  stemBrown: string;
  tendril: string;
  leaf: string;
}

export const PUMPKIN_PALETTE: PumpkinPalette = {
  petalHighlight: '#FFE066',
  petalMid: '#F4A300',
  petalDark: '#C2780C',
  fruitHighlight: '#FFB04A',
  fruitMid: '#FF8A1E',
  fruitDark: '#D85B12',
  fruitDeepest: '#7E330A',
  fruitGreen: '#7FAE6A',
  stemBrown: '#5F4423',
  tendril: '#9CC07A',
  leaf: '#6E9A56',
};

export const BLOOM_PALETTES: Record<BloomMood, BloomPalette> = {
  joy: {
    petalHighlight: '#FFF4C2',
    petalMid: '#FFD964',
    petalWash: '#FFE8A3',
    petalDark: '#E8A93D',
    petalDeepest: '#B57820',
    center: '#7A4F12',
    pollen: '#FFC93C',
    stem: '#6B8A4E',
    leaf: '#8FB068',
  },
  calm: {
    petalHighlight: '#EDE3F5',
    petalMid: '#B8A4D8',
    petalWash: '#D4C4E8',
    petalDark: '#8A6FB0',
    petalDeepest: '#5B4480',
    center: '#4A3868',
    pollen: '#F2E8FA',
    stem: '#7A8A6B',
    leaf: '#94A582',
  },
  love: {
    petalHighlight: '#FFE0E4',
    petalMid: '#F0A5B4',
    petalWash: '#FAC5CE',
    petalDark: '#D26B82',
    petalDeepest: '#9A3F58',
    center: '#7A2E44',
    pollen: '#FFF0F2',
    stem: '#7E6868',
    leaf: '#A88787',
  },
  wistful: {
    petalHighlight: '#E3ECF5',
    petalMid: '#8FA6BE',
    petalWash: '#B8C8D8',
    petalDark: '#5F7894',
    petalDeepest: '#3D5470',
    center: '#2E4258',
    pollen: '#F0F5FA',
    stem: '#6E7C82',
    leaf: '#88959B',
  },
  restless: {
    petalHighlight: '#FFDCC2',
    petalMid: '#F08858',
    petalWash: '#FAB088',
    petalDark: '#C85530',
    petalDeepest: '#8C3318',
    center: '#5E220F',
    pollen: '#FFE0B8',
    stem: '#7A5A40',
    leaf: '#A4845C',
  },
  hopeful: {
    petalHighlight: '#E8F0DC',
    petalMid: '#A8C088',
    petalWash: '#C8D8A8',
    petalDark: '#728E5A',
    petalDeepest: '#48623A',
    center: '#34492A',
    pollen: '#F0F5DC',
    stem: '#5E7A48',
    leaf: '#8AA670',
  },
  // Dreamy — cosmos: airy blue-lilac petals around a small golden center.
  dreamy: {
    petalHighlight: '#EAF0FA',
    petalMid: '#9DBBE0',
    petalWash: '#C6D8F0',
    petalDark: '#6E92C4',
    petalDeepest: '#45638F',
    center: '#E8C44A',
    pollen: '#FFE89A',
    stem: '#7A8A6B',
    leaf: '#94A582',
  },
  // Anxious — aster: many fine muted-magenta petals around a yellow eye.
  anxious: {
    petalHighlight: '#F0DCEC',
    petalMid: '#C98FC0',
    petalWash: '#E0C0DC',
    petalDark: '#9A5C90',
    petalDeepest: '#6E3A66',
    center: '#E0B23C',
    pollen: '#FFD86B',
    stem: '#74806E',
    leaf: '#8E9A82',
  },
  // Energized — poppy: hot red-orange cupped petals around a dark core.
  energized: {
    petalHighlight: '#FFD0B0',
    petalMid: '#F2683E',
    petalWash: '#FFA070',
    petalDark: '#C83A1E',
    petalDeepest: '#8C1E0E',
    center: '#3A1206',
    pollen: '#2A0E04',
    stem: '#6E7A48',
    leaf: '#8AA060',
  },
  // Ecstatic — sunflower: radiant gold rays around a large dark seed disc.
  ecstatic: {
    petalHighlight: '#FFF0B0',
    petalMid: '#FFD23B',
    petalWash: '#FFE480',
    petalDark: '#E89A1E',
    petalDeepest: '#B5660C',
    center: '#5A3A12',
    pollen: '#FFD86B',
    stem: '#6B8A4E',
    leaf: '#8FB068',
  },
};
