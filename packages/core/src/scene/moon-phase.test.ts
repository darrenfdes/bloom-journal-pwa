import { describe, expect, it } from 'vitest';

import {
  getMoonPhase,
  getMoonPhaseMaskGeometry,
  shouldHideMoonForWeather,
  shouldShowMoonDisc,
} from './moon-phase';

describe('getMoonPhase', () => {
  it('returns new moon at the anchor instant', () => {
    const moon = getMoonPhase(new Date('2026-06-15T02:54:00Z'));
    expect(moon.phase).toBeLessThan(0.01);
    expect(moon.illumination).toBeLessThan(0.03);
    expect(moon.name).toBe('new_moon');
  });

  it('returns full moon about half a synodic month after anchor', () => {
    const moon = getMoonPhase(new Date('2026-06-29T12:00:00Z'));
    expect(moon.phase).toBeGreaterThan(0.47);
    expect(moon.phase).toBeLessThan(0.53);
    expect(moon.illumination).toBeGreaterThan(0.97);
    expect(moon.name).toBe('full_moon');
  });

  it('returns waxing gibbous for 29 May 2026', () => {
    const moon = getMoonPhase(new Date('2026-05-29T12:00:00Z'));
    expect(moon.phase).toBeGreaterThan(0.4);
    expect(moon.phase).toBeLessThan(0.48);
    expect(moon.illumination).toBeGreaterThan(0.85);
    expect(moon.illumination).toBeLessThan(0.92);
    expect(moon.name).toBe('waxing_gibbous');
    expect(moon.waxing).toBe(true);
  });
});

describe('shouldShowMoonDisc', () => {
  const fullMoon = getMoonPhase(new Date('2026-06-29T12:00:00Z'));
  const newMoon = getMoonPhase(new Date('2026-06-15T02:54:00Z'));

  it('hides during rain, heavy rain, and thunderstorm at night', () => {
    for (const category of ['rain', 'heavy_rain', 'thunderstorm'] as const) {
      expect(
        shouldShowMoonDisc({
          timePhase: 'night',
          weatherCategory: category,
          moon: fullMoon,
        })
      ).toBe(false);
    }
  });

  it('shows during drizzle at night when moon is lit', () => {
    expect(
      shouldShowMoonDisc({
        timePhase: 'night',
        weatherCategory: 'drizzle',
        moon: fullMoon,
      })
    ).toBe(true);
  });

  it('hides at new moon during clear night', () => {
    expect(
      shouldShowMoonDisc({
        timePhase: 'night',
        weatherCategory: 'clear',
        moon: newMoon,
      })
    ).toBe(false);
  });

  it('shows at full moon during clear night', () => {
    expect(
      shouldShowMoonDisc({
        timePhase: 'night',
        weatherCategory: 'clear',
        moon: fullMoon,
      })
    ).toBe(true);
  });

  it('hides during daytime even when full moon', () => {
    expect(
      shouldShowMoonDisc({
        timePhase: 'day',
        weatherCategory: 'clear',
        moon: fullMoon,
      })
    ).toBe(false);
  });
});

describe('getMoonPhaseMaskGeometry', () => {
  it('mirrors shadow side between hemispheres', () => {
    const moon = getMoonPhase(new Date('2026-05-29T12:00:00Z'));
    const north = getMoonPhaseMaskGeometry(moon, 51.5, 22);
    const south = getMoonPhaseMaskGeometry(moon, -33.86, 22);
    expect(north.shadowSide).not.toBe(south.shadowSide);
  });
});

describe('shouldHideMoonForWeather', () => {
  it('returns true only for medium/heavy rain and thunderstorm', () => {
    expect(shouldHideMoonForWeather('rain')).toBe(true);
    expect(shouldHideMoonForWeather('heavy_rain')).toBe(true);
    expect(shouldHideMoonForWeather('thunderstorm')).toBe(true);
    expect(shouldHideMoonForWeather('drizzle')).toBe(false);
    expect(shouldHideMoonForWeather('clear')).toBe(false);
  });
});
