import { SeededRNG, hashString } from '../flowers/seeded-rng';
import { scatterInCluster } from '../garden/scatter';
import type { EntryRecord, GardenPosition } from '../types';
import { format, parseISO } from 'date-fns';

export interface LayoutBounds {
  width: number;
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
  groundY: number;
  centerX: number;
}

function monthKey(dateIso: string): string {
  const d = parseISO(dateIso);
  return format(d, 'yyyy-MM');
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return format(new Date(y!, m! - 1, 1), 'MMM yyyy');
}

function clusterCenterX(monthIndex: number, width: number): number {
  const slots = [0.25, 0.5, 0.75];
  return width * slots[monthIndex % 3]!;
}

function depthScale(z: number, maxZ: number): number {
  if (maxZ <= 0) return 1;
  return 0.72 + (z / maxZ) * 0.35;
}

/**
 * Deterministic layout — ignores stale DB coords for display.
 * x/y = stem base on scroll canvas.
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
  const paddingTop = 200;
  const clusterBandHeight = 280;
  let cursorY = paddingTop;
  const maxMonthIndex = Math.max(monthKeys.length - 1, 0);

  monthKeys.forEach((key, monthIndex) => {
    const clusterEntries = byMonth.get(key) ?? [];
    const centerX = clusterCenterX(monthIndex, bounds.width);
    const groundY = cursorY + clusterBandHeight * 0.55;
    const radiusX = Math.min(bounds.width * 0.4, 180);
    const radiusY = 90;

    const scatterSeed = hashString(key + String(clusterEntries.length));
    const points = scatterInCluster(
      clusterEntries.length,
      centerX,
      groundY,
      radiusX,
      radiusY,
      scatterSeed,
      78
    );

    clusterEntries.forEach((entry, index) => {
      const pt = points[index] ?? { x: centerX, y: groundY };
      const rng = new SeededRNG(hashString(entry.id + key));
      const z = monthIndex * 100 + index;
      const maxZ = maxMonthIndex * 100 + clusterEntries.length;
      const scale = depthScale(z, maxZ);

      const position: GardenPosition = {
        x: pt.x + rng.range(-6, 6),
        y: pt.y,
        z,
        rotation: rng.range(-22, 22),
        scale,
      };

      placed.push({ entry, position, monthKey: key });
    });

    cursorY += clusterBandHeight + 60;
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

  for (const p of layout) {
    if (seen.has(p.monthKey)) continue;
    seen.add(p.monthKey);
    const inMonth = layout.filter((x) => x.monthKey === p.monthKey);
    const groundY = Math.min(...inMonth.map((x) => x.position.y));
    const centerX =
      inMonth.reduce((s, x) => s + x.position.x, 0) / Math.max(inMonth.length, 1);
    clusters.push({
      monthKey: p.monthKey,
      label: monthLabel(p.monthKey),
      groundY: groundY - 48,
      centerX,
    });
  }

  return clusters.sort((a, b) => a.monthKey.localeCompare(b.monthKey));
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
  const monthKeys = [...new Set(layout.map((p) => p.monthKey))].sort();
  const monthIndex = monthKeys.indexOf(key);
  const centerX =
    monthIndex >= 0 ? clusterCenterX(monthIndex, bounds.width) : bounds.width * 0.5;

  const groundY =
    sameMonth.length > 0
      ? Math.max(...sameMonth.map((p) => p.position.y)) + 64
      : layout.length > 0
        ? Math.max(...layout.map((p) => p.position.y)) + 120
        : 200;

  const scatterSeed = hashString(key + newEntryId + String(sameMonth.length));
  const [pt] = scatterInCluster(1, centerX, groundY, 80, 50, scatterSeed, 40);

  const z =
    (monthIndex >= 0 ? monthIndex : monthKeys.length) * 100 + sameMonth.length;
  const maxZ = Math.max(z, 1);

  return {
    x: pt?.x ?? centerX,
    y: pt?.y ?? groundY,
    z,
    rotation: rng.range(-18, 18),
    scale: depthScale(z, maxZ),
  };
}
