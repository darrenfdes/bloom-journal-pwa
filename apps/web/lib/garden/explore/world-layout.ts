/**
 * Maps the 2D meadow layout (months left→right, deterministic per-entry placement) into the
 * 3D explorable world: east–west (+x) = time, north–south (−z) = wanderable depth.
 *
 * Pure logic — no three.js, no React. The 2D `buildMeadowLayout` stays the single source of
 * truth for where an entry lives; this module only re-projects its output.
 */
import type { MeadowLayout, PlacedEntry } from '@/lib/garden/bloom/layout';
import { MONTH_NAMES } from '@/lib/garden/bloom/phases';

import {
  BOUNDS_MARGIN_X,
  BOUNDS_NORTH_Z,
  BOUNDS_SOUTH_Z,
  FLOWER_Z_NEAR,
  FLOWER_Z_SPAN,
  PX_TO_M,
  SPAWN_Z,
} from './constants';
import { buildStream, type Stream } from './stream';

export interface FlowerPlacement {
  entry: PlacedEntry;
  x: number;
  z: number;
  /** Billboard height in metres (width follows the 100:140 flower aspect). */
  height: number;
}

export interface MonthRegion {
  key: number;
  label: string;
  xStart: number;
  xCenter: number;
}

export interface WorldBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface ExploreWorld {
  flowers: FlowerPlacement[];
  months: MonthRegion[];
  /** The watercourse crossing the meadow, or null for gardens too small for water. */
  stream: Stream | null;
  bounds: WorldBounds;
  /** Total east–west span of the month strips in metres. */
  widthM: number;
  spawn: { x: number; z: number; yaw: number };
}

/**
 * The month/year label under a world x-position — drives the HUD's wayfinding pill as the fox
 * walks the time axis. The walkable margins beyond the month strips clamp to the first/last
 * month; null only for an empty garden.
 */
export function monthLabelAt(
  x: number,
  world: Pick<ExploreWorld, 'months' | 'widthM'>,
): string | null {
  const count = world.months.length;
  if (count === 0) return null;
  const band = world.widthM / count;
  const i = Math.min(count - 1, Math.max(0, Math.floor(x / band)));
  return world.months[i]!.label;
}

export function buildExploreWorld(layout: MeadowLayout): ExploreWorld {
  const bandM = layout.MW * PX_TO_M;
  const widthM = layout.months.length * bandM;

  const months: MonthRegion[] = layout.months.map((m, i) => ({
    key: m.key,
    label: `${MONTH_NAMES[m.m]} ${m.y}`,
    xStart: i * bandM,
    xCenter: i * bandM + bandM / 2,
  }));

  const flowers: FlowerPlacement[] = layout.entries.map((entry) => {
    // Invert the 2D pseudo-depth roll (yB = 16 + depth·72) so the same roll that pushed a
    // flower "back" in 2D pushes it north here. Guarded by a round-trip test.
    const depth = (entry.yB - 16) / 72;
    return {
      entry,
      x: (entry.x - layout.PL) * PX_TO_M,
      z: FLOWER_Z_NEAR - depth * FLOWER_Z_SPAN,
      // The 2D scale minus its fake-depth term — real perspective replaces it in 3D.
      height: (1.35 * entry.scale) / (1.16 - depth * 0.46),
    };
  });

  const bounds: WorldBounds = {
    minX: -BOUNDS_MARGIN_X,
    maxX: widthM + BOUNDS_MARGIN_X,
    minZ: BOUNDS_NORTH_Z,
    maxZ: BOUNDS_SOUTH_Z,
  };

  const stream = buildStream({ months, bounds, widthM });

  const lastMonth = months[months.length - 1];
  return {
    flowers,
    months,
    stream,
    bounds,
    widthM,
    spawn: { x: lastMonth ? lastMonth.xCenter : 0, z: SPAWN_Z, yaw: 0 },
  };
}
