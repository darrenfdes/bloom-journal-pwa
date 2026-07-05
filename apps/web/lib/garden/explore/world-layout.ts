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
  POND_LEVEL,
  POND_RADIUS,
  POND_Z,
  PX_TO_M,
  SPAWN_Z,
} from './constants';

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

export interface Pond {
  x: number;
  z: number;
  radius: number;
  /** Water level relative to the ground base (y = 0). */
  level: number;
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
  ponds: Pond[];
  bounds: WorldBounds;
  /** Total east–west span of the month strips in metres. */
  widthM: number;
  spawn: { x: number; z: number; yaw: number };
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

  const ponds: Pond[] = [];
  if (months.length >= 2) {
    const boundaries = months.slice(1).map((m) => m.xStart);
    const nearestBoundary = (target: number) =>
      boundaries.reduce((best, b) => (Math.abs(b - target) < Math.abs(best - target) ? b : best));
    const makePond = (x: number): Pond => ({ x, z: POND_Z, radius: POND_RADIUS, level: POND_LEVEL });

    ponds.push(makePond(nearestBoundary(widthM / 2)));
    if (months.length >= 8) {
      const second = nearestBoundary(widthM * 0.75);
      if (second !== ponds[0]!.x) ponds.push(makePond(second));
    }
  }

  const lastMonth = months[months.length - 1];
  return {
    flowers,
    months,
    ponds,
    bounds: {
      minX: -BOUNDS_MARGIN_X,
      maxX: widthM + BOUNDS_MARGIN_X,
      minZ: BOUNDS_NORTH_Z,
      maxZ: BOUNDS_SOUTH_Z,
    },
    widthM,
    spawn: { x: lastMonth ? lastMonth.xCenter : 0, z: SPAWN_Z, yaw: 0 },
  };
}
