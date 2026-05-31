import { describe, expect, it } from 'vitest';

import {
  findPlacedFlowersAtPoint,
  flowerPlotSize,
  getFlowerHitEllipse,
  pointInEllipse,
} from '../../src/garden/hit-test';
import { scatterInCluster } from '../../src/garden/scatter';
import type { EntryRecord } from '../../src/types';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: overrides.id ?? 'e1',
    userId: 'local',
    title: null,
    content: 'A memory.',
    mood: null,
    inferredSentiment: null,
    tags: [],
    createdAt: overrides.createdAt ?? '2026-05-15T12:00:00.000Z',
    updatedAt: overrides.createdAt ?? '2026-05-15T12:00:00.000Z',
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: { x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    ...overrides,
  };
}

describe('flowerPlotSize', () => {
  it('uses default, anniversary, and favourited sizes', () => {
    expect(flowerPlotSize(entry()).flowerSize).toBe(140);
    expect(flowerPlotSize(entry({ isFavourited: true })).flowerSize).toBe(156);
  });
});

describe('getFlowerHitEllipse', () => {
  it('centers bloom hit region above stem base', () => {
    const ellipse = getFlowerHitEllipse(entry(), { x: 200, y: 400 });
    expect(ellipse.cx).toBe(200);
    expect(ellipse.cy).toBeLessThan(400);
    expect(ellipse.rx).toBeGreaterThan(50);
    expect(ellipse.ry).toBeGreaterThan(40);
  });
});

describe('findPlacedFlowersAtPoint', () => {
  it('returns hits sorted closest-first and ignores distant blooms', () => {
    const near = {
      entry: entry({ id: 'near' }),
      position: { x: 100, y: 300, z: 1, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const far = {
      entry: entry({ id: 'far' }),
      position: { x: 400, y: 300, z: 2, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const nearEllipse = getFlowerHitEllipse(near.entry, near.position);
    const hits = findPlacedFlowersAtPoint(nearEllipse.cx, nearEllipse.cy, [far, near]);
    expect(hits.map((h) => h.entry.id)).toEqual(['near']);
  });

  it('returns multiple overlapping candidates', () => {
    const a = {
      entry: entry({ id: 'a' }),
      position: { x: 100, y: 300, z: 1, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const b = {
      entry: entry({ id: 'b' }),
      position: { x: 118, y: 300, z: 2, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const overlapX = (getFlowerHitEllipse(a.entry, a.position).cx +
      getFlowerHitEllipse(b.entry, b.position).cx) / 2;
    const overlapY = getFlowerHitEllipse(a.entry, a.position).cy;
    const hits = findPlacedFlowersAtPoint(overlapX, overlapY, [a, b]);
    expect(hits.length).toBe(2);
  });
});

describe('pointInEllipse', () => {
  it('accepts center and rejects outside points', () => {
    const ellipse = { cx: 0, cy: 0, rx: 10, ry: 8 };
    expect(pointInEllipse(0, 0, ellipse)).toBe(true);
    expect(pointInEllipse(10, 0, ellipse)).toBe(true);
    expect(pointInEllipse(11, 0, ellipse)).toBe(false);
  });
});

describe('scatterInCluster fallback', () => {
  it('keeps fallback points at least minDistance apart for dense clusters', () => {
    const points = scatterInCluster(12, 400, 300, 148, 80, 42, 128);
    expect(points).toHaveLength(12);
    for (let i = 0; i < points.length; i += 1) {
      for (let j = i + 1; j < points.length; j += 1) {
        const dx = points[i]!.x - points[j]!.x;
        const dy = points[i]!.y - points[j]!.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(127.5);
      }
    }
  });
});
