/**
 * Butterflies that flit between the journal flowers by day. Pure and closed-form over time
 * (the `fish.ts` pattern — no accumulated state): each butterfly's life is a chain of legs,
 * leg k perching on flower pick(k) then flying to pick(k+1), so poses are continuous across
 * leg boundaries by construction. Rendering lives in `ButterflyField.tsx`.
 */
import { isPrecipitatingCategory, type WeatherCategory } from '@bloom/core/scene';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import type { PhaseKey } from '@/lib/garden/bloom/phases';

/** A landing spot in world space — flower position with the perch height already applied. */
export interface PerchPoint {
  x: number;
  y: number;
  z: number;
}

/**
 * Wing colour pairs (outer, inner) — value-copied from the 2D meadow's `WINGS`
 * (components/garden/bloom/creatures.tsx) so both views hatch the same butterflies.
 */
export const BUTTERFLY_WINGS: [string, string][] = [
  ['#e2a14e', '#b06a30'], // amber
  ['#a8bedf', '#6f88b5'], // pale blue
  ['#e3b4c6', '#b27795'], // rose
  ['#d8cd96', '#a3955c'], // meadow yellow
];

export interface ButterflySpec {
  seed: number;
  /** Seconds per perch-and-fly leg. */
  legDur: number;
  /** Fraction of each leg spent perched before taking off. */
  perchFrac: number;
  wing: [string, string];
  size: number;
}

export interface ButterflyPose {
  x: number;
  y: number;
  z: number;
  /** Facing toward the flight target (world yaw convention: 0 = north/−z). */
  heading: number;
  mode: 'fly' | 'perch';
  /** Wingbeats per second — 2D parity: ~0.24 s flap flying, ~2.6 s slow fan perched. */
  flap: number;
}

/** Butterflies fly in warm light and shelter from rain, snow and fog. */
export function butterflyCountFor(
  phase: PhaseKey,
  category: WeatherCategory | undefined,
): number {
  if (isPrecipitatingCategory(category) || category === 'snow' || category === 'fog') return 0;
  if (phase === 'day' || phase === 'golden') return 4;
  if (phase === 'dawn') return 2;
  return 0;
}

export function buildButterflies(seed: number, count: number): ButterflySpec[] {
  const rng = mulberry32(seed);
  const flies: ButterflySpec[] = [];
  for (let i = 0; i < count; i++) {
    flies.push({
      seed: Math.floor(rng() * 1_000_000_000),
      legDur: 6 + rng() * 3,
      perchFrac: 0.38 + rng() * 0.16,
      wing: BUTTERFLY_WINGS[Math.floor(rng() * BUTTERFLY_WINGS.length)]!,
      size: 0.8 + rng() * 0.4,
    });
  }
  return flies;
}

const FLAP_FLY = 4.2;
const FLAP_PERCH = 0.38;
const ARC_APEX = 1.2;

const smoothstep = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return c * c * (3 - 2 * c);
};

/** The flower a butterfly targets on leg k — deterministic, so poses need no history. */
const pickPerch = (spec: ButterflySpec, perches: PerchPoint[], k: number): PerchPoint =>
  perches[Math.floor(mulberry32(spec.seed + k)() * perches.length) % perches.length]!;

export function butterflyAt(
  spec: ButterflySpec,
  perches: PerchPoint[],
  t: number,
): ButterflyPose | null {
  if (perches.length === 0) return null;
  const k = Math.floor(t / spec.legDur);
  const u = (t - k * spec.legDur) / spec.legDur;
  const from = pickPerch(spec, perches, k);
  const to = pickPerch(spec, perches, k + 1);
  const heading = Math.atan2(to.x - from.x, -(to.z - from.z));

  if (u < spec.perchFrac) {
    return { x: from.x, y: from.y, z: from.z, heading, mode: 'perch', flap: FLAP_PERCH };
  }

  const e = smoothstep((u - spec.perchFrac) / (1 - spec.perchFrac));
  return {
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e + Math.sin(e * Math.PI) * ARC_APEX * spec.size,
    z: from.z + (to.z - from.z) * e,
    heading,
    mode: 'fly',
    flap: FLAP_FLY,
  };
}
