/**
 * Duck- and bird-flight scheduling for the live garden. Ducks are session-gated: when
 * the garden opens in (or the clock enters) golden hour there's a 1-in-3 chance the
 * session gets ducks (1-in-6 at dusk) — if it does, a V crosses every 2–3 minutes until
 * the phase ends. One or two lone birds cross individually during the day; other phases
 * never spawn either. The visuals live in `components/garden/bloom/creatures.tsx`
 * (`Duck`, `SoloBird`).
 */

import type { PhaseKey } from './phases';

/** Tunable timing/probability for the live-mode duck flights. */
export const DUCK_FLIGHT = {
  // Rolled once when the live meadow opens in (or the clock enters) the phase:
  // does this session get ducks?
  sessionChanceByPhase: { golden: 1 / 3, dusk: 1 / 6 } as Partial<Record<PhaseKey, number>>,
  firstFlightDelayMs: [15_000, 40_000] as const, // first V shortly after the phase begins
  repeatEveryMs: [120_000, 180_000] as const, // then one every 2–3 min
};

/** Chance (0–1) that a session entering `phase` gets duck flights at all. */
export function duckSessionChance(phase: PhaseKey): number {
  return DUCK_FLIGHT.sessionChanceByPhase[phase] ?? 0;
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
