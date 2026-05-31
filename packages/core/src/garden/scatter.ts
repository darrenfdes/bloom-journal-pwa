import { SeededRNG } from '../flowers/seeded-rng';

export interface ScatterPoint {
  x: number;
  y: number;
}

function isTooClose(
  points: ScatterPoint[],
  x: number,
  y: number,
  minDistance: number
): boolean {
  return points.some((p) => {
    const dx = p.x - x;
    const dy = p.y - y;
    return Math.sqrt(dx * dx + dy * dy) < minDistance;
  });
}

function tryPlaceFallbackPoint(
  points: ScatterPoint[],
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  index: number,
  count: number,
  minDistance: number
): ScatterPoint {
  for (let expansion = 0; expansion <= 12; expansion += 1) {
    const scale = 1 + expansion * 0.1;
    for (let ring = 0.3; ring <= 1.2; ring += 0.05) {
      for (let step = 0; step < count * 8; step += 1) {
        const angle = ((index + step * 0.31) / Math.max(count, 1)) * Math.PI * 2;
        const x = centerX + Math.cos(angle) * radiusX * ring * scale;
        const y = centerY + Math.sin(angle) * radiusY * ring * 0.85 * scale;
        if (!isTooClose(points, x, y, minDistance)) {
          return { x, y };
        }
      }
    }
  }

  const angle = (index / Math.max(count, 1)) * Math.PI * 2;
  let x = centerX + Math.cos(angle) * radiusX * 1.4;
  let y = centerY + Math.sin(angle) * radiusY * 0.85 * 1.4;
  while (isTooClose(points, x, y, minDistance)) {
    x += Math.cos(angle) * minDistance * 0.45;
    y += Math.sin(angle) * minDistance * 0.35;
  }
  return { x, y };
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

    if (!isTooClose(points, x, y, minDistance)) {
      points.push({ x, y });
    }
  }

  while (points.length < count) {
    const i = points.length;
    points.push(
      tryPlaceFallbackPoint(
        points,
        centerX,
        centerY,
        radiusX,
        radiusY,
        i,
        count,
        minDistance
      )
    );
  }

  return points;
}
