/**
 * Season × time-phase color grading for the meadow ground layers.
 *
 * Ported from the reference (refernce.html) SEASONS + PHASES tables so hills,
 * ground, grass, and the ambient wash all respond to the active phase the same
 * way. Sky colors come from core/atmosphere; this covers only the land.
 */
import { mixHex } from '@/lib/scene/atmosphere';
import type { TimePhase } from '@bloom/core/scene';
import type { Season } from '@bloom/core/theme/seasons';

export const SEASON_HILLS: Record<Season, { far: string; near: string }> = {
  winter: { far: '#c2cfca', near: '#9fb2a8' },
  spring: { far: '#b9d39a', near: '#8fb573' },
  summer: { far: '#a9cd8b', near: '#7fae62' },
  autumn: { far: '#d3b87e', near: '#b29257' },
};

export const SEASON_GROUND: Record<Season, [string, string]> = {
  winter: ['#d3dcd6', '#aebcb4'],
  spring: ['#a6c981', '#7daa5d'],
  summer: ['#94be70', '#6da14e'],
  autumn: ['#c9a565', '#a98445'],
};

export const SEASON_GRASS: Record<Season, string> = {
  winter: '#a9bcae',
  spring: '#7fae5e',
  summer: '#6da34f',
  autumn: '#a98a4a',
};

const PHASE_TINT: Record<TimePhase, { tint: string; amount: number }> = {
  deep_night: { tint: '#101737', amount: 0.6 },
  pre_dawn: { tint: '#2a2f55', amount: 0.46 },
  dawn: { tint: '#e8a079', amount: 0.16 },
  day: { tint: '#ffffff', amount: 0 },
  golden_hour: { tint: '#f5b36b', amount: 0.22 },
  dusk: { tint: '#5d5184', amount: 0.34 },
  night: { tint: '#1a2348', amount: 0.54 },
};

const PHASE_AMBIENT: Record<TimePhase, string> = {
  deep_night: 'rgba(8,12,40,0.32)',
  pre_dawn: 'rgba(46,44,84,0.22)',
  dawn: 'rgba(255,190,140,0.10)',
  day: 'rgba(255,252,240,0.04)',
  golden_hour: 'rgba(255,168,82,0.13)',
  dusk: 'rgba(92,68,118,0.18)',
  night: 'rgba(14,20,56,0.27)',
};

export function getHillColors(season: Season, phase: TimePhase): { far: string; near: string } {
  const t = PHASE_TINT[phase];
  const base = SEASON_HILLS[season];
  return {
    far: mixHex(base.far, t.tint, t.amount),
    near: mixHex(base.near, t.tint, Math.min(1, t.amount * 1.15)),
  };
}

export function getGroundColors(season: Season, phase: TimePhase): [string, string] {
  const t = PHASE_TINT[phase];
  const g = SEASON_GROUND[season];
  return [
    mixHex(g[0], t.tint, t.amount),
    mixHex(g[1], t.tint, Math.min(1, t.amount * 1.2)),
  ];
}

export function getGrassColor(season: Season, phase: TimePhase): string {
  const t = PHASE_TINT[phase];
  return mixHex(SEASON_GRASS[season], t.tint, t.amount);
}

export function getAmbientTint(phase: TimePhase): string {
  return PHASE_AMBIENT[phase];
}
