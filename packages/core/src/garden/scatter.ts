import { SeededRNG } from '../flowers/seeded-rng';

export interface ScatterPoint {
  x: number;
  y: number;
}

/**
 * Deterministic organic scatter inside an ellipse.
 * minDistance keeps blooms from overlapping.
 */
export function scatterInCluster(
  count: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  seed: number,
  minDistance = 56
): ScatterPoint[] {
  if (count === 0) return [];
  const rng = new SeededRNG(seed);
  const points: ScatterPoint[] = [];

  for (let attempt = 0; attempt < count * 40 && points.length < count; attempt++) {
    const angle = rng.next() * Math.PI * 2;
    const dist = Math.sqrt(rng.next());
    const x = centerX + Math.cos(angle) * radiusX * dist;
    const y = centerY + Math.sin(angle) * radiusY * dist * 0.65;

    const tooClose = points.some((p) => {
      const dx = p.x - x;
      const dy = p.y - y;
      return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });

    if (!tooClose) {
      points.push({ x, y });
    }
  }

  while (points.length < count) {
    const i = points.length;
    const angle = (i / count) * Math.PI * 2;
    points.push({
      x: centerX + Math.cos(angle) * radiusX * 0.6,
      y: centerY + Math.sin(angle) * radiusY * 0.4,
    });
  }

  return points;
}
