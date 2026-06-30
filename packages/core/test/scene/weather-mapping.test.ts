import { describe, expect, it } from 'vitest';

import { wmoToCategory } from '../../src/scene/weather-mapping';

describe('wmoToCategory', () => {
  // Regression: WMO 80-82 are rain showers, not snow. A user in Mumbai saw
  // snow during monsoon rain because the old snow range (71-86) swallowed these.
  it('maps rain showers (80-82) to rain', () => {
    expect(wmoToCategory(80)).toBe('rain');
    expect(wmoToCategory(81)).toBe('rain');
    expect(wmoToCategory(82)).toBe('rain');
  });

  it('maps snow fall and snow grains (71-77) to snow', () => {
    expect(wmoToCategory(71)).toBe('snow');
    expect(wmoToCategory(73)).toBe('snow');
    expect(wmoToCategory(75)).toBe('snow');
    expect(wmoToCategory(77)).toBe('snow');
  });

  it('maps snow showers (85-86) to snow', () => {
    expect(wmoToCategory(85)).toBe('snow');
    expect(wmoToCategory(86)).toBe('snow');
  });

  it('maps clear and mostly-clear codes', () => {
    expect(wmoToCategory(0)).toBe('clear');
    expect(wmoToCategory(1)).toBe('clear');
    expect(wmoToCategory(2)).toBe('partly_cloudy');
    expect(wmoToCategory(3)).toBe('overcast');
  });

  it('maps fog codes (45, 48)', () => {
    expect(wmoToCategory(45)).toBe('fog');
    expect(wmoToCategory(48)).toBe('fog');
  });

  it('maps drizzle codes (51-57)', () => {
    expect(wmoToCategory(51)).toBe('drizzle');
    expect(wmoToCategory(55)).toBe('drizzle');
    expect(wmoToCategory(57)).toBe('drizzle');
  });

  it('maps rain (61-64) and heavy rain (65-67)', () => {
    expect(wmoToCategory(61)).toBe('rain');
    expect(wmoToCategory(63)).toBe('rain');
    expect(wmoToCategory(65)).toBe('heavy_rain');
    expect(wmoToCategory(66)).toBe('heavy_rain');
    expect(wmoToCategory(67)).toBe('heavy_rain');
  });

  it('maps thunderstorm codes (95-99)', () => {
    expect(wmoToCategory(95)).toBe('thunderstorm');
    expect(wmoToCategory(99)).toBe('thunderstorm');
  });

  it('falls back to clear for unknown codes', () => {
    expect(wmoToCategory(200)).toBe('clear');
    expect(wmoToCategory(-1)).toBe('clear');
  });
});
