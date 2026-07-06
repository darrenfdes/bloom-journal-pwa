/**
 * Detail layers for the explore sky — drifting clouds, sun/moon halos, star twinkle, horizon
 * haze — plus the phase palette for the tree canopies. Everything derives from the same two
 * live inputs the rest of the scene uses (phase + cloud cover), so weather and time of day
 * stay coherent. Pure logic — no three.js, no DOM.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';
import { PHASES, type PhaseKey } from '@/lib/garden/bloom/phases';

import { mixHex, OVERCAST_GREY, parseCssLinearGradient } from './sky';

export const CLOUD_MAX = 16;
export const CLOUD_FIELD_SEED = 552101;

export interface CloudSpec {
  /** Position on the sky dome (radians). */
  azimuth: number;
  elevation: number;
  /** World-units width of the puff sprite. */
  scale: number;
  /** Width/height ratio — clouds are wider than tall. */
  stretch: number;
  /** Azimuthal drift speed, rad/s (signed). */
  drift: number;
  /** Which of the puff texture variants to use. */
  variant: number;
  baseOpacity: number;
}

export function buildCloudField(seed: number, max: number): CloudSpec[] {
  const rng = mulberry32(seed);
  const clouds: CloudSpec[] = [];
  for (let i = 0; i < max; i++) {
    clouds.push({
      azimuth: rng() * Math.PI * 2,
      elevation: 0.12 + rng() * 0.43,
      scale: 55 + rng() * 75,
      stretch: 1.9 + rng() * 1.2,
      drift: (0.002 + rng() * 0.006) * (rng() < 0.5 ? -1 : 1),
      variant: Math.floor(rng() * 3),
      baseOpacity: 0.5 + rng() * 0.35,
    });
  }
  return clouds;
}

/** A few fair-weather clouds even on clear days, filling toward `max` as cover rises. */
export function visibleCloudCount(cloudCover: number, max = CLOUD_MAX): number {
  const cover = Math.min(1, Math.max(0, cloudCover));
  return Math.round(3 + (max - 3) * cover);
}

const CLOUD_TINT: Record<PhaseKey, string> = {
  dawn: '#f2d9c8',
  day: '#ffffff',
  golden: '#ffdcb0',
  dusk: '#a99bc0',
  night: '#46506e',
};

export function cloudTintFor(phase: PhaseKey): string {
  return CLOUD_TINT[phase];
}

/** Heavier cover reads as denser puffs, not just more of them. */
export function cloudOpacityFor(cloudCover: number, base: number): number {
  const cover = Math.min(1, Math.max(0, cloudCover));
  return base * (0.5 + 0.45 * cover);
}

const TWO_PI = Math.PI * 2;

export function driftedAzimuth(azimuth: number, drift: number, tSec: number): number {
  const a = (azimuth + drift * tSec) % TWO_PI;
  return a < 0 ? a + TWO_PI : a;
}

export interface HaloLayer {
  /** Multiplier on the sun sprite's own scale. */
  scaleMul: number;
  opacity: number;
}

/** Two soft additive rings behind the sun — biggest at the low golden/dawn sun. */
export function haloLayersFor(phase: PhaseKey): HaloLayer[] {
  const warm = phase === 'golden' || phase === 'dawn';
  return [
    { scaleMul: warm ? 2.8 : 2.2, opacity: warm ? 0.34 : 0.22 },
    { scaleMul: warm ? 5.2 : 4.0, opacity: warm ? 0.16 : 0.09 },
  ];
}

/** A band of ground-hugging atmosphere the ridge lines melt into. */
export function horizonHazeFor(
  phase: PhaseKey,
  cloudCover: number,
): { color: string; opacity: number } {
  const stops = parseCssLinearGradient(PHASES[phase].sky);
  const horizon = stops[stops.length - 1]!.color;
  const cover = Math.min(1, Math.max(0, cloudCover));
  return {
    color: mixHex(horizon, OVERCAST_GREY, 0.35 * cover),
    opacity: 0.5 + 0.25 * cover,
  };
}

/** Layer frequencies/phases are co-prime-ish so the three buckets never pulse together. */
const TWINKLE = [
  { omega: 0.9, phi: 0 },
  { omega: 1.4, phi: 2.1 },
  { omega: 2.2, phi: 4.4 },
] as const;

export function twinkleOpacity(base: number, layer: 0 | 1 | 2, tSec: number): number {
  if (base <= 0) return 0;
  const { omega, phi } = TWINKLE[layer];
  return base * (0.72 + 0.28 * Math.sin(tSec * omega + phi));
}

/** Tree/bush colors per phase — canopies sit near the phase's hill/grass palette. */
const TREE_PALETTE: Record<PhaseKey, { canopy: string; canopyAlt: string; trunk: string }> = {
  dawn: { canopy: '#5d7a55', canopyAlt: '#6d8a60', trunk: '#6e5741' },
  day: { canopy: '#4e7a46', canopyAlt: '#5f8b52', trunk: '#6e5741' },
  golden: { canopy: '#5e7a48', canopyAlt: '#728756', trunk: '#6b523c' },
  dusk: { canopy: '#3d5340', canopyAlt: '#48604a', trunk: '#4c4136' },
  night: { canopy: '#26382f', canopyAlt: '#2e4238', trunk: '#35302a' },
};

export function treePaletteFor(phase: PhaseKey): { canopy: string; canopyAlt: string; trunk: string } {
  return TREE_PALETTE[phase];
}
