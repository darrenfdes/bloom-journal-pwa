import type { GroundVariant } from '../types';

/** Deterministic ground style from month + optional seed (E Greet has 5 grass backgrounds). */
export function computeGroundVariant(month: number, seed = 0): GroundVariant {
  return ((month * 7 + seed) % 5) as GroundVariant;
}

export type GroundStyle = {
  frontTop: string;
  frontBottom: string;
  midTop: string;
  midBottom: string;
  backTop: string;
  backBottom: string;
  haze: string;
};

const VARIANTS: GroundStyle[] = [
  // 0 meadow light
  {
    frontTop: 'rgba(168, 198, 130, 0.92)',
    frontBottom: 'rgba(142, 175, 108, 1)',
    midTop: 'rgba(155, 188, 118, 0.88)',
    midBottom: 'rgba(130, 165, 95, 0.95)',
    backTop: 'rgba(175, 205, 140, 0.6)',
    backBottom: 'rgba(150, 180, 115, 0.75)',
    haze: 'rgba(255, 247, 230, 0.08)',
  },
  // 1 lush
  {
    frontTop: 'rgba(118, 158, 88, 0.95)',
    frontBottom: 'rgba(92, 135, 68, 1)',
    midTop: 'rgba(105, 148, 78, 0.9)',
    midBottom: 'rgba(82, 125, 58, 0.96)',
    backTop: 'rgba(130, 170, 100, 0.65)',
    backBottom: 'rgba(105, 145, 78, 0.8)',
    haze: 'rgba(240, 252, 230, 0.06)',
  },
  // 2 wildflower
  {
    frontTop: 'rgba(148, 185, 110, 0.93)',
    frontBottom: 'rgba(125, 162, 92, 1)',
    midTop: 'rgba(138, 175, 102, 0.89)',
    midBottom: 'rgba(115, 152, 85, 0.94)',
    backTop: 'rgba(165, 200, 128, 0.62)',
    backBottom: 'rgba(140, 178, 105, 0.78)',
    haze: 'rgba(255, 248, 235, 0.1)',
  },
  // 3 deep grove
  {
    frontTop: 'rgba(72, 108, 58, 0.96)',
    frontBottom: 'rgba(55, 88, 45, 1)',
    midTop: 'rgba(65, 98, 52, 0.92)',
    midBottom: 'rgba(48, 78, 40, 0.97)',
    backTop: 'rgba(88, 120, 72, 0.68)',
    backBottom: 'rgba(70, 100, 58, 0.82)',
    haze: 'rgba(220, 235, 210, 0.05)',
  },
  // 4 golden hour
  {
    frontTop: 'rgba(195, 175, 95, 0.9)',
    frontBottom: 'rgba(175, 155, 78, 1)',
    midTop: 'rgba(185, 165, 88, 0.87)',
    midBottom: 'rgba(165, 145, 72, 0.93)',
    backTop: 'rgba(210, 190, 110, 0.58)',
    backBottom: 'rgba(190, 170, 95, 0.72)',
    haze: 'rgba(255, 240, 200, 0.12)',
  },
];

export function getGroundStyle(variant: GroundVariant): GroundStyle {
  return VARIANTS[variant]!;
}

export type GrassTuftParams = {
  densityMul: number;
  heightMin: number;
  heightMax: number;
  widthMin: number;
  widthMax: number;
  blossomChance: number;
};

const GRASS_PARAMS: GrassTuftParams[] = [
  { densityMul: 0.85, heightMin: 6, heightMax: 16, widthMin: 2, widthMax: 5, blossomChance: 0.25 },
  { densityMul: 1.15, heightMin: 10, heightMax: 24, widthMin: 3, widthMax: 8, blossomChance: 0.3 },
  { densityMul: 1, heightMin: 8, heightMax: 20, widthMin: 3, widthMax: 7, blossomChance: 0.55 },
  { densityMul: 1.05, heightMin: 9, heightMax: 22, widthMin: 3, widthMax: 7, blossomChance: 0.15 },
  { densityMul: 0.9, heightMin: 7, heightMax: 18, widthMin: 2, widthMax: 6, blossomChance: 0.35 },
];

export function getGrassTuftParams(variant: GroundVariant): GrassTuftParams {
  return GRASS_PARAMS[variant]!;
}
