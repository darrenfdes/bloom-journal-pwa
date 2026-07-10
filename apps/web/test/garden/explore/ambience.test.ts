import { describe, expect, it } from 'vitest';

import { ambienceMixFor, birdChirpDelayMs } from '@/lib/garden/explore/ambience';

const base = { phase: 'day', category: 'clear', windSpeed: 8, streamDist: 50 } as const;

describe('ambienceMixFor', () => {
  it('keeps every layer gain within 0..1', () => {
    for (const phase of ['dawn', 'day', 'golden', 'dusk', 'night'] as const) {
      for (const category of ['clear', 'fog', 'rain', 'heavy_rain', 'snow', 'thunderstorm'] as const) {
        const mix = ambienceMixFor({ phase, category, windSpeed: 30, streamDist: 3 });
        for (const v of Object.values(mix)) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('swells the stream as the fox approaches and silences it far away', () => {
    const at0 = ambienceMixFor({ ...base, streamDist: 0 }).stream;
    const at8 = ambienceMixFor({ ...base, streamDist: 8 }).stream;
    const at21 = ambienceMixFor({ ...base, streamDist: 21 }).stream;
    expect(at0).toBeGreaterThan(at8);
    expect(at8).toBeGreaterThan(at21);
    expect(ambienceMixFor({ ...base, streamDist: 22 }).stream).toBe(0);
    expect(ambienceMixFor({ ...base, streamDist: Infinity }).stream).toBe(0);
  });

  it('sings crickets after dark and birds in daylight, never in rain', () => {
    expect(ambienceMixFor({ ...base, phase: 'night' }).crickets).toBeGreaterThan(0);
    expect(ambienceMixFor({ ...base, phase: 'dusk' }).crickets).toBeGreaterThan(0);
    expect(ambienceMixFor({ ...base, phase: 'day' }).crickets).toBe(0);
    expect(ambienceMixFor({ ...base, phase: 'night', category: 'rain' }).crickets).toBe(0);

    expect(ambienceMixFor({ ...base, phase: 'day' }).birds).toBeGreaterThan(0);
    expect(ambienceMixFor({ ...base, phase: 'dawn' }).birds).toBeGreaterThan(0);
    expect(ambienceMixFor({ ...base, phase: 'night' }).birds).toBe(0);
    expect(ambienceMixFor({ ...base, phase: 'day', category: 'rain' }).birds).toBe(0);
    expect(ambienceMixFor({ ...base, phase: 'day', category: 'snow' }).birds).toBe(0);
  });

  it('scales rain patter with intensity and keeps snow hushed', () => {
    const drizzle = ambienceMixFor({ ...base, category: 'drizzle' }).rain;
    const rain = ambienceMixFor({ ...base, category: 'rain' }).rain;
    const heavy = ambienceMixFor({ ...base, category: 'heavy_rain' }).rain;
    expect(drizzle).toBeGreaterThan(0);
    expect(rain).toBeGreaterThan(drizzle);
    expect(heavy).toBeGreaterThan(rain);
    expect(ambienceMixFor({ ...base, category: 'clear' }).rain).toBe(0);
    expect(ambienceMixFor({ ...base, category: 'snow' }).rain).toBe(0);
  });

  it('drives wind from the shared sway curve', () => {
    const calm = ambienceMixFor({ ...base, windSpeed: 0 }).wind;
    const storm = ambienceMixFor({ ...base, category: 'thunderstorm', windSpeed: 40 }).wind;
    expect(storm).toBeGreaterThan(calm);
    expect(calm).toBeGreaterThan(0); // a meadow is never dead silent
  });
});

describe('birdChirpDelayMs', () => {
  it('spaces chirps 20–60 s apart', () => {
    expect(birdChirpDelayMs(0)).toBe(20_000);
    expect(birdChirpDelayMs(1)).toBe(60_000);
  });
});
