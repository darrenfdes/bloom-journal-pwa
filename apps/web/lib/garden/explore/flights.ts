/**
 * Duck-V and solo-bird crossings for the 3D sky. All timing/probability comes from the 2D
 * meadow's `ducks.ts` (single source of truth) so both views share the same session luck;
 * this module adds the 3D geometry — a crossing line ahead of the camera, V-formation
 * offsets in metres, and the undulating pose the 2D `bj-duckpath` keyframes describe.
 * Sprite rendering lives in `SkyFlights.tsx`.
 */
import { isPrecipitatingCategory, type WeatherCategory } from '@bloom/core/scene';

import { DUCK_FLIGHT, duckSessionChance, SOLO_BIRDS, soloBirdChance } from '@/lib/garden/bloom/ducks';
import type { PhaseKey } from '@/lib/garden/bloom/phases';

export interface FlightMember {
  /** Metres along the travel direction relative to the leader (negative = trailing). */
  along: number;
  /** Metres perpendicular to the travel direction (alternating flanks build the V). */
  lateral: number;
  bobPhase: number;
  bobAmp: number;
  flapHz: number;
  /** Sprite width in metres. */
  size: number;
}

export interface Flight {
  kind: 'ducks' | 'bird';
  start: { x: number; z: number };
  end: { x: number; z: number };
  altitude: number;
  durSec: number;
  /** Sprite art faces right; mirror it when the crossing runs the other way. */
  mirror: boolean;
  members: FlightMember[];
}

/** Nothing flies through fog or falling weather. */
export function flightAllowed(category: WeatherCategory | undefined): boolean {
  return !(isPrecipitatingCategory(category) || category === 'snow' || category === 'fog');
}

export function rollDuckSession(rand01: number, phase: PhaseKey): boolean {
  return rand01 < duckSessionChance(phase);
}

export function rollSoloBird(rand01: number, phase: PhaseKey): boolean {
  return rand01 < soloBirdChance(phase);
}

const lerpRange = (range: readonly [number, number], rand01: number) =>
  range[0] + rand01 * (range[1] - range[0]);

export const firstDuckDelayMs = (rand01: number) =>
  lerpRange(DUCK_FLIGHT.firstFlightDelayMs, rand01);
export const nextDuckDelayMs = (rand01: number) => lerpRange(DUCK_FLIGHT.repeatEveryMs, rand01);
export const nextBirdRollDelayMs = (rand01: number) => lerpRange(SOLO_BIRDS.repeatEveryMs, rand01);

/** How far ahead of the camera the crossing line sits, and its half-length, in metres. */
const CROSS_AHEAD = 45;
const CROSS_HALF = 70;

export function buildFlight(
  rng: () => number,
  kind: 'ducks' | 'bird',
  camera: { x: number; z: number; yaw: number },
): Flight {
  // Camera forward per the movement convention (yaw 0 → north/−z); right is perpendicular.
  const fwd = { x: -Math.sin(camera.yaw), z: -Math.cos(camera.yaw) };
  const right = { x: Math.cos(camera.yaw), z: -Math.sin(camera.yaw) };
  const mid = { x: camera.x + fwd.x * CROSS_AHEAD, z: camera.z + fwd.z * CROSS_AHEAD };
  const dirSign = rng() < 0.5 ? 1 : -1;

  const members: FlightMember[] = [];
  const count = kind === 'ducks' ? 3 + Math.floor(rng() * 5) : 1 + (rng() < 0.35 ? 1 : 0);
  for (let i = 0; i < count; i++) {
    // V formation: leader in front, followers on alternating flanks, one rank further back.
    const rank = Math.ceil(i / 2);
    const side = i === 0 ? 0 : i % 2 === 1 ? 1 : -1;
    members.push({
      along: i === 0 ? 0 : -3.2 * rank * (0.9 + rng() * 0.2),
      lateral: side * 2.4 * rank * (0.9 + rng() * 0.2),
      bobPhase: rng() * Math.PI * 2,
      bobAmp: 0.6 + rng() * 0.6,
      flapHz: kind === 'ducks' ? 2.6 + rank * 0.18 + rng() * 0.3 : 3 + rng(),
      size: kind === 'ducks' ? 1.9 + rng() * 0.4 : 1.4 + rng() * 0.3,
    });
  }

  return {
    kind,
    start: {
      x: mid.x - right.x * CROSS_HALF * dirSign,
      z: mid.z - right.z * CROSS_HALF * dirSign,
    },
    end: {
      x: mid.x + right.x * CROSS_HALF * dirSign,
      z: mid.z + right.z * CROSS_HALF * dirSign,
    },
    altitude: 22 + rng() * 12,
    durSec: 24 + rng() * 10,
    mirror: dirSign < 0,
    members,
  };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export function flightPoseAt(
  flight: Flight,
  member: FlightMember,
  t01: number,
): { x: number; y: number; z: number; opacity: number } {
  const dx = flight.end.x - flight.start.x;
  const dz = flight.end.z - flight.start.z;
  const len = Math.hypot(dx, dz);
  // Formation offset: shift along the path (trailing) and sideways (flank).
  const tt = t01 + member.along / len;
  const px = -dz / len;
  const pz = dx / len;
  // The undulating altitude the 2D `bj-duckpath-a/b` keyframes sketch: two slow sines.
  const bob =
    member.bobAmp *
    (Math.sin(Math.PI * 2 * 2.2 * t01 + member.bobPhase) +
      0.5 * Math.sin(Math.PI * 2 * 3.7 * t01 + member.bobPhase * 1.7));
  return {
    x: flight.start.x + dx * tt + px * member.lateral,
    y: flight.altitude + bob,
    z: flight.start.z + dz * tt + pz * member.lateral,
    opacity: clamp01(Math.min(t01, 1 - t01) / 0.08),
  };
}
