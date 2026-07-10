/**
 * Target gains for the synthesized ambient-sound layers, derived from the same live inputs
 * the visuals use — wind follows the vegetation's `windStrengthFor` curve, the stream swells
 * as the fox approaches the water. Pure mix math; the WebAudio graph lives in
 * `components/garden/explore/ambience-engine.ts`.
 */
import { isPrecipitatingCategory, type WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';

import { windStrengthFor } from './wind';

export interface AmbienceInputs {
  phase: PhaseKey;
  category: WeatherCategory | undefined;
  /** Live wind speed, km/h. */
  windSpeed: number;
  /** Fox → nearest stream-surface distance in metres; Infinity when there is no stream. */
  streamDist: number;
}

export interface AmbienceMix {
  wind: number;
  stream: number;
  crickets: number;
  birds: number;
  rain: number;
}

/** Metres from the water at which the stream layer fades to silence. */
const STREAM_EARSHOT = 22;

const CRICKETS: Partial<Record<PhaseKey, number>> = { dusk: 0.5, night: 0.85 };
const BIRDS: Partial<Record<PhaseKey, number>> = { dawn: 0.7, day: 0.55, golden: 0.45 };
const RAIN: Partial<Record<WeatherCategory, number>> = {
  drizzle: 0.3,
  rain: 0.55,
  heavy_rain: 0.85,
  thunderstorm: 0.95,
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function ambienceMixFor(i: AmbienceInputs): AmbienceMix {
  // Rain and snowfall silence the wildlife, exactly like the visual layers.
  const hushed = isPrecipitatingCategory(i.category) || i.category === 'snow';
  const streamNear = Number.isFinite(i.streamDist)
    ? clamp01(1 - i.streamDist / STREAM_EARSHOT)
    : 0;
  return {
    wind: Math.min(1, windStrengthFor(i.category, i.windSpeed) * 0.5),
    stream: streamNear * streamNear * 0.8,
    crickets: hushed ? 0 : (CRICKETS[i.phase] ?? 0),
    birds: hushed ? 0 : (BIRDS[i.phase] ?? 0),
    rain: i.category ? (RAIN[i.category] ?? 0) : 0,
  };
}

/** 20–60 s between synthesized bird chirps — sparse enough to stay charming. */
export function birdChirpDelayMs(rand01: number): number {
  return 20_000 + rand01 * 40_000;
}
