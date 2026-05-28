import { SeededRNG } from '../flowers/seeded-rng';

export interface ScatterPoint {
  x: number;
  y: number;
}

/**
 * Deterministic organic scatter inside an ellipse.
 * minDistance keeps blooms from overlapping.
 *
 * Progressive radius: early points cluster tightly near center,
 * expanding outward as more points are placed. This fills the area
 * around the month tag first.
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
    const rawDist = Math.sqrt(rng.next());

    // Progressive radius: early points stay in the inner ellipse,
    // later points expand toward the full radius.
    const progress = count <= 1 ? 1 : points.length / (count - 1);
    const radiusFrac = 0.45 + 0.55 * progress;
    const dist = rawDist * radiusFrac;

    const x = centerX + Math.cos(angle) * radiusX * dist;
    const y = centerY + Math.sin(angle) * radiusY * dist;

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
