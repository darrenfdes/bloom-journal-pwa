import { describe, expect, it } from 'vitest';

import { PHASE_ORDER, PHASES } from '@/lib/garden/bloom/phases';
import {
  fogRangeFor,
  groundColorFor,
  hillColorsFor,
  lightingForPhase,
  parseCssLinearGradient,
  starOpacityFor,
  sunDirectionAt,
} from '@/lib/garden/explore/sky';

/** Sum of the three channels — a cheap "how light is this hex" proxy for the lift assertions. */
const brightness = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
};

describe('parseCssLinearGradient', () => {
  it('parses the real day-phase sky into ordered stops', () => {
    const stops = parseCssLinearGradient(PHASES.day.sky);
    expect(stops).toHaveLength(4);
    expect(stops[0]).toEqual({ offset: 0, color: '#9bc4e6' });
    expect(stops[1]).toEqual({ offset: 0.46, color: '#bedaee' });
    expect(stops[3]).toEqual({ offset: 1, color: '#f5edd3' });
  });

  it('parses every phase sky without loss', () => {
    for (const phase of Object.values(PHASES)) {
      const stops = parseCssLinearGradient(phase.sky);
      expect(stops.length).toBeGreaterThanOrEqual(3);
      expect(stops[0]!.offset).toBe(0);
      expect(stops[stops.length - 1]!.offset).toBe(1);
    }
  });
});

describe('lightingForPhase', () => {
  it('is brighter at day than at night', () => {
    const day = lightingForPhase('day', 0);
    const night = lightingForPhase('night', 0);
    expect(night.sunIntensity).toBeLessThan(day.sunIntensity);
    expect(night.hemiIntensity).toBeLessThan(day.hemiIntensity);
    expect(night.flowerBrightness).toBeLessThan(day.flowerBrightness);
    expect(night.moonIntensity).toBeGreaterThan(0);
  });

  it('halves direct sun under full cloud cover', () => {
    const clear = lightingForPhase('day', 0);
    const overcast = lightingForPhase('day', 1);
    expect(overcast.sunIntensity).toBeCloseTo(clear.sunIntensity * 0.5);
  });

  it('uses the phase palette for light colors', () => {
    const day = lightingForPhase('day', 0);
    expect(day.sunColor).toBe(PHASES.day.sun.core);
    expect(day.hemiGround).toBe(PHASES.day.grass);
  });
});

describe('sunDirectionAt', () => {
  it('returns a unit vector', () => {
    const d = sunDirectionAt(PHASES.day.sun);
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
  });

  it('puts the dawn sun low in the east and the midday sun high', () => {
    const dawn = sunDirectionAt(PHASES.dawn.sun);
    expect(dawn.x).toBeGreaterThan(0); // east
    expect(dawn.y).toBeGreaterThan(0);
    expect(dawn.y).toBeLessThan(0.55); // low
    const day = sunDirectionAt(PHASES.day.sun);
    expect(day.y).toBeGreaterThan(0.8); // high
  });

  it('moves the dusk sun to the west and keeps it above the horizon', () => {
    const dusk = sunDirectionAt(PHASES.dusk.sun);
    expect(dusk.x).toBeLessThan(0); // west
    expect(dusk.y).toBeGreaterThan(0); // elevation clamped ≥ 2°
  });

  it('keeps the arc in the northern sky, over the flowers (−z)', () => {
    for (const pos of [PHASES.dawn.sun, PHASES.day.sun, PHASES.dusk.sun, PHASES.night.moon]) {
      expect(sunDirectionAt(pos).z).toBeLessThan(0);
    }
  });
});

describe('fogRangeFor', () => {
  it('thickens with worsening weather', () => {
    expect(fogRangeFor('fog').far).toBeLessThan(fogRangeFor('overcast').far);
    expect(fogRangeFor('overcast').far).toBeLessThan(fogRangeFor('clear').far);
    expect(fogRangeFor('heavy_rain').far).toBeLessThan(fogRangeFor('rain').far);
  });

  it('defaults to clear and always keeps near < far', () => {
    expect(fogRangeFor(undefined)).toEqual(fogRangeFor('clear'));
    for (const cat of [
      'clear',
      'partly_cloudy',
      'overcast',
      'fog',
      'drizzle',
      'rain',
      'heavy_rain',
      'snow',
      'thunderstorm',
    ] as const) {
      const { near, far } = fogRangeFor(cat);
      expect(near).toBeLessThan(far);
    }
  });
});

describe('starOpacityFor', () => {
  it('follows the phase palette', () => {
    expect(starOpacityFor('night')).toBe(1);
    expect(starOpacityFor('day')).toBe(0);
    expect(starOpacityFor('dusk')).toBeGreaterThan(starOpacityFor('dawn'));
  });
});

describe('groundColorFor', () => {
  it('passes non-night phases through unchanged', () => {
    for (const phase of PHASE_ORDER) {
      if (phase === 'night') continue;
      expect(groundColorFor(phase)).toBe(PHASES[phase].grass);
    }
  });

  it('lifts the night ground above the near-black 2D grass', () => {
    expect(groundColorFor('night')).not.toBe(PHASES.night.grass);
    expect(brightness(groundColorFor('night'))).toBeGreaterThan(brightness(PHASES.night.grass));
    expect(groundColorFor('night')).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('hillColorsFor', () => {
  it('returns the far→near ridge pair for non-night phases', () => {
    for (const phase of PHASE_ORDER) {
      if (phase === 'night') continue;
      expect(hillColorsFor(phase)).toEqual([PHASES[phase].hills[2], PHASES[phase].hills[1]]);
    }
  });

  it('lifts both night ridge colours above the palette', () => {
    const [far, near] = hillColorsFor('night');
    expect(brightness(far)).toBeGreaterThan(brightness(PHASES.night.hills[2]));
    expect(brightness(near)).toBeGreaterThan(brightness(PHASES.night.hills[1]));
    expect(far).toMatch(/^#[0-9a-f]{6}$/);
    expect(near).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe('snow whitening', () => {
  it('whitens the ground for every phase under snow', () => {
    for (const phase of PHASE_ORDER) {
      const snowy = groundColorFor(phase, 'snow');
      expect(brightness(snowy)).toBeGreaterThan(brightness(groundColorFor(phase)));
      expect(snowy).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('whitens both ridges under snow', () => {
    for (const phase of PHASE_ORDER) {
      const [far, near] = hillColorsFor(phase);
      const [sFar, sNear] = hillColorsFor(phase, 'snow');
      expect(brightness(sFar)).toBeGreaterThan(brightness(far));
      expect(brightness(sNear)).toBeGreaterThan(brightness(near));
    }
  });

  it('leaves every non-snow category bit-identical to the current output', () => {
    for (const phase of PHASE_ORDER) {
      expect(groundColorFor(phase, 'rain')).toBe(groundColorFor(phase));
      expect(groundColorFor(phase, undefined)).toBe(groundColorFor(phase));
      expect(hillColorsFor(phase, 'clear')).toEqual(hillColorsFor(phase));
      expect(lightingForPhase(phase, 0.3, 'overcast')).toEqual(lightingForPhase(phase, 0.3));
    }
  });

  it('keeps a snowy night dimmer than a snowy day but brighter than bare night', () => {
    const night = brightness(groundColorFor('night', 'snow'));
    expect(night).toBeGreaterThan(brightness(groundColorFor('night')));
    expect(night).toBeLessThan(brightness(groundColorFor('day', 'snow')));
  });

  it('bounces snow light into the hemisphere ground and cools the fog', () => {
    const plain = lightingForPhase('day', 0.85);
    const snowy = lightingForPhase('day', 0.85, 'snow');
    expect(brightness(snowy.hemiGround)).toBeGreaterThan(brightness(plain.hemiGround));
    expect(snowy.fogColor).not.toBe(plain.fogColor);
  });
});
