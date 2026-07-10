/**
 * Pure wind model for the 3D meadow's swaying vegetation. The GLSL chunk is spliced into the
 * standard three.js materials (see `components/garden/explore/wind-material.ts`); the strength
 * curve maps live weather onto a single scene-wide sway multiplier. No three.js imports.
 */
import type { WeatherCategory } from '@bloom/core/scene';

export interface WindPreset {
  /** Peak horizontal offset in metres at the plant tip (before instance scale). */
  amp: number;
  /** Base oscillation frequency in rad/s fed into the gust waves. */
  freq: number;
  /** Object-space height (m) at which sway saturates; the base at y=0 never moves. */
  yRef: number;
}

/**
 * Hand-tuned per-vegetation sway characters. `yRef` sits at (or just below) the tip for short
 * plants, and below the seed head for cattails so head + stalk saturate together instead of
 * shearing apart at the joint.
 */
export const WIND_PRESETS = {
  grass: { amp: 0.05, freq: 1.7, yRef: 0.24 },
  flowerbed: { amp: 0.03, freq: 1.4, yRef: 0.18 },
  reed: { amp: 0.09, freq: 1.1, yRef: 0.85 },
  canopy: { amp: 0.06, freq: 0.55, yRef: 1.8 },
} as const satisfies Record<string, WindPreset>;

export type WindPresetName = keyof typeof WIND_PRESETS;

/**
 * Vertex-shader chunk spliced after `#include <begin_vertex>`. Bends `transformed.xz` along the
 * wind direction by two summed travelling sine waves phased by the instance's world position
 * (`instanceMatrix[3].xz` — free, no extra attributes), so gusts roll across the meadow instead
 * of every plant wobbling in lockstep. The height factor clamp(y/yRef,0,1)² pins the base to the
 * ground and keeps low vertices stiff.
 */
export const WIND_SWAY_GLSL = /* glsl */ `
#ifdef USE_INSTANCING
  vec2 windWorld = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
#else
  vec2 windWorld = vec2(0.0);
#endif
float windHeight = clamp( transformed.y / uSwayYRef, 0.0, 1.0 );
windHeight *= windHeight;
float windWave = sin(uWindTime * uSwayFreq + windWorld.x * 0.35 + windWorld.y * 0.27)
  + 0.5 * sin(uWindTime * uSwayFreq * 2.33 + windWorld.x * 0.9 - windWorld.y * 0.4);
vec2 windOffset = uWindDir * (windWave * uSwayAmp * uWindStrength * windHeight);
transformed.x += windOffset.x;
transformed.z += windOffset.y;
`;

/** Uniform declarations the chunk needs, spliced after `#include <common>`. */
export const WIND_SWAY_UNIFORMS_GLSL = /* glsl */ `
uniform float uWindTime;
uniform float uWindStrength;
uniform vec2 uWindDir;
uniform float uSwayAmp;
uniform float uSwayFreq;
uniform float uSwayYRef;
`;

/** Baseline sway per weather mood — storms thrash, fog and snowfall hang still. */
const CATEGORY_BASE: Record<WeatherCategory, number> = {
  clear: 0.55,
  partly_cloudy: 0.6,
  overcast: 0.7,
  fog: 0.3,
  drizzle: 0.8,
  rain: 1.0,
  heavy_rain: 1.4,
  snow: 0.35,
  thunderstorm: 1.6,
};

/**
 * Scene-wide sway multiplier, 0..2. Rides the live Open-Meteo wind speed (km/h) on top of the
 * category baseline so a blustery clear day still moves and a still storm doesn't overdo it.
 */
export function windStrengthFor(category: WeatherCategory | undefined, windSpeed: number): number {
  const base = CATEGORY_BASE[category ?? 'clear'];
  return Math.min(2, Math.max(0, base + Math.max(0, windSpeed) / 60));
}

/**
 * Representative wind speed (km/h) when the category comes from a dev `?weather=` override and
 * there is no live reading — mirrors `OVERRIDE_CLOUD` in `ExploreScene`.
 */
const OVERRIDE_WIND: Record<WeatherCategory, number> = {
  clear: 6,
  partly_cloudy: 10,
  overcast: 12,
  fog: 2,
  drizzle: 10,
  rain: 16,
  heavy_rain: 26,
  snow: 8,
  thunderstorm: 38,
};

export function windSpeedFallback(category: WeatherCategory): number {
  return OVERRIDE_WIND[category];
}
