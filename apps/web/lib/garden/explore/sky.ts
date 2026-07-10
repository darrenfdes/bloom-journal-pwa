/**
 * Pure mappings from the 2D meadow's phase palettes (`PHASES`) and live weather onto plain
 * numbers/colors/vectors the 3D scene applies to sky, lights, and fog. No three.js imports —
 * everything here is unit-testable in jsdom.
 */
import type { WeatherCategory } from '@bloom/core/scene';

import { PHASES, type PhaseKey } from '@/lib/garden/bloom/phases';

export interface GradientStop {
  /** 0..1 from the top of the sky to the horizon. */
  offset: number;
  color: string;
}

/** Parses the `linear-gradient(180deg,#rrggbb N%,…)` strings used by `PHASES[*].sky`. */
export function parseCssLinearGradient(css: string): GradientStop[] {
  const stops: GradientStop[] = [];
  const re = /(#[0-9a-f]{6})\s+(\d+(?:\.\d+)?)%/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    stops.push({ offset: Number(m[2]) / 100, color: m[1]!.toLowerCase() });
  }
  return stops;
}

export interface PhaseLighting {
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  moonIntensity: number;
  /** Multiplied into billboard materials — mirrors the 2D `filter: brightness()` per phase. */
  flowerBrightness: number;
  fogColor: string;
}

/** Per-phase base intensities, hand-tuned to echo the 2D `filter` brightness values. */
const PHASE_LIGHT: Record<
  PhaseKey,
  { sun: number; hemi: number; moon: number; flower: number }
> = {
  dawn: { sun: 0.7, hemi: 0.55, moon: 0, flower: 0.97 },
  day: { sun: 1.0, hemi: 0.75, moon: 0, flower: 1 },
  golden: { sun: 0.85, hemi: 0.6, moon: 0, flower: 1.02 },
  dusk: { sun: 0.25, hemi: 0.4, moon: 0.08, flower: 0.88 },
  // Night is lifted well above the 2D `filter: brightness(.74)` so the moonlit meadow, fox and
  // trees stay legible in 3D — an unlit ground under a dark sky just reads as "broken".
  night: { sun: 0, hemi: 0.42, moon: 0.45, flower: 0.92 },
};

export const OVERCAST_GREY = '#9aa3ac';

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 0xff;
    const vb = (pb >> shift) & 0xff;
    return Math.round(va + (vb - va) * t);
  };
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}

// 3D-only snow anchors — value-copied from the 2D meadow's settled-snow blanket and
// SNOW_HILLS palette (components/garden/bloom/BloomMeadow.tsx) so both views whiten alike.
const SNOW_GROUND = '#e9eff7';
const SNOW_HILL_FAR = '#b6cde7';
const SNOW_HILL_NEAR = '#d3e2f3';

export function lightingForPhase(
  phase: PhaseKey,
  cloudCover = 0,
  category?: WeatherCategory,
): PhaseLighting {
  const palette = PHASES[phase];
  const base = PHASE_LIGHT[phase];
  const stops = parseCssLinearGradient(palette.sky);
  const mid = stops[1] ?? stops[0]!;
  const horizon = stops[stops.length - 1]!;
  const snow = category === 'snow';
  const fogColor = mixHex(horizon.color, OVERCAST_GREY, 0.35 * cloudCover);
  return {
    hemiSky: mid.color,
    // Snow bounces sky light back up off the blanket; the fog cools toward the snow blue-grey.
    hemiGround: snow ? mixHex(palette.grass, SNOW_GROUND, 0.6) : palette.grass,
    hemiIntensity: base.hemi,
    sunColor: palette.sun.core,
    sunIntensity: base.sun * (1 - 0.5 * cloudCover),
    moonIntensity: base.moon,
    flowerBrightness: base.flower,
    fogColor: snow ? mixHex(fogColor, SNOW_HILL_NEAR, 0.5) : fogColor,
  };
}

/** Cool tints the near-black night palette is mixed toward so the moonlit scene stays readable. */
const MOONLIT_GROUND = '#5b7d86';
const MOONLIT_HILL = '#46567a';

/**
 * Ground/grass colour the 3D terrain + grass use. Every phase but night returns the shared 2D
 * palette colour unchanged; night lifts it toward a moonlit teal so the meadow floor isn't a
 * black void under the dark sky (the 2D meadow leans on `filter: brightness()` we can't apply here).
 */
export function groundColorFor(phase: PhaseKey, category?: WeatherCategory): string {
  const grass = PHASES[phase].grass;
  // Snow mixes AFTER the night lift so a snowy night reads as moonlit blue-white, not grey.
  const base = phase === 'night' ? mixHex(grass, MOONLIT_GROUND, 0.5) : grass;
  return category === 'snow' ? mixHex(base, SNOW_GROUND, 0.78) : base;
}

/** Ridge colours (far→near) for the 3D mountain ring — lifted at night so the horizon reads. */
export function hillColorsFor(phase: PhaseKey, category?: WeatherCategory): [string, string] {
  const hills = PHASES[phase].hills;
  const base: [string, string] =
    phase === 'night'
      ? [mixHex(hills[2], MOONLIT_HILL, 0.4), mixHex(hills[1], MOONLIT_HILL, 0.4)]
      : [hills[2], hills[1]];
  if (category === 'snow') {
    return [mixHex(base[0], SNOW_HILL_FAR, 0.8), mixHex(base[1], SNOW_HILL_NEAR, 0.8)];
  }
  return base;
}

/**
 * Maps the 2D celestial screen position (x,y as 0..100 percentages, y = 0 at the sky's top)
 * onto a world unit vector pointing at the body. World axes: +x = east, −z = north. The arc
 * runs across the NORTHERN sky — the side the walker faces (flowers are north of spawn) — so
 * the visible sun and the directional light always agree. Rises east (right when facing the
 * flowers), sets west.
 */
export function sunDirectionAt(pos: { x: number; y: number }): { x: number; y: number; z: number } {
  const azimuth = ((70 - 140 * (pos.x / 100)) * Math.PI) / 180; // +70° east → −70° west
  const elevationDeg = Math.max(2, (1 - pos.y / 100) * 75);
  const elevation = (elevationDeg * Math.PI) / 180;
  return {
    x: Math.cos(elevation) * Math.sin(azimuth),
    y: Math.sin(elevation),
    z: -Math.cos(elevation) * Math.cos(azimuth),
  };
}

const FOG_RANGES: Record<WeatherCategory, { near: number; far: number }> = {
  clear: { near: 60, far: 260 },
  partly_cloudy: { near: 50, far: 220 },
  overcast: { near: 40, far: 160 },
  fog: { near: 5, far: 45 },
  drizzle: { near: 35, far: 140 },
  rain: { near: 30, far: 120 },
  heavy_rain: { near: 20, far: 90 },
  snow: { near: 25, far: 110 },
  thunderstorm: { near: 20, far: 90 },
};

export function fogRangeFor(category: WeatherCategory | undefined): { near: number; far: number } {
  return FOG_RANGES[category ?? 'clear'];
}

export function starOpacityFor(phase: PhaseKey): number {
  return PHASES[phase].stars;
}
