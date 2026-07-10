/**
 * Detail layers for the explore sky — drifting clouds, sun/moon halos, star twinkle, horizon
 * haze — plus the phase palette for the tree canopies. Everything derives from the same two
 * live inputs the rest of the scene uses (phase + cloud cover), so weather and time of day
 * stay coherent. Pure logic — no three.js, no DOM.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';
import type { MoonTint } from '@/lib/garden/bloom/event-catalog';
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

export interface MoonDiscPalette {
  /** Disc radial gradient: lit highlight → body → darkened limb. */
  light: string;
  mid: string;
  limb: string;
  /** Crater/maria fill (CSS colour with its own alpha). */
  crater: string;
  /** Halo colour — hex for the classic moon, `rgb(r,g,b)` for a named-moon glow. */
  halo: string;
}

/**
 * Colours for the 3D moon disc/halo. Untinted (null) returns the classic cream disc the moon
 * has always used; a named full moon's `MoonTint` (Strawberry/Harvest/Hunter's, from the 2D
 * world-events catalog) retints disc, craters and halo alike.
 */
export function moonDiscPalette(tint: MoonTint | null): MoonDiscPalette {
  if (!tint) {
    return {
      light: '#fbf7ea',
      mid: '#efe9d4',
      limb: '#e2dcc4',
      crater: 'rgba(180,174,150,.35)',
      halo: '#dfe6f5',
    };
  }
  return {
    light: tint.light,
    mid: tint.mid,
    limb: tint.limb,
    crater: tint.crater,
    halo: `rgb(${tint.glow})`,
  };
}

/** Tree/bush base colors per phase — canopies sit near the phase's hill/grass palette. */
const TREE_PALETTE: Record<PhaseKey, { canopy: string; canopyAlt: string; trunk: string }> = {
  dawn: { canopy: '#5d7a55', canopyAlt: '#6d8a60', trunk: '#6e5741' },
  day: { canopy: '#4e7a46', canopyAlt: '#5f8b52', trunk: '#6e5741' },
  golden: { canopy: '#5e7a48', canopyAlt: '#728756', trunk: '#6b523c' },
  dusk: { canopy: '#3d5340', canopyAlt: '#48604a', trunk: '#4c4136' },
  // Lifted out of near-black so the framing trees still read as trees under moonlight.
  night: { canopy: '#37503f', canopyAlt: '#41594a', trunk: '#463e35' },
};

// Shade anchors the per-phase canopy is mixed toward to fake volume without extra lights:
// a warm-dark green for the shadowed underside, a sun-kissed yellow-green for the lit crown.
const CANOPY_SHADOW = '#1d2b17';
const CANOPY_SUN = '#cfe6a0';
// Birch bark tint (trunk mixed toward this) and the soft blossom base for the flowering accents.
const BARK_PALE = '#efe9dd';
const BLOSSOM_BASE = '#f4c9dd';
// Blossoms shade toward a warm plum (not the cold green canopy shadow) so they stay rosy, not muddy.
const BLOSSOM_SHADOW = '#7c4257';

export interface TreePalette {
  /** Mid green — the reference tone the shade layers are derived from. */
  canopy: string;
  /** Broadleaf mid tone. */
  canopyAlt: string;
  /** Shadowed lower foliage. */
  canopyDark: string;
  /** Sun-kissed crown highlight. */
  canopyLight: string;
  trunk: string;
  /** Pale birch trunk (still phase-tinted). */
  birchBark: string;
  /** Soft blossom pink, faintly phase-tinted, with its own dark→light layering. */
  blossom: string;
  blossomDark: string;
  blossomLight: string;
}

/**
 * Phase palette for the tree canopies. The base greens come from `TREE_PALETTE`; the dark/light
 * shades, pale birch bark and blossom tints are derived so the same graduation follows every phase
 * (including the lifted night values). Consumed only by `TreeField`.
 */
export function treePaletteFor(phase: PhaseKey): TreePalette {
  const base = TREE_PALETTE[phase];
  const blossom = mixHex(BLOSSOM_BASE, base.canopy, 0.1);
  return {
    canopy: base.canopy,
    canopyAlt: base.canopyAlt,
    canopyDark: mixHex(base.canopy, CANOPY_SHADOW, 0.4),
    canopyLight: mixHex(base.canopy, CANOPY_SUN, 0.3),
    trunk: base.trunk,
    birchBark: mixHex(base.trunk, BARK_PALE, 0.82),
    blossom,
    blossomDark: mixHex(blossom, BLOSSOM_SHADOW, 0.28),
    blossomLight: mixHex(blossom, '#ffffff', 0.3),
  };
}
