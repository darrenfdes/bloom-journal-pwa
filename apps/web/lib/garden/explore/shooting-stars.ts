/**
 * Occasional night shooting stars for the 3D sky — scheduling, dome geometry and the fade
 * envelope. Pure closed-form over normalized flight time; the sprite/line rendering lives in
 * `components/garden/explore/ShootingStars.tsx`.
 */
import { isPrecipitatingCategory, type WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';

import { starOpacityFor } from './sky';

export interface Streak {
  /** Start point on the dome (radians). */
  azimuth: number;
  elevation: number;
  /** Travel direction across the dome (radians; vertical component always falls). */
  heading: number;
  /** Angular length of the whole flight (radians). */
  arcLen: number;
  durSec: number;
}

export interface StreakPose {
  head: { x: number; y: number; z: number };
  tail: { x: number; y: number; z: number };
  opacity: number;
}

/** Streaks only cross skies that actually show stars, and never through cloud or weather. */
export function shootingStarsAllowed(
  phase: PhaseKey,
  cloudCover: number,
  category: WeatherCategory | undefined,
): boolean {
  if (starOpacityFor(phase) < 0.5) return false;
  if (cloudCover >= 0.6) return false;
  if (isPrecipitatingCategory(category) || category === 'snow' || category === 'fog') return false;
  return true;
}

/** 45–110 s between streaks — rare enough to stay special. */
export function nextStreakDelayMs(rand01: number): number {
  return 45_000 + rand01 * 65_000;
}

export function buildStreak(rand: () => number): Streak {
  return {
    azimuth: rand() * Math.PI * 2,
    elevation: 0.5 + rand() * 0.6,
    heading: rand() * Math.PI * 2,
    arcLen: 0.28 + rand() * 0.14,
    durSec: 0.9 + rand() * 0.5,
  };
}

const dir = (az: number, el: number) => ({
  x: Math.cos(el) * Math.sin(az),
  y: Math.sin(el),
  z: -Math.cos(el) * Math.cos(az),
});

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function headAt(s: Streak, t01: number): { x: number; y: number; z: number } {
  const az = s.azimuth + Math.cos(s.heading) * s.arcLen * t01;
  // The vertical component always falls — meteors streak down, never up.
  const el = s.elevation - (0.35 + 0.4 * Math.abs(Math.sin(s.heading))) * s.arcLen * t01;
  return dir(az, el);
}

/** How far (in normalized flight time) the tail trails the head. */
export const TAIL_LAG = 0.15;

export function streakPoseAt(s: Streak, t01: number): StreakPose {
  return {
    head: headAt(s, t01),
    tail: headAt(s, Math.max(0, t01 - TAIL_LAG)),
    opacity: Math.min(clamp01(t01 / 0.1), clamp01((1 - t01) / 0.35)),
  };
}
