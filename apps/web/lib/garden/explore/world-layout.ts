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

/** Index of the month band under a world x-position (walkable margins clamp to the first/last
 * strip); null only for an empty garden. */
function monthIndexAt(x: number, world: Pick<ExploreWorld, 'months' | 'widthM'>): number | null {
  const count = world.months.length;
  if (count === 0) return null;
  const band = world.widthM / count;
  return Math.min(count - 1, Math.max(0, Math.floor(x / band)));
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
  const i = monthIndexAt(x, world);
  return i === null ? null : world.months[i]!.label;
}

export interface MonthNeighbors {
  /** Older month to the west (short name, e.g. "May"); null at the oldest month. */
  prev: string | null;
  /** Full label of the month underfoot, e.g. "June 2026". */
  current: string;
  /** Newer month to the east (short name, e.g. "Jul"); null at the newest month. */
  next: string | null;
}

// The first three letters of every MONTH_NAMES entry match MONTH_ABBR, so slicing the label
// gives the standard abbreviation without threading the month index through MonthRegion.
const shortName = (m: MonthRegion) => m.label.split(' ')[0]!.slice(0, 3);

/**
 * The month underfoot plus its immediate neighbours — the HUD pill's direction hints (older
 * months lie west, newer east). Same clamping as `monthLabelAt`; null only for an empty garden.
 */
export function monthNeighborsAt(
  x: number,
  world: Pick<ExploreWorld, 'months' | 'widthM'>,
): MonthNeighbors | null {
  const i = monthIndexAt(x, world);
  if (i === null) return null;
  const months = world.months;
  return {
    prev: i > 0 ? shortName(months[i - 1]!) : null,
    current: months[i]!.label,
    next: i < months.length - 1 ? shortName(months[i + 1]!) : null,
  };
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

  const stream = buildStream({ months, bounds });

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
