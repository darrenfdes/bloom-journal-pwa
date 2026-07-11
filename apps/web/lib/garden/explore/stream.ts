/**
 * The meadow's watercourse. A polyline centerline (source → mouth, north → south) with a
 * per-point half-width, so the water is a slim creek at the off-map ends and a broad pool in the
 * middle. Terrain carving, fox swimming, fish, and decor all query this one representation so they
 * agree on where the water is.
 *
 * Pure logic — no three.js, no React.
 */
import {
  POND_LEVEL,
  POND_Z,
  POOL_HALF_WIDTH,
  STREAM_HALF_WIDTH,
  STREAM_OFFMAP,
} from './constants';
import type { MonthRegion, WorldBounds } from './world-layout';

export interface StreamPoint {
  x: number;
  z: number;
  /** Half the channel width at this point (m). */
  halfWidth: number;
}

export interface Stream {
  /** Centerline from source (first, north) to mouth (last, south); both endpoints sit off-map. */
  points: StreamPoint[];
  /** Water surface height (y). */
  level: number;
}

export interface StreamSample {
  /** Distance from the query point to the centerline. */
  dist: number;
  /** Interpolated half-width at the nearest centerline point. */
  halfWidth: number;
  /** Arc-length fraction [0,1] of the nearest point (0 = source, 1 = mouth). */
  t: number;
  /** Unit downstream direction at the nearest point. */
  tangent: { x: number; z: number };
}

/** Cumulative arc length at each centerline vertex, plus the total (never 0). */
function arcLengths(points: readonly StreamPoint[]): { cum: number[]; total: number } {
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    cum[i] = cum[i - 1]! + Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.z - points[i - 1]!.z);
  }
  return { cum, total: cum[cum.length - 1]! || 1 };
}

/** Project (x, z) onto the stream centerline: distance, half-width, arc-length fraction, tangent. */
export function closestOnStream(x: number, z: number, stream: Stream): StreamSample {
  const pts = stream.points;
  const { cum, total } = arcLengths(pts);

  let best: StreamSample = {
    dist: Infinity,
    halfWidth: pts[0]!.halfWidth,
    t: 0,
    tangent: { x: 0, z: 1 },
  };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i]!;
    const b = pts[i + 1]!;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const segLen2 = dx * dx + dz * dz;
    const u = segLen2 > 0 ? ((x - a.x) * dx + (z - a.z) * dz) / segLen2 : 0;
    const uc = Math.min(1, Math.max(0, u));
    const px = a.x + dx * uc;
    const pz = a.z + dz * uc;
    const dist = Math.hypot(x - px, z - pz);
    if (dist < best.dist) {
      const segLen = Math.sqrt(segLen2) || 1;
      best = {
        dist,
        halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * uc,
        t: (cum[i]! + segLen * uc) / total,
        tangent: { x: dx / segLen, z: dz / segLen },
      };
    }
  }
  return best;
}

/** The centerline point (position, half-width, downstream tangent) at arc-length fraction t. */
export function pointAlongStream(
  stream: Stream,
  t: number,
): StreamPoint & { tangent: { x: number; z: number } } {
  const pts = stream.points;
  const { cum, total } = arcLengths(pts);
  const target = Math.min(1, Math.max(0, t)) * total;
  for (let i = 0; i < pts.length - 1; i++) {
    if (target <= cum[i + 1]! || i === pts.length - 2) {
      const a = pts[i]!;
      const b = pts[i + 1]!;
      const segLen = cum[i + 1]! - cum[i]! || 1;
      const uc = Math.min(1, Math.max(0, (target - cum[i]!) / segLen));
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      return {
        x: a.x + dx * uc,
        z: a.z + dz * uc,
        halfWidth: a.halfWidth + (b.halfWidth - a.halfWidth) * uc,
        tangent: { x: dx / len, z: dz / len },
      };
    }
  }
  const last = pts[pts.length - 1]!;
  return { ...last, tangent: { x: 0, z: 1 } };
}

/**
 * Linear arc-length resample of the centerline polyline (view-only; stays exactly on the carved
 * channel — terrain carving samples the raw polyline, so no spline smoothing here).
 */
export function resampleStream(stream: Stream, spacing = 1.5): StreamPoint[] {
  const { total } = arcLengths(stream.points);
  const steps = Math.max(1, Math.ceil(total / spacing));
  const out: StreamPoint[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = pointAlongStream(stream, i / steps);
    out.push({ x: p.x, z: p.z, halfWidth: p.halfWidth });
  }
  return out;
}

/**
 * Build the stream for a world: a gentle north→south S-curve centred on the boundary between the
 * newest month and its predecessor — a short walk west of spawn — narrow at the off-map ends and
 * broad through the pool near `POND_Z`. Deterministic; no water below two months (matches the old
 * pond threshold).
 */
export function buildStream(world: {
  months: MonthRegion[];
  bounds: WorldBounds;
}): Stream | null {
  const { months, bounds } = world;
  if (months.length < 2) return null;

  const cx = months[months.length - 1]!.xStart;

  const nb = bounds.minZ;
  const sb = bounds.maxZ;
  const poolZ = POND_Z;

  const points: StreamPoint[] = [
    { x: cx + 3, z: nb - STREAM_OFFMAP, halfWidth: STREAM_HALF_WIDTH },
    { x: cx + 2, z: nb, halfWidth: STREAM_HALF_WIDTH + 0.3 },
    { x: cx - 3, z: (nb + poolZ) / 2, halfWidth: STREAM_HALF_WIDTH + 1.1 },
    { x: cx, z: poolZ, halfWidth: POOL_HALF_WIDTH },
    { x: cx + 2.5, z: (poolZ + sb) / 2, halfWidth: STREAM_HALF_WIDTH + 1.1 },
    { x: cx + 3, z: sb, halfWidth: STREAM_HALF_WIDTH + 0.3 },
    { x: cx + 4, z: sb + STREAM_OFFMAP, halfWidth: STREAM_HALF_WIDTH },
  ];
  return { points, level: POND_LEVEL };
}
