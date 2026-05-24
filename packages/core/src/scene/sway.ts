import { SeededRNG } from '../flowers/seeded-rng';

export type FlowerSwayTiming = {
  /** CSS animation duration in seconds. */
  durationSec: number;
  /** Negative delay offsets each flower into the sway cycle. */
  delaySec: number;
};

/** Per-flower sway timing so blooms do not move in lockstep. */
export function getFlowerSwayTiming(seed: number): FlowerSwayTiming {
  const rng = new SeededRNG(seed);
  const durationSec = 2.6 + rng.next() * 0.8;
  const delaySec = -(rng.next() * durationSec);
  return { durationSec, delaySec };
}
