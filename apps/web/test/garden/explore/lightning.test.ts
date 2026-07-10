import { describe, expect, it } from 'vitest';

import { flashEnvelope, LIGHTNING, nextFlashDelayMs } from '@/lib/garden/explore/lightning';

describe('nextFlashDelayMs', () => {
  it('spans the 2D cadence for thunderstorms (12–30 s)', () => {
    expect(nextFlashDelayMs('thunderstorm', 0)).toBe(12_000);
    expect(nextFlashDelayMs('thunderstorm', 1)).toBe(30_000);
    expect(nextFlashDelayMs('thunderstorm', 0.5)).toBe(21_000);
  });

  it('spans 36–60 s for heavy rain', () => {
    expect(nextFlashDelayMs('heavy_rain', 0)).toBe(36_000);
    expect(nextFlashDelayMs('heavy_rain', 1)).toBe(60_000);
  });

  it('returns null for categories without lightning', () => {
    expect(nextFlashDelayMs('rain', 0.5)).toBeNull();
    expect(nextFlashDelayMs('clear', 0.5)).toBeNull();
    expect(nextFlashDelayMs('snow', 0.5)).toBeNull();
    expect(nextFlashDelayMs(undefined, 0.5)).toBeNull();
  });
});

describe('flashEnvelope', () => {
  it('peaks instantly, restrikes, and dies within half a second', () => {
    expect(flashEnvelope(0)).toBe(1);
    // Decaying through the first strike…
    expect(flashEnvelope(0.06)).toBeLessThan(1);
    expect(flashEnvelope(0.06)).toBeGreaterThan(0);
    // …dark gap, then a smaller second strike…
    expect(flashEnvelope(0.2)).toBeGreaterThan(flashEnvelope(0.15));
    expect(flashEnvelope(0.2)).toBeLessThan(1);
    // …fully dark by 0.5 s.
    expect(flashEnvelope(0.5)).toBe(0);
    expect(flashEnvelope(3)).toBe(0);
  });

  it('stays within 0..1 and is 0 before the strike', () => {
    expect(flashEnvelope(-1)).toBe(0);
    for (let t = -0.1; t < 1; t += 0.013) {
      const v = flashEnvelope(t);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe('LIGHTNING constants', () => {
  it('boosts the hemisphere hard enough to read as a flash', () => {
    expect(LIGHTNING.hemiBoost).toBeGreaterThan(1);
    expect(LIGHTNING.fogLift).toBeGreaterThan(0);
    expect(LIGHTNING.fogLift).toBeLessThanOrEqual(1);
  });
});
