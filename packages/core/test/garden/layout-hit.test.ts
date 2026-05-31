import { describe, expect, it } from 'vitest';

import { computeGardenLayout } from '../../src/garden/layout';
import { findPlacedFlowersAtPoint, getFlowerHitEllipse } from '../../src/garden/hit-test';
import type { EntryRecord } from '../../src/types';

function entry(id: string, createdAt: string): EntryRecord {
  return {
    id,
    userId: 'local',
    title: `Memory ${id}`,
    content: 'Garden memory content for spacing test.',
    mood: 'peaceful',
    inferredSentiment: null,
    tags: [],
    createdAt,
    updatedAt: createdAt,
    flowerSeed: id.charCodeAt(0),
    flowerStyle: 'organic',
    gardenPosition: { x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
  };
}

describe('computeGardenLayout spacing', () => {
  it('keeps stem bases at least 128px apart within a dense month', () => {
    const monthEntries = Array.from({ length: 8 }, (_, i) =>
      entry(`dense-${i}`, `2026-05-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`)
    );
    const layout = computeGardenLayout(monthEntries, { width: 390, height: 844 });
    const may = layout.filter((plot) => plot.monthKey === '2026-05');

    expect(may.length).toBe(8);
    for (let i = 0; i < may.length; i += 1) {
      for (let j = i + 1; j < may.length; j += 1) {
        const dx = may[i]!.position.x - may[j]!.position.x;
        const dy = may[i]!.position.y - may[j]!.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist).toBeGreaterThanOrEqual(127.5);
      }
    }
  });
});

describe('garden tap disambiguation', () => {
  it('returns multiple hits when bloom ellipses overlap', () => {
    const a = entry('a', '2026-05-01T12:00:00.000Z');
    const b = entry('b', '2026-05-02T12:00:00.000Z');
    const plotA = {
      entry: a,
      position: { x: 200, y: 400, z: 1, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const plotB = {
      entry: b,
      position: { x: 230, y: 400, z: 2, rotation: 0, scale: 1 },
      monthKey: '2026-05',
    };
    const ellipseA = getFlowerHitEllipse(plotA.entry, plotA.position);
    const overlapHits = findPlacedFlowersAtPoint(ellipseA.cx, ellipseA.cy, [plotA, plotB]);
    expect(overlapHits.length).toBeGreaterThanOrEqual(2);

    const soloHits = findPlacedFlowersAtPoint(ellipseA.cx, ellipseA.cy, [plotA]);
    expect(soloHits).toHaveLength(1);
    expect(soloHits[0]?.entry.id).toBe('a');
  });
});
