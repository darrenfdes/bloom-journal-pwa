import { SeededRNG, hashString } from '../flowers/seeded-rng';
import {
  getGardenFlowerVerticalRange,
  getGardenGroundLineY,
} from '../garden/scene-layout';
import { scatterInCluster, type ScatterPoint } from '../garden/scatter';
import type { EntryRecord, GardenPosition } from '../types';
import { format, parseISO } from 'date-fns';

export const GARDEN_CLUSTER_BAND_WIDTH = 320;
/** Spacer between month columns after the rightmost bloom in the previous month. */
export const GARDEN_INTER_MONTH_GAP = 20;
/** @deprecated Use GARDEN_INTER_MONTH_GAP — kept for callers that still import the old name. */
export const GARDEN_CLUSTER_GAP = GARDEN_INTER_MONTH_GAP;
export const GARDEN_PADDING_LEFT = 200;
export const GARDEN_PADDING_RIGHT = 200;

const GARDEN_STEM_EDGE_MARGIN = 48;
const FLOW_CENTER_ANCHOR_FIRST = 0.5;
const FLOW_CENTER_ANCHOR_NEXT = 0.55;
const GARDEN_CLUSTER_MIN_DISTANCE = 128;

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
  /** Virtualizer / ground overlay width for this month band. */
  columnWidth: number;
  /** Shared horizon Y for labels and ground overlays. */
  groundY: number;
}

interface MonthColumnPlan {
  monthKey: string;
  monthIndex: number;
  columnLeft: number;
  columnWidth: number;
  centerX: number;
  centerY: number;
}

interface ClusterScatterParams {
  radiusX: number;
  radiusY: number;
  minY: number;
  maxY: number;
}

function monthKey(dateIso: string): string {
  const d = parseISO(dateIso);
  return format(d, 'yyyy-MM');
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return format(new Date(y!, m! - 1, 1), 'MMM yyyy');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clusterCenterY(
  monthIndex: number,
  minY: number,
  maxY: number,
  monthCount: number
): number {
  const depthLanes = Math.max(5, Math.min(6, monthCount || 1));
  const lane = monthIndex % depthLanes;
  const laneT = depthLanes <= 1 ? 0 : lane / (depthLanes - 1);
  const bandSpan = maxY - minY;
  // Bias toward the lower meadow (near groundY / month tag) — anchor at 55-75%
  const easedT = 0.55 + laneT * 0.2;
  return minY + bandSpan * easedT;
}

function getClusterScatterParams(
  bounds: LayoutBounds,
  monthIndex: number,
  monthCount: number,
  entryCount = 1
): ClusterScatterParams {
  const { minY, maxY } = getGardenFlowerVerticalRange(bounds.height);
  const densityBoost = 1 + Math.max(0, entryCount - 3) * 0.1;
  const radiusX = Math.min(GARDEN_CLUSTER_BAND_WIDTH * 0.46, 148) * densityBoost;
  const radiusY = Math.max(44, (maxY - minY) * 0.46) * densityBoost;
  return {
    radiusX,
    radiusY,
    minY,
    maxY,
  };
}

function depthScale(z: number, maxZ: number): number {
  if (maxZ <= 0) return 1;
  return 0.72 + (z / maxZ) * 0.35;
}

function applyStemJitter(
  pt: ScatterPoint,
  rng: SeededRNG,
  scatterParams: ClusterScatterParams,
  existing: GardenPosition[]
): { x: number; y: number } {
  const jittered = {
    x: pt.x + rng.range(-4, 4),
    y: clamp(pt.y + rng.range(-6, 6), scatterParams.minY, scatterParams.maxY),
  };

  const tooClose = existing.some((p) => {
    const dx = p.x - jittered.x;
    const dy = p.y - jittered.y;
    return Math.sqrt(dx * dx + dy * dy) < GARDEN_CLUSTER_MIN_DISTANCE;
  });

  if (tooClose) {
    return {
      x: pt.x,
      y: clamp(pt.y, scatterParams.minY, scatterParams.maxY),
    };
  }

  return jittered;
}

/** Shared stem-base Y for all flowers on the horizontal timeline. */
export function getGardenGroundY(bounds: LayoutBounds): number {
  return getGardenGroundLineY(bounds.height);
}

function bandContentWidthFromClusters(
  clusters: MonthCluster[],
  paddingLeft: number
): number {
  if (clusters.length === 0) return GARDEN_CLUSTER_BAND_WIDTH;
  const last = clusters[clusters.length - 1]!;
  return last.groundX + last.columnWidth - paddingLeft;
}

function estimateBandContentWidth(monthCount: number): number {
  if (monthCount <= 0) return GARDEN_CLUSTER_BAND_WIDTH;
  return (
    monthCount * GARDEN_CLUSTER_BAND_WIDTH +
    Math.max(0, monthCount - 1) * GARDEN_INTER_MONTH_GAP
  );
}

export interface GardenHorizontalPadding {
  paddingLeft: number;
  paddingRight: number;
}

/** Side padding — centers a single month column when the pan is wider than the band. */
export function getGardenHorizontalPadding(
  bounds: LayoutBounds,
  monthCount: number,
  clusters?: MonthCluster[]
): GardenHorizontalPadding {
  const paddingLeft = GARDEN_PADDING_LEFT;
  const bandContent =
    clusters && clusters.length > 0
      ? bandContentWidthFromClusters(clusters, paddingLeft)
      : estimateBandContentWidth(monthCount);
  if (monthCount <= 1 && bounds.width > bandContent) {
    const side = Math.max(16, (bounds.width - bandContent) / 2);
    return { paddingLeft: side, paddingRight: side };
  }
  return { paddingLeft: GARDEN_PADDING_LEFT, paddingRight: GARDEN_PADDING_RIGHT };
}

export function getGardenPaddingLeft(
  bounds: LayoutBounds,
  monthCount: number,
  clusters?: MonthCluster[]
): number {
  return getGardenHorizontalPadding(bounds, monthCount, clusters).paddingLeft;
}

/** Total world width for the horizontal garden canvas. */
export function getGardenContentWidth(
  clusters: MonthCluster[],
  viewportWidth = 0,
  bounds?: LayoutBounds
): number {
  const monthCount = clusters.length;
  const padding = bounds
    ? getGardenHorizontalPadding(bounds, monthCount, clusters)
    : { paddingLeft: GARDEN_PADDING_LEFT, paddingRight: GARDEN_PADDING_RIGHT };
  const bandContent =
    monthCount > 0
      ? bandContentWidthFromClusters(clusters, padding.paddingLeft)
      : GARDEN_CLUSTER_BAND_WIDTH;

  if (monthCount <= 1 && viewportWidth > bandContent) {
    return viewportWidth;
  }
  if (monthCount <= 0) {
    return padding.paddingLeft + padding.paddingRight + GARDEN_CLUSTER_BAND_WIDTH;
  }
  return padding.paddingLeft + bandContent + padding.paddingRight;
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

/** Month cluster whose column band contains this world-space X. */
export function resolveClusterAtWorldX(
  worldX: number,
  clusters: MonthCluster[]
): MonthCluster | null {
  for (const cluster of clusters) {
    if (worldX >= cluster.groundX && worldX < cluster.groundX + cluster.columnWidth) {
      return cluster;
    }
  }
  if (clusters.length === 0) return null;
  let best = clusters[0]!;
  let bestDist = Math.abs(worldX - (best.groundX + best.columnWidth / 2));
  for (let i = 1; i < clusters.length; i += 1) {
    const c = clusters[i]!;
    const dist = Math.abs(worldX - (c.groundX + c.columnWidth / 2));
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
    }
  }
  return best;
}

function groupEntriesByMonth(entries: EntryRecord[]): {
  byMonth: Map<string, EntryRecord[]>;
  monthKeys: string[];
} {
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

  return { byMonth, monthKeys: [...byMonth.keys()].sort() };
}

function plansToClusters(plans: MonthColumnPlan[], groundY: number): MonthCluster[] {
  return plans.map((plan) => ({
    monthKey: plan.monthKey,
    label: monthLabel(plan.monthKey),
    groundX: plan.columnLeft,
    centerX: plan.centerX,
    columnWidth: plan.columnWidth,
    groundY: groundY - 48,
  }));
}

function computeMonthColumnPlans(
  byMonth: Map<string, EntryRecord[]>,
  monthKeys: string[],
  bounds: LayoutBounds,
  paddingLeft: number
): MonthColumnPlan[] {
  let cursorX = paddingLeft;
  const plans: MonthColumnPlan[] = [];
  const monthCount = monthKeys.length;

  monthKeys.forEach((key, monthIndex) => {
    const clusterEntries = byMonth.get(key) ?? [];
    const columnLeft = cursorX;
    const anchor = monthIndex > 0 ? FLOW_CENTER_ANCHOR_NEXT : FLOW_CENTER_ANCHOR_FIRST;
    const centerX = columnLeft + GARDEN_CLUSTER_BAND_WIDTH * anchor;
    const scatterParams = getClusterScatterParams(
      bounds,
      monthIndex,
      monthCount,
      clusterEntries.length
    );
    const centerY = clusterCenterY(
      monthIndex,
      scatterParams.minY,
      scatterParams.maxY,
      monthCount
    );

    const scatterSeed = hashString(key + String(clusterEntries.length));
    const points = scatterInCluster(
      clusterEntries.length,
      centerX,
      centerY,
      scatterParams.radiusX,
      scatterParams.radiusY,
      scatterSeed,
      GARDEN_CLUSTER_MIN_DISTANCE
    );

    let maxFlowerX = columnLeft;
    clusterEntries.forEach((entry, index) => {
      const pt = points[index] ?? { x: centerX, y: centerY };
      const rng = new SeededRNG(hashString(entry.id + key));
      const x = pt.x + rng.range(-4, 4);
      maxFlowerX = Math.max(maxFlowerX, x);
    });

    const columnRight =
      clusterEntries.length === 0
        ? columnLeft + GARDEN_CLUSTER_BAND_WIDTH
        : maxFlowerX + GARDEN_STEM_EDGE_MARGIN;
    const columnWidth = Math.max(
      GARDEN_CLUSTER_BAND_WIDTH * 0.5,
      columnRight - columnLeft
    );

    plans.push({
      monthKey: key,
      monthIndex,
      columnLeft,
      columnWidth,
      centerX,
      centerY,
    });

    cursorX = columnLeft + columnWidth + GARDEN_INTER_MONTH_GAP;
  });

  return plans;
}

function resolveColumnPlans(
  byMonth: Map<string, EntryRecord[]>,
  monthKeys: string[],
  bounds: LayoutBounds
): MonthColumnPlan[] {
  let paddingLeft = getGardenPaddingLeft(bounds, monthKeys.length);
  let plans = computeMonthColumnPlans(byMonth, monthKeys, bounds, paddingLeft);

  if (monthKeys.length <= 1) {
    const groundY = getGardenGroundY(bounds);
    const preliminary = plansToClusters(plans, groundY);
    const padding = getGardenHorizontalPadding(bounds, monthKeys.length, preliminary);
    if (padding.paddingLeft !== paddingLeft) {
      paddingLeft = padding.paddingLeft;
      plans = computeMonthColumnPlans(byMonth, monthKeys, bounds, paddingLeft);
    }
  }

  return plans;
}

/**
 * Deterministic layout — ignores stale DB coords for display.
 * Oldest months on the left, newest on the right; x/y = stem base on world canvas.
 */
export function computeGardenLayout(
  entries: EntryRecord[],
  bounds: LayoutBounds
): PlacedFlower[] {
  const { byMonth, monthKeys } = groupEntriesByMonth(entries);
  const plans = resolveColumnPlans(byMonth, monthKeys, bounds);
  const placed: PlacedFlower[] = [];
  const maxMonthIndex = Math.max(monthKeys.length - 1, 0);
  const monthCount = monthKeys.length;

  for (const plan of plans) {
    const clusterEntries = byMonth.get(plan.monthKey) ?? [];
    const scatterParams = getClusterScatterParams(
      bounds,
      plan.monthIndex,
      monthCount,
      clusterEntries.length
    );
    const scatterSeed = hashString(plan.monthKey + String(clusterEntries.length));
    const points = scatterInCluster(
      clusterEntries.length,
      plan.centerX,
      plan.centerY,
      scatterParams.radiusX,
      scatterParams.radiusY,
      scatterSeed,
      GARDEN_CLUSTER_MIN_DISTANCE
    );

    clusterEntries.forEach((entry, index) => {
      const pt = points[index] ?? { x: plan.centerX, y: plan.centerY };
      const rng = new SeededRNG(hashString(entry.id + plan.monthKey));
      const z = plan.monthIndex * 100 + index;
      const maxZ = maxMonthIndex * 100 + clusterEntries.length;
      const scale = depthScale(z, maxZ);
      const sameMonthPositions = placed
        .filter((p) => p.monthKey === plan.monthKey)
        .map((p) => p.position);
      const stem = applyStemJitter(pt, rng, scatterParams, sameMonthPositions);

      const position: GardenPosition = {
        x: stem.x,
        y: stem.y,
        z,
        rotation: rng.range(-22, 22),
        scale,
      };

      placed.push({ entry, position, monthKey: plan.monthKey });
    });
  }

  return placed;
}

export function getMonthClusters(
  entries: EntryRecord[],
  bounds: LayoutBounds
): MonthCluster[] {
  const layout = computeGardenLayout(entries, bounds);
  const { byMonth, monthKeys } = groupEntriesByMonth(entries);
  const plans = resolveColumnPlans(byMonth, monthKeys, bounds);
  const groundY = getGardenGroundY(bounds);

  return plans.map((plan) => {
    const inMonth = layout.filter((x) => x.monthKey === plan.monthKey);
    const centerX =
      inMonth.reduce((s, x) => s + x.position.x, 0) / Math.max(inMonth.length, 1);

    return {
      monthKey: plan.monthKey,
      label: monthLabel(plan.monthKey),
      groundX: plan.columnLeft,
      centerX,
      columnWidth: plan.columnWidth,
      groundY: groundY - 48,
    };
  });
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
  const { byMonth, monthKeys } = groupEntriesByMonth(entries);
  const monthIndex = monthKeys.indexOf(key);
  const scatterParams = getClusterScatterParams(
    bounds,
    monthIndex >= 0 ? monthIndex : monthKeys.length,
    monthKeys.length,
    sameMonth.length + 1
  );
  const plans = resolveColumnPlans(byMonth, monthKeys, bounds);
  const plan = plans.find((p) => p.monthKey === key);
  const paddingLeft = plans[0]?.columnLeft ?? getGardenPaddingLeft(bounds, monthKeys.length);

  const centerX = plan?.centerX ?? paddingLeft + GARDEN_CLUSTER_BAND_WIDTH * 0.5;
  const centerY = plan?.centerY ?? clusterCenterY(
    monthIndex >= 0 ? monthIndex : monthKeys.length,
    scatterParams.minY,
    scatterParams.maxY,
    monthKeys.length
  );

  const scatterSeed = hashString(key + newEntryId + String(sameMonth.length));
  const [pt] = scatterInCluster(
    1,
    centerX,
    centerY,
    scatterParams.radiusX * 0.66,
    scatterParams.radiusY * 0.7,
    scatterSeed,
    40
  );

  const z =
    (monthIndex >= 0 ? monthIndex : monthKeys.length) * 100 + sameMonth.length;
  const maxZ = Math.max(z, 1);

  return {
    x: pt?.x ?? centerX,
    y: clamp(pt?.y ?? centerY, scatterParams.minY, scatterParams.maxY),
    z,
    rotation: rng.range(-18, 18),
    scale: depthScale(z, maxZ),
  };
}
