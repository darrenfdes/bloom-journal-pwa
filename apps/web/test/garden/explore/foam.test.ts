import { describe, expect, it } from 'vitest';

import { STREAM_HALF_WIDTH } from '@/lib/garden/explore/constants';
import { foamBlobs, foamPulse, riffleSites, riffleStones } from '@/lib/garden/explore/foam';
import { buildStream, closestOnStream } from '@/lib/garden/explore/stream';
import type { MonthRegion, WorldBounds } from '@/lib/garden/explore/world-layout';

const bounds: WorldBounds = { minX: -12, maxX: 96, minZ: -26, maxZ: 12 };
const months = (n: number): MonthRegion[] =>
  Array.from({ length: n }, (_, i) => ({ key: i, label: `M${i}`, xStart: i * 28, xCenter: i * 28 + 14 }));
const stream = buildStream({ months: months(3), bounds, widthM: 3 * 28 })!;

describe('riffleSites', () => {
  it('places every site in narrow water, spaced apart, deterministically', () => {
    const sites = riffleSites(stream, 7);
    expect(sites.length).toBeGreaterThan(0);
    for (const site of sites) {
      expect(site.halfWidth).toBeLessThanOrEqual(STREAM_HALF_WIDTH + 0.5);
      expect(Math.hypot(site.tangent.x, site.tangent.z)).toBeCloseTo(1);
    }
    for (let i = 0; i < sites.length; i++) {
      for (let j = i + 1; j < sites.length; j++) {
        expect(Math.abs(sites[i]!.t - sites[j]!.t)).toBeGreaterThanOrEqual(0.08);
      }
    }
    expect(riffleSites(stream, 7)).toEqual(sites);
  });

  it('sites sit on the centerline (dist ≈ 0)', () => {
    for (const site of riffleSites(stream, 7)) {
      expect(closestOnStream(site.x, site.z, stream).dist).toBeCloseTo(0, 5);
    }
  });
});

describe('foamBlobs', () => {
  it('keeps every blob inside the channel and is deterministic', () => {
    const sites = riffleSites(stream, 7);
    const blobs = foamBlobs(sites, stream, 11);
    expect(blobs.length).toBeGreaterThan(0);
    for (const blob of blobs) {
      const s = closestOnStream(blob.x, blob.z, stream);
      expect(s.dist).toBeLessThan(s.halfWidth);
      expect(blob.scale).toBeGreaterThan(0);
    }
    expect(foamBlobs(sites, stream, 11)).toEqual(blobs);
  });
});

describe('foamPulse', () => {
  const blob = { x: 0, z: 0, scale: 0.8, phase: 1.2 };

  it('shimmers over time', () => {
    const a = foamPulse(blob, 1);
    const b = foamPulse(blob, 2);
    expect(a).not.toEqual(b);
    for (const p of [a, b]) {
      expect(p.scale).toBeGreaterThan(0);
      expect(p.opacity).toBeGreaterThan(0);
      expect(p.opacity).toBeLessThanOrEqual(0.6);
    }
  });

  it('is frozen under reduced motion', () => {
    expect(foamPulse(blob, 1, true)).toEqual(foamPulse(blob, 99, true));
  });
});

describe('riffleStones', () => {
  it('places 1–2 stones per site inside the channel, deterministically', () => {
    const sites = riffleSites(stream, 7);
    const stones = riffleStones(sites, 13);
    expect(stones.length).toBeGreaterThanOrEqual(sites.length);
    expect(stones.length).toBeLessThanOrEqual(sites.length * 2);
    for (const stone of stones) {
      const s = closestOnStream(stone.x, stone.z, stream);
      expect(s.dist).toBeLessThan(s.halfWidth);
      expect(stone.scale).toBeGreaterThan(0);
    }
    expect(riffleStones(sites, 13)).toEqual(stones);
  });
});
