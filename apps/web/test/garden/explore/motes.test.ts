import { describe, expect, it } from 'vitest';

import { PHASE_ORDER, PHASES } from '@/lib/garden/bloom/phases';
import {
  buildMotes,
  FIREFLY_BOX,
  FIREFLY_COUNT,
  fireflyIntensity,
  moteAt,
  moteOpacityFor,
  POLLEN_BOX,
  POLLEN_COUNT,
} from '@/lib/garden/explore/motes';

describe('buildMotes', () => {
  it('is deterministic for the same seed', () => {
    const a = buildMotes(7, 12, FIREFLY_BOX);
    const b = buildMotes(7, 12, FIREFLY_BOX);
    expect(a).toEqual(b);
    expect(a).toHaveLength(12);
  });

  it('keeps every mote inside its box across an hour of drift', () => {
    for (const [box, count] of [
      [FIREFLY_BOX, FIREFLY_COUNT],
      [POLLEN_BOX, POLLEN_COUNT],
    ] as const) {
      const motes = buildMotes(11, count, box);
      for (const m of motes) {
        for (let t = 0; t < 3600; t += 97.3) {
          const p = moteAt(m, t);
          expect(p.x).toBeGreaterThanOrEqual(0);
          expect(p.x).toBeLessThanOrEqual(box.w);
          expect(p.z).toBeGreaterThanOrEqual(0);
          expect(p.z).toBeLessThanOrEqual(box.d);
          expect(p.y).toBeGreaterThanOrEqual(box.yMin);
          expect(p.y).toBeLessThanOrEqual(box.yMin + box.h);
        }
      }
    }
  });
});

describe('fireflyIntensity', () => {
  it('pulses between dark and bright within 0..1', () => {
    const [m] = buildMotes(3, 1, FIREFLY_BOX);
    let min = 1;
    let max = 0;
    for (let t = 0; t < 30; t += 0.05) {
      const v = fireflyIntensity(m!, t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    expect(min).toBeLessThan(0.05);
    expect(max).toBeGreaterThan(0.85);
  });
});

describe('moteOpacityFor', () => {
  it('matches the 2D phase opacities exactly in clear weather', () => {
    for (const phase of PHASE_ORDER) {
      expect(moteOpacityFor('fire', phase, 'clear')).toBeCloseTo(PHASES[phase].fire);
      expect(moteOpacityFor('pollen', phase, 'clear')).toBeCloseTo(PHASES[phase].pollen);
    }
  });

  it('hides fireflies by day and pollen at night', () => {
    expect(moteOpacityFor('fire', 'day', 'clear')).toBe(0);
    expect(moteOpacityFor('pollen', 'night', 'clear')).toBe(0);
  });

  it('mutes everything in precipitation and softens under grey skies', () => {
    expect(moteOpacityFor('fire', 'night', 'rain')).toBe(0);
    expect(moteOpacityFor('fire', 'night', 'thunderstorm')).toBe(0);
    expect(moteOpacityFor('pollen', 'day', 'snow')).toBe(0);
    expect(moteOpacityFor('fire', 'night', 'overcast')).toBeCloseTo(PHASES.night.fire * 0.4);
    expect(moteOpacityFor('pollen', 'day', 'fog')).toBeCloseTo(PHASES.day.pollen * 0.4);
    expect(moteOpacityFor('fire', 'night', undefined)).toBeCloseTo(PHASES.night.fire);
  });
});
