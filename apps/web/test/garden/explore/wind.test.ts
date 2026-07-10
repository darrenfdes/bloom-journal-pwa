import { describe, expect, it } from 'vitest';

import {
  WIND_PRESETS,
  WIND_SWAY_GLSL,
  windSpeedFallback,
  windStrengthFor,
} from '@/lib/garden/explore/wind';

describe('windStrengthFor', () => {
  it('is monotonic in wind speed', () => {
    const calm = windStrengthFor('clear', 0);
    const breezy = windStrengthFor('clear', 15);
    const gale = windStrengthFor('clear', 40);
    expect(breezy).toBeGreaterThan(calm);
    expect(gale).toBeGreaterThan(breezy);
  });

  it('storms sway harder than clear skies at the same wind speed', () => {
    expect(windStrengthFor('thunderstorm', 10)).toBeGreaterThan(windStrengthFor('clear', 10));
    expect(windStrengthFor('heavy_rain', 10)).toBeGreaterThan(windStrengthFor('clear', 10));
  });

  it('snow and fog stay gentler than clear', () => {
    expect(windStrengthFor('snow', 10)).toBeLessThanOrEqual(windStrengthFor('clear', 10));
    expect(windStrengthFor('fog', 10)).toBeLessThanOrEqual(windStrengthFor('clear', 10));
  });

  it('clamps to a sane 0..2 range even at absurd wind speeds', () => {
    expect(windStrengthFor('thunderstorm', 500)).toBeLessThanOrEqual(2);
    expect(windStrengthFor('clear', -20)).toBeGreaterThanOrEqual(0);
  });

  it('treats missing category as clear', () => {
    expect(windStrengthFor(undefined, 10)).toBe(windStrengthFor('clear', 10));
  });
});

describe('windSpeedFallback', () => {
  it('gives every category a representative speed, storms windiest', () => {
    const clear = windSpeedFallback('clear');
    const storm = windSpeedFallback('thunderstorm');
    expect(clear).toBeGreaterThanOrEqual(0);
    expect(storm).toBeGreaterThan(clear);
    expect(windSpeedFallback('heavy_rain')).toBeGreaterThan(windSpeedFallback('drizzle'));
  });
});

describe('WIND_PRESETS', () => {
  it('keeps amplitudes/frequencies in believable vegetation ranges', () => {
    for (const preset of Object.values(WIND_PRESETS)) {
      expect(preset.amp).toBeGreaterThan(0);
      expect(preset.amp).toBeLessThanOrEqual(0.15);
      expect(preset.freq).toBeGreaterThan(0);
      expect(preset.freq).toBeLessThanOrEqual(3);
      expect(preset.yRef).toBeGreaterThan(0);
    }
  });

  it('grass tips saturate lower than reeds and canopies', () => {
    expect(WIND_PRESETS.grass.yRef).toBeLessThan(WIND_PRESETS.reed.yRef);
    expect(WIND_PRESETS.reed.yRef).toBeLessThan(WIND_PRESETS.canopy.yRef);
  });
});

describe('WIND_SWAY_GLSL', () => {
  it('bends the transformed vertex and guards the instancing path', () => {
    expect(WIND_SWAY_GLSL).toContain('transformed');
    expect(WIND_SWAY_GLSL).toContain('#ifdef USE_INSTANCING');
    expect(WIND_SWAY_GLSL).toContain('uWindTime');
    expect(WIND_SWAY_GLSL).toContain('uWindStrength');
  });

  it('pins the plant base: zero offset at y = 0', () => {
    // The height factor is clamp(y / yRef, 0, 1)^2 — the base must not slide on the ground.
    expect(WIND_SWAY_GLSL).toMatch(/clamp\(\s*transformed\.y/);
  });
});
