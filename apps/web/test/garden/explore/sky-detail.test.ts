import { describe, expect, it } from 'vitest';

import { PHASE_ORDER } from '@/lib/garden/bloom/phases';
import {
  buildCloudField,
  CLOUD_MAX,
  cloudOpacityFor,
  cloudTintFor,
  driftedAzimuth,
  haloLayersFor,
  horizonHazeFor,
  treePaletteFor,
  twinkleOpacity,
  visibleCloudCount,
} from '@/lib/garden/explore/sky-detail';

const HEX = /^#[0-9a-f]{6}$/i;

describe('buildCloudField', () => {
  it('is deterministic and in range', () => {
    const a = buildCloudField(552101, CLOUD_MAX);
    const b = buildCloudField(552101, CLOUD_MAX);
    expect(a).toEqual(b);
    expect(a).toHaveLength(CLOUD_MAX);
    for (const c of a) {
      expect(c.azimuth).toBeGreaterThanOrEqual(0);
      expect(c.azimuth).toBeLessThan(Math.PI * 2);
      expect(c.elevation).toBeGreaterThanOrEqual(0.12);
      expect(c.elevation).toBeLessThanOrEqual(0.55);
      expect(Math.abs(c.drift)).toBeGreaterThanOrEqual(0.002);
      expect(Math.abs(c.drift)).toBeLessThanOrEqual(0.008);
      expect([0, 1, 2]).toContain(c.variant);
      expect(c.baseOpacity).toBeGreaterThan(0);
      expect(c.baseOpacity).toBeLessThanOrEqual(1);
    }
  });
});

describe('visibleCloudCount', () => {
  it('is monotonic in cover and capped at max', () => {
    let prev = -1;
    for (let cover = 0; cover <= 1.0001; cover += 0.1) {
      const n = visibleCloudCount(cover);
      expect(n).toBeGreaterThanOrEqual(prev);
      prev = n;
    }
    expect(visibleCloudCount(0)).toBe(3);
    expect(visibleCloudCount(1)).toBe(CLOUD_MAX);
    expect(visibleCloudCount(5)).toBe(CLOUD_MAX);
    expect(visibleCloudCount(-1)).toBe(3);
  });
});

describe('cloudOpacityFor', () => {
  it('densifies with cover and never exceeds the base', () => {
    expect(cloudOpacityFor(0, 0.8)).toBeCloseTo(0.4);
    expect(cloudOpacityFor(1, 0.8)).toBeCloseTo(0.76);
    expect(cloudOpacityFor(1, 0.8)).toBeLessThanOrEqual(0.8);
  });
});

describe('driftedAzimuth', () => {
  it('wraps into [0, 2π) in both directions', () => {
    expect(driftedAzimuth(6.2, 0.01, 20)).toBeGreaterThanOrEqual(0);
    expect(driftedAzimuth(6.2, 0.01, 20)).toBeLessThan(Math.PI * 2);
    expect(driftedAzimuth(0.1, -0.01, 20)).toBeGreaterThanOrEqual(0);
    expect(driftedAzimuth(0.1, -0.01, 20)).toBeLessThan(Math.PI * 2);
    expect(driftedAzimuth(1, 0.01, 0)).toBeCloseTo(1);
  });
});

describe('phase palettes', () => {
  it('returns valid hex tints/palettes for every phase', () => {
    for (const phase of PHASE_ORDER) {
      expect(cloudTintFor(phase)).toMatch(HEX);
      const tree = treePaletteFor(phase);
      expect(tree.canopy).toMatch(HEX);
      expect(tree.canopyAlt).toMatch(HEX);
      expect(tree.trunk).toMatch(HEX);
      for (const layer of haloLayersFor(phase)) {
        expect(layer.scaleMul).toBeGreaterThan(0);
        expect(layer.opacity).toBeGreaterThan(0);
        expect(layer.opacity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('grows the sun halo at the warm low phases', () => {
    expect(haloLayersFor('golden')[0]!.scaleMul).toBeGreaterThan(haloLayersFor('day')[0]!.scaleMul);
    expect(haloLayersFor('dawn')[1]!.opacity).toBeGreaterThan(haloLayersFor('night')[1]!.opacity);
  });

  it('keeps the night tree palette above near-black so trees stay visible', () => {
    const channels = (hex: string) => parseInt(hex.slice(1), 16);
    const sum = (hex: string) => {
      const n = channels(hex);
      return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
    };
    const night = treePaletteFor('night');
    // Each night colour clears a modest floor — the old palette sat near black (< ~130).
    expect(sum(night.canopy)).toBeGreaterThan(150);
    expect(sum(night.canopyAlt)).toBeGreaterThan(150);
  });
});

describe('horizonHazeFor', () => {
  it('returns valid colors and greys toward overcast as cover rises', () => {
    for (const phase of PHASE_ORDER) {
      expect(horizonHazeFor(phase, 0).color).toMatch(HEX);
    }
    const clear = horizonHazeFor('day', 0);
    const grey = horizonHazeFor('day', 1);
    expect(grey.color).not.toBe(clear.color);
    expect(grey.opacity).toBeGreaterThan(clear.opacity);
  });
});

describe('twinkleOpacity', () => {
  it('stays within [0, base] and varies over time', () => {
    const base = 0.9;
    let min = Infinity;
    let max = -Infinity;
    for (let t = 0; t < 30; t += 0.25) {
      for (const layer of [0, 1, 2] as const) {
        const o = twinkleOpacity(base, layer, t);
        expect(o).toBeGreaterThanOrEqual(0);
        expect(o).toBeLessThanOrEqual(base);
        min = Math.min(min, o);
        max = Math.max(max, o);
      }
    }
    expect(max - min).toBeGreaterThan(0.2);
    expect(twinkleOpacity(0, 0, 5)).toBe(0);
  });
});
