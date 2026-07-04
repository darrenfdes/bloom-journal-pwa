/**
 * Duck-flight scheduling for the live garden. A small V of ducks crosses the sky
 * occasionally during golden hour (and, less often, dusk); other phases never spawn them.
 * The visual lives in `components/garden/bloom/creatures.tsx` (`Duck`).
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
