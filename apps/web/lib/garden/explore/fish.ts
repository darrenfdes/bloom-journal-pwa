/**
 * A small school of fish patrolling the stream's pool. Two species share the water: big slow koi
 * holding tight to the deep pool, and quick silvery minnows ranging the shallower runs. Each fish
 * darts-and-glides along a short stretch of the centerline (a flattened sine: it hovers at the ends
 * of its patrol and shoots across the middle), drifts a little to one side, and stays under the
 * surface — except for an occasional rise toward it, which the view marks with a ripple ring.
 * Deterministic per seed; the view layer just reads `fishAt`/`rippleAt` each frame.
 *
 * Pure logic — no three.js, no React.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';

import { pointAlongStream, type Stream } from './stream';

const DEFAULT_COUNT = 12;

export type FishSpecies = 'koi' | 'minnow';

export const FISH_SPECIES: Record<
  FishSpecies,
  {
    colors: string[];
    /** Render-scale range. */
    size: [number, number];
    /** Oscillation-rate range (rad/s). */
    speed: [number, number];
    /** Below-surface depth range (m); keep minima ≥ 0.05 so rises can't break the surface. */
    depth: [number, number];
  }
> = {
  koi: {
    colors: ['#d9772f', '#e8e2d4', '#c9542a'],
    size: [1.0, 1.6],
    speed: [0.2, 0.4],
    depth: [0.12, 0.2],
  },
  minnow: {
    colors: ['#9fb2b8', '#b9c6c4'],
    size: [0.45, 0.75],
    speed: [0.5, 0.9],
    depth: [0.05, 0.1],
  },
};

/** Sharpness of the dart-and-glide waveform (1 = pure sine; higher = harder darts). */
const DART = 2.5;

export interface Fish {
  species: FishSpecies;
  /** Body colour, drawn from the species palette. */
  color: string;
  /** Centre of this fish's patrol, as an arc-length fraction of the stream. */
  baseT: number;
  /** How far it ranges up/down stream (in t) as it swims. */
  range: number;
  /** Oscillation rate (rad/s). */
  speed: number;
  /** Sideways bias within the channel, −1..1 (fraction of the local half-width). */
  lateral: number;
  /** How far below the surface it swims (m). */
  depth: number;
  /** Render scale. */
  size: number;
  phase: number;
  /** How often it rises toward the surface (rises per second; periods of ~10–24 s). */
  riseHz: number;
  risePhase: number;
}

export interface FishPose {
  x: number;
  z: number;
  y: number;
  /** Yaw (radians) of the direction the fish is swimming. */
  heading: number;
}

const pick = (rng: () => number, [lo, hi]: [number, number]) => lo + rng() * (hi - lo);

export function fishSchool(stream: Stream, seed: number, count = DEFAULT_COUNT): Fish[] {
  const rng = mulberry32(seed);
  const fish: Fish[] = [];
  for (let i = 0; i < count; i++) {
    const species: FishSpecies = rng() < 0.35 ? 'koi' : 'minnow';
    const spec = FISH_SPECIES[species];
    fish.push({
      species,
      color: spec.colors[Math.floor(rng() * spec.colors.length)]!,
      // Koi hold tight around the pool (the wide southern middle); minnows range the runs.
      baseT: species === 'koi' ? 0.5 + rng() * 0.16 : 0.42 + rng() * 0.36,
      range: species === 'koi' ? 0.02 + rng() * 0.03 : 0.03 + rng() * 0.06,
      speed: pick(rng, spec.speed),
      lateral: rng() * 2 - 1,
      depth: pick(rng, spec.depth),
      size: pick(rng, spec.size),
      phase: rng() * Math.PI * 2,
      riseHz: 1 / (10 + rng() * 14),
      risePhase: rng(),
    });
  }
  return fish;
}

/**
 * The rise envelope, 0..1: a short smooth pulse (~1.8 s of `sin²`) once per rise period, 0 the
 * rest of the time. 0 under reduced motion.
 */
export function fishRise(fish: Fish, time: number, reducedMotion = false): number {
  if (reducedMotion) return 0;
  const u = (time * fish.riseHz + fish.risePhase) % 1;
  const w = fish.riseHz * 1.8; // the pulse lasts ~1.8 s of the period
  if (u >= w) return 0;
  return Math.sin((Math.PI * u) / w) ** 2;
}

export function fishAt(fish: Fish, stream: Stream, time: number, reducedMotion = false): FishPose {
  const theta = time * fish.speed + fish.phase;
  // Dart-and-glide: a sine flattened at the extremes, so the fish hovers at each end of its
  // patrol and shoots across the middle.
  const osc = reducedMotion ? 0 : Math.tanh(DART * Math.sin(theta)) / Math.tanh(DART);
  const t = Math.min(0.97, Math.max(0.03, fish.baseT + osc * fish.range));
  const p = pointAlongStream(stream, t);
  // Left-hand normal of the downstream tangent.
  const nx = -p.tangent.z;
  const nz = p.tangent.x;
  const lat = fish.lateral * p.halfWidth * 0.6;
  const bob = reducedMotion ? 0 : Math.sin(time * 1.7 + fish.phase) * 0.015;
  // Rises lift toward (never through) the surface: amplitude depth − 0.03 keeps y < level.
  const rise = fishRise(fish, time, reducedMotion) * (fish.depth - 0.03);
  // Swim forward while the oscillation is rising, backward while it's falling.
  const dir = reducedMotion || Math.cos(theta) >= 0 ? 1 : -1;
  return {
    x: p.x + nx * lat,
    z: p.z + nz * lat,
    y: stream.level - fish.depth + bob + rise,
    heading: Math.atan2(dir * p.tangent.x, dir * p.tangent.z),
  };
}

/** How long a ripple ring outlives the rise pulse (s). */
const RIPPLE_TAIL = 1.2;

/**
 * The expanding ripple ring left by a rise: born at the pulse peak, growing and fading for the
 * back half of the pulse plus a short tail. Anchored where the fish was at the peak, so the ring
 * doesn't chase it. Null outside a rise, and always null under reduced motion.
 */
export function rippleAt(
  fish: Fish,
  stream: Stream,
  time: number,
  reducedMotion = false,
): { x: number; z: number; radius: number; opacity: number } | null {
  if (reducedMotion) return null;
  const w = fish.riseHz * 1.8;
  const cycle = Math.floor(time * fish.riseHz + fish.risePhase);
  const peakTime = (cycle + w / 2 - fish.risePhase) / fish.riseHz;
  const age = time - peakTime;
  const duration = (w / 2) / fish.riseHz + RIPPLE_TAIL;
  if (age < 0 || age > duration) return null;
  const f = age / duration;
  const peak = fishAt(fish, stream, peakTime);
  return {
    x: peak.x,
    z: peak.z,
    radius: 0.1 + (0.7 * fish.size - 0.1) * f,
    opacity: 0.5 * (1 - f),
  };
}
