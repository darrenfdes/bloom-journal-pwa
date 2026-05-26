import { SeededRNG } from '../flowers/seeded-rng';
import type { WeatherCategory } from './types';

export type RicklerRainDropSpec = {
  id: number;
  /** left % for front row, right % for back row */
  horizontalPct: number;
  bottomPct: number;
  delaySec: number;
  durationSec: number;
};

export type RicklerRainRows = {
  front: RicklerRainDropSpec[];
  back: RicklerRainDropSpec[];
};

function buildRow(
  rng: SeededRNG,
  targetIncrement: number,
  durationScale: number,
  idOffset: number
): RicklerRainDropSpec[] {
  const drops: RicklerRainDropSpec[] = [];
  let increment = 0;
  let id = idOffset;

  while (increment < targetIncrement) {
    const randoHundo = Math.floor(rng.range(1, 98));
    const randoFiver = Math.floor(rng.range(2, 5));
    increment += randoFiver;

    drops.push({
      id: id++,
      horizontalPct: increment,
      bottomPct: randoFiver + randoFiver - 1 + 100,
      delaySec: parseFloat(`0.${randoHundo}`),
      durationSec: parseFloat(`0.5${randoHundo}`) * durationScale,
    });
  }

  return drops;
}

/** Aaron Rickle CodePen rain layout — front + back rows with splat/stem timing. */
export function generateRicklerRainRows(category: WeatherCategory): RicklerRainRows {
  const target =
    category === 'drizzle' ? 50 : category === 'rain' ? 75 : 100;
  const durationScale =
    category === 'drizzle' ? 1.35 : category === 'rain' ? 1.15 : 1;
  const seed = category.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  return {
    front: buildRow(new SeededRNG(seed + 1), target, durationScale, 0),
    back: buildRow(new SeededRNG(seed + 9991), target, durationScale, 10_000),
  };
}
