/**
 * First-person walking math for the explorable meadow: keyboard mapping, position stepping
 * with bounds + pond collision, and drag-look. Pure logic — no three.js, no DOM.
 *
 * Conventions match a three.js camera with rotation order 'YXZ': yaw 0 faces north (−z),
 * positive yaw turns left, positive pitch looks up.
 */
import type { Pond, WorldBounds } from './world-layout';

export interface MoveInput {
  /** −1..1, positive = walk toward facing direction. */
  forward: number;
  /** −1..1, positive = strafe right. */
  strafe: number;
}

export interface PlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface StepOptions {
  speed: number;
  bounds: WorldBounds;
  ponds: readonly Pond[];
}

const PITCH_MIN = (-60 * Math.PI) / 180;
const PITCH_MAX = (45 * Math.PI) / 180;
/** Keep the walker a little back from the water's edge. */
const POND_BUFFER = 0.4;

const KEY_AXES: Record<string, Partial<MoveInput>> = {
  KeyW: { forward: 1 },
  ArrowUp: { forward: 1 },
  KeyS: { forward: -1 },
  ArrowDown: { forward: -1 },
  KeyA: { strafe: -1 },
  ArrowLeft: { strafe: -1 },
  KeyD: { strafe: 1 },
  ArrowRight: { strafe: 1 },
};

/** Shift turns the keyboard run into a stroll (the caller scales the input vector). */
export function strollHeld(keys: ReadonlySet<string>): boolean {
  return keys.has('ShiftLeft') || keys.has('ShiftRight');
}

export function keysToInput(keys: ReadonlySet<string>): MoveInput {
  let forward = 0;
  let strafe = 0;
  for (const key of keys) {
    const axes = KEY_AXES[key];
    if (axes) {
      forward += axes.forward ?? 0;
      strafe += axes.strafe ?? 0;
    }
  }
  const len = Math.hypot(forward, strafe);
  if (len > 1) {
    forward /= len;
    strafe /= len;
  }
  return { forward, strafe };
}

export function stepPlayer(
  s: PlayerState,
  input: MoveInput,
  dt: number,
  { speed, bounds, ponds }: StepOptions,
): PlayerState {
  if (input.forward === 0 && input.strafe === 0) return s;

  const sin = Math.sin(s.yaw);
  const cos = Math.cos(s.yaw);
  let x = s.x + (input.strafe * cos - input.forward * sin) * speed * dt;
  let z = s.z + (-input.forward * cos - input.strafe * sin) * speed * dt;

  x = Math.min(bounds.maxX, Math.max(bounds.minX, x));
  z = Math.min(bounds.maxZ, Math.max(bounds.minZ, z));

  for (const pond of ponds) {
    const barrier = pond.radius + POND_BUFFER;
    const dx = x - pond.x;
    const dz = z - pond.z;
    const d = Math.hypot(dx, dz);
    if (d < barrier) {
      // Push back out radially; if somehow dead-centre, eject south.
      if (d === 0) {
        z = pond.z + barrier;
      } else {
        x = pond.x + (dx / d) * barrier;
        z = pond.z + (dz / d) * barrier;
      }
    }
  }

  return { ...s, x, z };
}

export function applyLook(
  s: PlayerState,
  dxPx: number,
  dyPx: number,
  sensitivity: number,
): PlayerState {
  const pitch = s.pitch - dyPx * sensitivity;
  return {
    ...s,
    yaw: s.yaw - dxPx * sensitivity,
    pitch: Math.min(PITCH_MAX, Math.max(PITCH_MIN, pitch)),
  };
}
