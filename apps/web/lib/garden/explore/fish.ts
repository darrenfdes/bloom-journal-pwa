/**
 * A small school of fish patrolling the stream's pool. Each fish oscillates along a short stretch
 * of the centerline (mostly the wide middle water) and drifts a little to one side, staying under
 * the surface. Deterministic per seed; the view layer just reads `fishAt` each frame.
 *
 * Pure logic — no three.js, no React.
 */
import { mulberry32 } from '@/lib/garden/bloom/rng';

import { pointAlongStream, type Stream } from './stream';

const DEFAULT_COUNT = 8;

export interface Fish {
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
}

export interface FishPose {
  x: number;
  z: number;
  y: number;
  /** Yaw (radians) of the direction the fish is swimming. */
  heading: number;
}

export function fishSchool(stream: Stream, seed: number, count = DEFAULT_COUNT): Fish[] {
  const rng = mulberry32(seed);
  const fish: Fish[] = [];
  for (let i = 0; i < count; i++) {
    fish.push({
      baseT: 0.5 + rng() * 0.28, // biased toward the pool (the wide southern middle of the stream)
      range: 0.03 + rng() * 0.06,
      speed: 0.25 + rng() * 0.4,
      lateral: rng() * 2 - 1,
      depth: 0.06 + rng() * 0.12,
      size: 0.7 + rng() * 0.6,
      phase: rng() * Math.PI * 2,
    });
  }
  return fish;
}

export function fishAt(fish: Fish, stream: Stream, time: number, reducedMotion = false): FishPose {
  const osc = reducedMotion ? 0 : Math.sin(time * fish.speed + fish.phase);
  const t = Math.min(0.97, Math.max(0.03, fish.baseT + osc * fish.range));
  const p = pointAlongStream(stream, t);
  // Left-hand normal of the downstream tangent.
  const nx = -p.tangent.z;
  const nz = p.tangent.x;
  const lat = fish.lateral * p.halfWidth * 0.6;
  const bob = reducedMotion ? 0 : Math.sin(time * 1.7 + fish.phase) * 0.015;
  // Swim forward while the oscillation is rising, backward while it's falling.
  const dir = reducedMotion || Math.cos(time * fish.speed + fish.phase) >= 0 ? 1 : -1;
  return {
    x: p.x + nx * lat,
    z: p.z + nz * lat,
    y: stream.level - fish.depth + bob,
    heading: Math.atan2(dir * p.tangent.x, dir * p.tangent.z),
  };
}
