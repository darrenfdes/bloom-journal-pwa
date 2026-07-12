/**
 * Month-aware seasonal looks for the Bloom Meadow. Composes ON TOP of the
 * time-of-day `PHASES` palettes (which stay untouched): a soft-light ground
 * wash, lerped grass/hill targets, and ambient particles (autumn leaves,
 * spring petals). Winter is a no-op — the settled-snow blanket and phase
 * palettes already read wintry, and storm snow must always win.
 *
 * Seasons are calendar-based (northern hemisphere); southern-hemisphere
 * inversion is a known limitation.
 */
import { getSeason, type Season } from '@bloom/core/theme/seasons';

import { hashString, lerpColor, mulberry32 } from './rng';

export type SeasonParticleKind = 'leaves' | 'petals';

export interface SeasonLook {
  season: Season;
  /** Bottom-anchored wash over the ground strip, blended soft-light. */
  groundTint: { gradient: string; opacity: number };
  grassTarget: string | null;
  grassStrength: number;
  hillTargets: [string, string, string] | null;
  hillStrength: number;
  particles: SeasonParticleKind | null;
  particleColors: string[];
}

/** Core `getSeason` takes a 1-12 month; `Date#getMonth()` is 0-11 — hence the +1. */
export const seasonForDate = (d: Date): Season => getSeason(d.getMonth() + 1);

export const SEASON_LOOKS: Record<Season, SeasonLook> = {
  winter: {
    season: 'winter',
    groundTint: { gradient: 'none', opacity: 0 },
    grassTarget: null,
    grassStrength: 0,
    hillTargets: null,
    hillStrength: 0,
    particles: null,
    particleColors: [],
  },
  spring: {
    season: 'spring',
    groundTint: { gradient: 'linear-gradient(180deg, rgba(126,190,110,0), rgba(126,190,110,.5))', opacity: 0.22 },
    grassTarget: '#69a85b',
    grassStrength: 0.35,
    hillTargets: ['#a9c8a2', '#7fae7d', '#5f9c60'],
    hillStrength: 0.25,
    particles: 'petals',
    particleColors: ['#f7cfd8', '#fbe3e8', '#fff6f0'],
  },
  summer: {
    season: 'summer',
    groundTint: { gradient: 'linear-gradient(180deg, rgba(201,168,86,0), rgba(193,154,74,.55))', opacity: 0.26 },
    grassTarget: '#8a9950',
    grassStrength: 0.4,
    hillTargets: ['#c1b489', '#a3a26b', '#84945a'],
    hillStrength: 0.3,
    particles: null,
    particleColors: [],
  },
  autumn: {
    season: 'autumn',
    groundTint: { gradient: 'linear-gradient(180deg, rgba(196,132,58,0), rgba(184,116,48,.6))', opacity: 0.3 },
    grassTarget: '#96863f',
    grassStrength: 0.45,
    hillTargets: ['#b99f7c', '#a08a58', '#7d7a45'],
    hillStrength: 0.35,
    particles: 'leaves',
    particleColors: ['#c47f3a', '#a8552f', '#d9a441', '#8f5a2b'],
  },
};

/**
 * How strongly the season reads in a given month (0-11), so June is greener
 * than a parched August and October peaks the autumn ochre. Scales the base
 * look's tint opacity and lerp strengths.
 */
const MONTH_STRENGTH: number[] = [0, 0, 0.6, 1, 0.8, 0.3, 0.6, 1, 0.7, 1, 0.8, 0];

/** Resolved look for a date: base season look with month-level strength applied. */
export function seasonLookForDate(d: Date): SeasonLook {
  const base = SEASON_LOOKS[seasonForDate(d)];
  const k = MONTH_STRENGTH[d.getMonth()] ?? 1;
  if (k === 1) return base;
  return {
    ...base,
    groundTint: { ...base.groundTint, opacity: base.groundTint.opacity * k },
    grassStrength: base.grassStrength * k,
    hillStrength: base.hillStrength * k,
  };
}

/** Grass colour with the seasonal shift applied (identity when the look has none). */
export const seasonGrass = (phaseGrass: string, look: SeasonLook): string =>
  look.grassTarget && look.grassStrength > 0 ? lerpColor(phaseGrass, look.grassTarget, look.grassStrength) : phaseGrass;

/** Hill fill (back→front index `i`) with the seasonal shift applied. */
export const seasonHill = (phaseHill: string, i: number, look: SeasonLook): string =>
  look.hillTargets && look.hillStrength > 0
    ? lerpColor(phaseHill, look.hillTargets[i] ?? look.hillTargets[0]!, look.hillStrength)
    : phaseHill;

export interface SeasonParticle {
  id: number;
  /** Horizontal start, vw%. */
  x: number;
  /** Vertical start, vh% (petals drift mid-air; leaves fall from above). */
  y: number;
  /** Size, px. */
  s: number;
  /** Animation duration, s. */
  d: number;
  /** Animation delay, s. */
  dl: number;
  /** Lateral sway amplitude, px. */
  sway: number;
  color: string;
}

/** Deterministic per-day particle field (same day → identical array, like the ram roll). */
export function buildSeasonParticles(
  kind: SeasonParticleKind,
  dayIso: string,
  count: number,
  colors: string[],
): SeasonParticle[] {
  const rnd = mulberry32(hashString(`season|${kind}|${dayIso}`));
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: rnd() * 100,
    y: kind === 'leaves' ? -6 - rnd() * 10 : 20 + rnd() * 55,
    s: kind === 'leaves' ? 6 + rnd() * 5 : 4 + rnd() * 3,
    d: kind === 'leaves' ? 9 + rnd() * 7 : 11 + rnd() * 7,
    dl: rnd() * 12,
    sway: 14 + rnd() * 26,
    color: colors[Math.floor(rnd() * colors.length)] ?? '#c47f3a',
  }));
}
