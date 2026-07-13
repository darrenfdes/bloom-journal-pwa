import { describe, expect, it } from 'vitest';

import {
  buildSeasonParticles,
  SEASON_LOOKS,
  seasonForDate,
  seasonGrass,
  seasonHill,
  seasonLookForDate,
} from './season';

describe('seasonForDate', () => {
  it('maps every month through the 0-indexed Date wrapper', () => {
    const expected = [
      ['2026-01-15', 'winter'],
      ['2026-02-15', 'winter'],
      ['2026-03-15', 'spring'],
      ['2026-04-15', 'spring'],
      ['2026-05-15', 'spring'],
      ['2026-06-15', 'summer'],
      ['2026-07-15', 'summer'],
      ['2026-08-15', 'summer'],
      ['2026-09-15', 'autumn'],
      ['2026-10-15', 'autumn'],
      ['2026-11-15', 'autumn'],
      ['2026-12-15', 'winter'],
    ] as const;
    for (const [iso, season] of expected) {
      expect(seasonForDate(new Date(`${iso}T12:00:00`)), iso).toBe(season);
    }
  });
});

describe('SEASON_LOOKS', () => {
  it('has a complete look for every season', () => {
    for (const season of ['winter', 'spring', 'summer', 'autumn'] as const) {
      const look = SEASON_LOOKS[season];
      expect(look.season).toBe(season);
      expect(look.groundTint.opacity).toBeGreaterThanOrEqual(0);
      expect(look.groundTint.opacity).toBeLessThanOrEqual(1);
    }
  });

  it('winter is a visual no-op (snow/phase palettes already read wintry)', () => {
    const winter = SEASON_LOOKS.winter;
    expect(winter.groundTint.opacity).toBe(0);
    expect(winter.grassTarget).toBeNull();
    expect(winter.hillTargets).toBeNull();
    expect(winter.particles).toBeNull();
  });

  it('only spring and autumn have particles, with colours', () => {
    expect(SEASON_LOOKS.spring.particles).toBe('petals');
    expect(SEASON_LOOKS.spring.particleColors.length).toBeGreaterThan(0);
    expect(SEASON_LOOKS.autumn.particles).toBe('leaves');
    expect(SEASON_LOOKS.autumn.particleColors.length).toBeGreaterThan(0);
    expect(SEASON_LOOKS.summer.particles).toBeNull();
    expect(SEASON_LOOKS.winter.particles).toBeNull();
  });
});

describe('seasonLookForDate', () => {
  it('scales strength by month — June reads greener (weaker) than August', () => {
    const june = seasonLookForDate(new Date('2026-06-15T12:00:00'));
    const august = seasonLookForDate(new Date('2026-08-15T12:00:00'));
    expect(june.season).toBe('summer');
    expect(august.season).toBe('summer');
    expect(june.groundTint.opacity).toBeLessThan(august.groundTint.opacity);
    expect(june.grassStrength).toBeLessThan(august.grassStrength);
  });

  it('keeps winter at zero everywhere', () => {
    for (const iso of ['2026-01-15', '2026-02-15', '2026-12-15']) {
      const look = seasonLookForDate(new Date(`${iso}T12:00:00`));
      expect(look.groundTint.opacity).toBe(0);
      expect(look.grassStrength).toBe(0);
    }
  });
});

describe('seasonGrass / seasonHill', () => {
  it('are identity when the look has no target or zero strength', () => {
    expect(seasonGrass('#5d9457', SEASON_LOOKS.winter)).toBe('#5d9457');
    expect(seasonHill('#8fb288', 1, SEASON_LOOKS.winter)).toBe('#8fb288');
    const zeroed = { ...SEASON_LOOKS.autumn, grassStrength: 0, hillStrength: 0 };
    expect(seasonGrass('#5d9457', zeroed)).toBe('#5d9457');
    expect(seasonHill('#8fb288', 0, zeroed)).toBe('#8fb288');
  });

  it('returns a lerped rgb() colour otherwise', () => {
    expect(seasonGrass('#5d9457', SEASON_LOOKS.autumn)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    for (const i of [0, 1, 2]) {
      expect(seasonHill('#8fb288', i, SEASON_LOOKS.autumn)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
    }
  });
});

describe('buildSeasonParticles', () => {
  const colors = ['#c47f3a', '#a8552f'];

  it('is deterministic for the same kind and day', () => {
    const a = buildSeasonParticles('leaves', '2026-10-15', 14, colors);
    const b = buildSeasonParticles('leaves', '2026-10-15', 14, colors);
    expect(a).toEqual(b);
  });

  it('differs across days and kinds', () => {
    const a = buildSeasonParticles('leaves', '2026-10-15', 14, colors);
    const b = buildSeasonParticles('leaves', '2026-10-16', 14, colors);
    const c = buildSeasonParticles('petals', '2026-10-15', 14, colors);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });

  it('respects count and keeps fields in range', () => {
    const parts = buildSeasonParticles('petals', '2026-04-01', 12, colors);
    expect(parts).toHaveLength(12);
    for (const p of parts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(100);
      expect(p.s).toBeGreaterThan(0);
      expect(p.d).toBeGreaterThan(0);
      expect(p.dl).toBeGreaterThanOrEqual(0);
      expect(colors).toContain(p.color);
    }
  });
});
