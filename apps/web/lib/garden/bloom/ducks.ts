/**
 * Duck- and bird-flight scheduling for the live garden. A small V of ducks crosses the
 * sky occasionally during golden hour (and, less often, dusk); one or two lone birds
 * cross individually during the day; other phases never spawn either.
 * The visuals live in `components/garden/bloom/creatures.tsx` (`Duck`, `SoloBird`).
 */

import type { PhaseKey } from './phases';

/** Tunable timing/probability for the live-mode duck flights. */
export const DUCK_FLIGHT = {
  repeatEveryMs: [150_000, 300_000] as const, // 2.5–5 min re-roll
  chanceByPhase: { golden: 0.6, dusk: 0.35 } as Partial<Record<PhaseKey, number>>,
};

/** Chance (0–1) that a re-roll during `phase` launches a duck flight. */
export function duckSpawnChance(phase: PhaseKey): number {
  return DUCK_FLIGHT.chanceByPhase[phase] ?? 0;
}

/** Tunable timing/probability for the live-mode lone-bird flights. */
export const SOLO_BIRDS = {
  repeatEveryMs: [240_000, 330_000] as const, // ~4–5.5 min re-roll
  chanceByPhase: { day: 0.8 } as Partial<Record<PhaseKey, number>>,
};

/** Chance (0–1) that a re-roll during `phase` sends one or two lone birds across. */
export function soloBirdChance(phase: PhaseKey): number {
  return SOLO_BIRDS.chanceByPhase[phase] ?? 0;
}
