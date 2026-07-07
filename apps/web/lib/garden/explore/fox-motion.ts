/**
 * Fox body motion for the third-person explorable meadow: smoothed facing direction and gait
 * speed derived from the per-frame position delta that `stepPlayer` produced. The camera's yaw
 * steers movement; the fox model turns to face wherever it is actually going.
 *
 * Pure logic — no three.js, no DOM.
 */
import {
  FOX_GAIT_RUN_MIN,
  FOX_GAIT_WALK_MIN,
  HEADING_DAMP_RATE,
  SPEED_DAMP_RATE,
} from './constants';
import type { MoveInput } from './movement';

export type FoxGait = 'idle' | 'walk' | 'run';

export interface FoxMotionState {
  /** Facing angle (radians) in the movement convention: 0 faces north (−z). */
  heading: number;
  /** Smoothed ground speed, m/s. */
  speed: number;
}

/** Frame-rate-independent exponential damping of `current` toward `target` at `rate` (1/s). */
export function expDamp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

/** Below this ramped magnitude the fox is treated as fully stopped (snaps to a real halt). */
const INPUT_STOP_EPS = 0.02;

/**
 * Ease the movement input toward its target so the fox accelerates from a standstill and coasts
 * to a stop instead of snapping to full speed. Both components damp at `rate`; once the combined
 * magnitude falls below a small epsilon it snaps to exactly zero, because `stepPlayer` only halts
 * on an exact-zero input (an asymptotic decay would otherwise creep forever).
 */
export function rampInput(prev: MoveInput, target: MoveInput, rate: number, dt: number): MoveInput {
  const forward = expDamp(prev.forward, target.forward, rate, dt);
  const strafe = expDamp(prev.strafe, target.strafe, rate, dt);
  if (Math.hypot(forward, strafe) < INPUT_STOP_EPS) return { forward: 0, strafe: 0 };
  return { forward, strafe };
}

const TWO_PI = Math.PI * 2;

/** Wrap an angle into (−π, π]. */
function wrapAngle(a: number): number {
  let w = a % TWO_PI;
  if (w > Math.PI) w -= TWO_PI;
  if (w <= -Math.PI) w += TWO_PI;
  return w;
}

/** `expDamp` along the shortest angular arc, so 179° → −179° never spins the long way. */
export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const delta = wrapAngle(target - current);
  return wrapAngle(current + delta * (1 - Math.exp(-rate * dt)));
}

/**
 * Advance the fox's smoothed heading + speed from this frame's position delta. Heading only
 * re-targets while actually moving — released input freezes the fox facing its last direction
 * while the speed decays to an idle stop.
 */
export function stepFoxMotion(
  prev: FoxMotionState,
  dx: number,
  dz: number,
  dt: number,
  opts?: { headingRate?: number; speedRate?: number },
): FoxMotionState {
  if (dt <= 0) return prev;
  const headingRate = opts?.headingRate ?? HEADING_DAMP_RATE;
  const speedRate = opts?.speedRate ?? SPEED_DAMP_RATE;

  const rawSpeed = Math.hypot(dx, dz) / dt;
  const speed = expDamp(prev.speed, rawSpeed, speedRate, dt);

  // Movement convention (see movement.ts): yaw 0 walks toward −z, so a step of (dx,dz)
  // points along heading atan2(−dx, −dz) — a pure-forward step keeps heading === yaw.
  const heading =
    rawSpeed > 1e-6 ? dampAngle(prev.heading, Math.atan2(-dx, -dz), headingRate, dt) : prev.heading;

  return { heading, speed };
}

export function gaitFor(speed: number): FoxGait {
  if (speed < FOX_GAIT_WALK_MIN) return 'idle';
  if (speed >= FOX_GAIT_RUN_MIN) return 'run';
  return 'walk';
}
