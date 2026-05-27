import { SeededRNG, hashString } from '../flowers/seeded-rng';
import { getGardenGroundLineY } from '../garden/scene-layout';
import { scatterInCluster } from '../garden/scatter';
import type { EntryRecord, GardenPosition } from '../types';
import { format, parseISO } from 'date-fns';

export const GARDEN_CLUSTER_BAND_WIDTH = 320;
export const GARDEN_CLUSTER_GAP = 60;
export const GARDEN_PADDING_LEFT = 200;
export const GARDEN_PADDING_RIGHT = 200;

export interface LayoutBounds {
  width: number;
  /** Viewport height — used to place the shared ground line. */
  height: number;
}

export interface PlacedFlower {
  entry: EntryRecord;
  position: GardenPosition;
  monthKey: string;
}

export interface MonthCluster {
  monthKey: string;
  label: string;
  /** Left edge of the month column (scrubber jump target). */
  groundX: number;
  /** Horizontal center of the month column. */
  centerX: number;
  /** Shared horizon Y for labels and ground overlays. */
  groundY: number;
}

function monthKey(dateIso: string): string {
  const d = parseISO(dateIso);
  return format(d, 'yyyy-MM');
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return format(new Date(y!, m! - 1, 1), 'MMM yyyy');
}

function clusterCenterY(monthIndex: number, groundY: number): number {
  const slots = [0.25, 0.5, 0.75];
  const spread = 56;
  return groundY - spread * slots[monthIndex % 3]!;
}

function depthScale(z: number, maxZ: number): number {
  if (maxZ <= 0) return 1;
  return 0.72 + (z / maxZ) * 0.35;
}

/** Shared stem-base Y for all flowers on the horizontal timeline. */
export function getGardenGroundY(bounds: LayoutBounds): number {
  return getGardenGroundLineY(bounds.height);
}

function monthBandContentWidth(monthCount: number): number {
  if (monthCount <= 0) return GARDEN_CLUSTER_BAND_WIDTH;
  return (
    monthCount * GARDEN_CLUSTER_BAND_WIDTH +
    Math.max(0, monthCount - 1) * GARDEN_CLUSTER_GAP
  );
}

export interface GardenHorizontalPadding {
  paddingLeft: number;
  paddingRight: number;
}

/** Side padding — centers a single month column when the pan is wider than the band. */
export function getGardenHorizontalPadding(
  bounds: LayoutBounds,
  monthCount: number
): GardenHorizontalPadding {
  const bandContent = monthBandContentWidth(monthCount);
  if (monthCount <= 1 && bounds.width > bandContent) {
    const side = Math.max(16, (bounds.width - bandContent) / 2);
    return { paddingLeft: side, paddingRight: side };
  }
  return { paddingLeft: GARDEN_PADDING_LEFT, paddingRight: GARDEN_PADDING_RIGHT };
}

export function getGardenPaddingLeft(bounds: LayoutBounds, monthCount: number): number {
  return getGardenHorizontalPadding(bounds, monthCount).paddingLeft;
}

/** Total world width for the horizontal garden canvas. */
export function getGardenContentWidth(monthCount: number, viewportWidth = 0): number {
  const bandContent = monthBandContentWidth(monthCount);
  if (monthCount <= 1 && viewportWidth > bandContent) {
    return viewportWidth;
  }
  if (monthCount <= 0) {
    return GARDEN_PADDING_LEFT + GARDEN_PADDING_RIGHT + GARDEN_CLUSTER_BAND_WIDTH;
  }
  return GARDEN_PADDING_LEFT + bandContent + GARDEN_PADDING_RIGHT;
}

/** Scroll position that centers the latest month (or empty-garden column) in the viewport. */
export function getGardenFocusScrollX(
  clusters: MonthCluster[],
  viewportWidth: number,
  contentWidth: number
): number {
  const maxScroll = Math.max(0, contentWidth - viewportWidth);
  let centerX: number;
  if (clusters.length > 0) {
    centerX = clusters[clusters.length - 1]!.centerX;
  } else {
    const paddingLeft = getGardenPaddingLeft({ width: viewportWidth, height: 0 }, 0);
    centerX = paddingLeft + GARDEN_CLUSTER_BAND_WIDTH * 0.5;
  }
  return Math.min(Math.max(0, centerX - viewportWidth / 2), maxScroll);
}

function monthColumnLeft(monthIndex: number, paddingLeft: number): number {
  return paddingLeft + monthIndex * (GARDEN_CLUSTER_BAND_WIDTH + GARDEN_CLUSTER_GAP);
}

/**
 * Deterministic layout — ignores stale DB coords for display.
 * Oldest months on the left, newest on the right; x/y = stem base on world canvas.
 */
export function computeGardenLayout(
  entries: EntryRecord[],
  bounds: LayoutBounds
): PlacedFlower[] {
  const active = entries.filter((e) => !e.isDeleted);
  const sorted = [...active].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const byMonth = new Map<string, EntryRecord[]>();
  for (const entry of sorted) {
    const key = monthKey(entry.createdAt);
    const list = byMonth.get(key) ?? [];
    list.push(entry);
    byMonth.set(key, list);
  }

  const monthKeys = [...byMonth.keys()].sort();
  const placed: PlacedFlower[] = [];
  const groundY = getGardenGroundY(bounds);
  const paddingLeft = getGardenPaddingLeft(bounds, monthKeys.length);
  const radiusX = Math.min(GARDEN_CLUSTER_BAND_WIDTH * 0.38, 120);
  const radiusY = 48;
  const maxMonthIndex = Math.max(monthKeys.length - 1, 0);

  monthKeys.forEach((key, monthIndex) => {
    const clusterEntries = byMonth.get(key) ?? [];
    const columnLeft = monthColumnLeft(monthIndex, paddingLeft);
    const centerX = columnLeft + GARDEN_CLUSTER_BAND_WIDTH * 0.5;
    const centerY = clusterCenterY(monthIndex, groundY);

    const scatterSeed = hashString(key + String(clusterEntries.length));
    const points = scatterInCluster(
      clusterEntries.length,
      centerX,
      centerY,
      radiusX,
      radiusY,
      scatterSeed,
      78
    );

    clusterEntries.forEach((entry, index) => {
      const pt = points[index] ?? { x: centerX, y: centerY };
      const rng = new SeededRNG(hashString(entry.id + key));
      const z = monthIndex * 100 + index;
      const maxZ = maxMonthIndex * 100 + clusterEntries.length;
      const scale = depthScale(z, maxZ);

      const position: GardenPosition = {
        x: pt.x + rng.range(-6, 6),
        y: pt.y + rng.range(-4, 4),
        z,
        rotation: rng.range(-22, 22),
        scale,
      };

      placed.push({ entry, position, monthKey: key });
    });
  });

  return placed;
}

export function getMonthClusters(
  entries: EntryRecord[],
  bounds: LayoutBounds
): MonthCluster[] {
  const layout = computeGardenLayout(entries, bounds);
  const seen = new Set<string>();
  const clusters: MonthCluster[] = [];
  const groundY = getGardenGroundY(bounds);
  const monthKeys = [...new Set(layout.map((p) => p.monthKey))].sort();
  const paddingLeft = getGardenPaddingLeft(bounds, monthKeys.length);

  for (const key of monthKeys) {
    if (seen.has(key)) continue;
    seen.add(key);
    const monthIndex = monthKeys.indexOf(key);
    const inMonth = layout.filter((x) => x.monthKey === key);
    const columnLeft = monthColumnLeft(monthIndex, paddingLeft);
    const centerX =
      inMonth.reduce((s, x) => s + x.position.x, 0) / Math.max(inMonth.length, 1);

    clusters.push({
      monthKey: key,
      label: monthLabel(key),
      groundX: columnLeft,
      centerX,
      groundY: groundY - 48,
    });
  }

  return clusters;
}

export function assignPositionForNewEntry(
  entries: EntryRecord[],
  bounds: LayoutBounds,
  newEntryId: string,
  createdAt: string,
  revisitOf?: string | null
): GardenPosition {
  const key = monthKey(createdAt);
  const rng = new SeededRNG(hashString(newEntryId));
  const groundY = getGardenGroundY(bounds);

  if (revisitOf) {
    const layout = computeGardenLayout(entries, bounds);
    const parent = layout.find((p) => p.entry.id === revisitOf);
    if (parent) {
      return {
        x: parent.position.x + 44 + rng.range(-8, 8),
        y: parent.position.y - 12,
        z: parent.position.z + 2,
        rotation: parent.position.rotation + rng.range(-10, 10),
        scale: parent.position.scale * 0.88,
      };
    }
  }

  const layout = computeGardenLayout(entries, bounds);
  const sameMonth = layout.filter((p) => p.monthKey === key);
  const monthKeys = [...new Set(layout.map((p) => p.monthKey))].sort();
  const monthIndex = monthKeys.indexOf(key);
  const paddingLeft = getGardenPaddingLeft(bounds, monthKeys.length);
  const columnLeft =
    monthIndex >= 0 ? monthColumnLeft(monthIndex, paddingLeft) : paddingLeft;
  const centerX = columnLeft + GARDEN_CLUSTER_BAND_WIDTH * 0.5;
  const centerY =
    monthIndex >= 0 ? clusterCenterY(monthIndex, groundY) : groundY;

  const scatterSeed = hashString(key + newEntryId + String(sameMonth.length));
  const [pt] = scatterInCluster(
    1,
    centerX,
    centerY,
    80,
    40,
    scatterSeed,
    40
  );

  const z =
    (monthIndex >= 0 ? monthIndex : monthKeys.length) * 100 + sameMonth.length;
  const maxZ = Math.max(z, 1);

  return {
    x: pt?.x ?? centerX,
    y: pt?.y ?? centerY,
    z,
    rotation: rng.range(-18, 18),
    scale: depthScale(z, maxZ),
  };
}
