import { SeededRNG } from '../flowers/seeded-rng';

export type PetalDriftSpec = {
  id: number;
  topPct: number;
  delaySec: number;
  durationSec: number;
  size: number;
  color: string;
};

const PETAL_COLORS = ['#f8bbd0', '#fff'] as const;

const AVG_DURATION_SEC = 12;
const DURATION_MIN_SEC = 10;
const DURATION_MAX_SEC = 16;

/** Seeded horizontal petal drift specs — staggered for continuous left-to-right flow. */
export function generatePetalDriftSpecs(count = 14): PetalDriftSpec[] {
  const rng = new SeededRNG(99);
  const petals: PetalDriftSpec[] = [];

  for (let i = 0; i < count; i++) {
    const durationSec = rng.range(DURATION_MIN_SEC, DURATION_MAX_SEC);
    const baseDelay = (i / count) * AVG_DURATION_SEC;
    const jitter = rng.range(-0.4, 0.4);

    petals.push({
      id: i,
      topPct: 10 + rng.range(0, 60),
      delaySec: Math.max(0, baseDelay + jitter),
      durationSec,
      size: 6 + rng.range(0, 4),
      color: rng.next() > 0.5 ? PETAL_COLORS[0] : PETAL_COLORS[1],
    });
  }

  return petals;
}
