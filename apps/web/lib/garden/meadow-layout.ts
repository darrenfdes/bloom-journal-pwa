/**
 * Deterministic month-column layout for the rebuilt meadow world.
 *
 * Models the reference (refernce.html) `groupMonths` + `buildWorld`: entries are
 * grouped by month into fixed-width columns laid left→right, then scattered
 * within their column slot. Placement is seeded by `entry.id`, so a flower's
 * position is stable across sessions.
 */
import { format, parseISO } from 'date-fns';

import type { EntryRecord } from '@bloom/core';
import { createRng, hashString } from '@bloom/core';
import { flowerPlotSize } from '@bloom/core/garden/hit-test';

import {
  COLUMN_GAP,
  COLUMN_WIDTH,
  EDGE_PADDING,
  getGroundY,
} from '@/lib/scene/garden-proportions';

export interface PlacedMeadowFlower {
  entry: EntryRecord;
  /** World X of the flower's center. */
  x: number;
  /** World Y of the flower's stem base (it is drawn upward from here). */
  baseY: number;
  /** Depth scale (further back = smaller). */
  scale: number;
  /** Stacking order — closer (deeper) flowers paint on top. */
  zIndex: number;
  /** Closer-to-camera flowers sway harder. */
  deep: boolean;
  /** Unscaled flower render size (px) from core's flowerPlotSize. */
  flowerSize: number;
}

export interface MeadowMonth {
  /** "yyyy-MM" */
  key: string;
  /** "JUN 2026" */
  label: string;
  /** "JUN" */
  labelMonth: string;
  /** "2026" */
  labelYear: string;
  /** "JUN '26" — compact timeline form. */
  labelCompact: string;
  /** Left edge of the column in world space. */
  x0: number;
  /** Horizontal center of the column. */
  centerX: number;
  flowers: PlacedMeadowFlower[];
}

export interface MeadowLayout {
  months: MeadowMonth[];
  worldWidth: number;
}

function monthKey(dateIso: string): string {
  return format(parseISO(dateIso), 'yyyy-MM');
}

function buildLabels(key: string) {
  const [y, m] = key.split('-').map(Number);
  const date = new Date(y!, m! - 1, 1);
  return {
    label: format(date, 'MMM yyyy').toUpperCase(),
    labelMonth: format(date, 'MMM').toUpperCase(),
    labelYear: format(date, 'yyyy'),
    labelCompact: `${format(date, 'MMM').toUpperCase()} '${format(date, 'yy')}`,
  };
}

export function buildMeadowLayout(
  entries: EntryRecord[],
  viewportHeight: number
): MeadowLayout {
  const groundY = getGroundY(viewportHeight);

  const byMonth = new Map<string, EntryRecord[]>();
  for (const entry of entries) {
    const key = monthKey(entry.createdAt);
    const list = byMonth.get(key);
    if (list) list.push(entry);
    else byMonth.set(key, [entry]);
  }

  const sortedKeys = Array.from(byMonth.keys()).sort();

  const months: MeadowMonth[] = sortedKeys.map((key, monthIndex) => {
    const x0 = EDGE_PADDING + monthIndex * (COLUMN_WIDTH + COLUMN_GAP);
    const monthEntries = (byMonth.get(key) ?? [])
      .slice()
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

    const slotWidth = (COLUMN_WIDTH - 56) / Math.max(1, monthEntries.length);

    const flowers: PlacedMeadowFlower[] = monthEntries.map((entry, i) => {
      const rng = createRng(hashString(`${entry.id}:pos`));
      const x = x0 + 28 + slotWidth * (i + 0.15 + rng() * 0.7);
      const depth = rng() * 60;
      const scale = 0.84 + (depth / 60) * 0.32;
      const { flowerSize } = flowerPlotSize(entry);
      return {
        entry,
        x,
        baseY: groundY + 16 + depth,
        scale,
        zIndex: 100 + Math.round(depth),
        deep: depth > 32,
        flowerSize,
      };
    });

    return {
      key,
      ...buildLabels(key),
      x0,
      centerX: x0 + COLUMN_WIDTH / 2,
      flowers,
    };
  });

  const worldWidth =
    EDGE_PADDING * 2 +
    months.length * COLUMN_WIDTH +
    Math.max(0, months.length - 1) * COLUMN_GAP;

  return { months, worldWidth };
}
