/**
 * Ambient particle motes — fireflies (dusk/night) and drifting pollen (day/golden). Pure,
 * deterministic and closed-form over time (no accumulated state), mirroring the 2D meadow's
 * `PHASES[phase].fire` / `.pollen` opacities so both views light up at the same hours.
 */
import { isPrecipitatingCategory, type WeatherCategory } from '@bloom/core/scene';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { PHASES, type PhaseKey } from '@/lib/garden/bloom/phases';

export interface MoteBox {
  w: number;
  h: number;
  d: number;
  /** Bottom of the volume in metres above the ground. */
  yMin: number;
}

export interface Mote {
  /** Drift-centre within the box (box-local coordinates). */
  x: number;
  y: number;
  z: number;
  /** Lissajous drift radii per axis (m). */
  rx: number;
  ry: number;
  rz: number;
  /** Drift frequencies (rad/s), incommensurate so paths never visibly repeat. */
  fx: number;
  fy: number;
  fz: number;
  phase: number;
  /** Blink pulses per second (fireflies only). */
  blinkHz: number;
}

/** Fireflies hug the ground in a wide shallow band around the camera. */
export const FIREFLY_BOX: MoteBox = { w: 26, h: 1.2, d: 26, yMin: 0.2 };
export const FIREFLY_COUNT = 40;
/** Pollen floats through the air column the camera looks across. */
export const POLLEN_BOX: MoteBox = { w: 20, h: 6, d: 20, yMin: 0.4 };
export const POLLEN_COUNT = 60;

export function buildMotes(seed: number, count: number, box: MoteBox): Mote[] {
  const rng = mulberry32(seed);
  const motes: Mote[] = [];
  for (let i = 0; i < count; i++) {
    const rx = 0.4 + rng() * 1.1;
    const ry = 0.1 + rng() * (box.h * 0.18);
    const rz = 0.4 + rng() * 1.1;
    motes.push({
      // Keep the drift centre inset by the radius so the full orbit stays inside the box.
      x: rx + rng() * (box.w - 2 * rx),
      y: box.yMin + ry + rng() * (box.h - 2 * ry),
      z: rz + rng() * (box.d - 2 * rz),
      rx,
      ry,
      rz,
      fx: 0.11 + rng() * 0.23,
      fy: 0.17 + rng() * 0.29,
      fz: 0.13 + rng() * 0.21,
      phase: rng() * Math.PI * 2,
      blinkHz: 0.25 + rng() * 0.3,
    });
  }
  return motes;
}

/** Box-local position at time t — an incommensurate sin/cos wander around the drift centre. */
export function moteAt(m: Mote, t: number): { x: number; y: number; z: number } {
  return {
    x: m.x + Math.sin(t * m.fx + m.phase) * m.rx,
    y: m.y + Math.sin(t * m.fy + m.phase * 1.7) * m.ry,
    z: m.z + Math.cos(t * m.fz + m.phase * 0.6) * m.rz,
  };
}

/** Sharpened-sine blink, 0..1 — dark most of the cycle with a soft bright pulse. */
export function fireflyIntensity(m: Mote, t: number): number {
  const s = Math.max(0, Math.sin(t * m.blinkHz * Math.PI * 2 + m.phase));
  return s * s * s;
}

/**
 * Target layer opacity — exact 2D parity via `PHASES[phase].fire`/`.pollen`, silenced by
 * precipitation and softened under grey skies.
 */
export function moteOpacityFor(
  kind: 'fire' | 'pollen',
  phase: PhaseKey,
  category: WeatherCategory | undefined,
): number {
  const base = kind === 'fire' ? PHASES[phase].fire : PHASES[phase].pollen;
  // `isPrecipitatingCategory` deliberately excludes snow, but nothing flits through snowfall.
  if (isPrecipitatingCategory(category) || category === 'snow') return 0;
  if (category === 'overcast' || category === 'fog') return base * 0.4;
  return base;
}
