import type { Season } from '../theme/seasons';
import { isPrecipitatingCategory, isStormyCategory } from './weather-effects';
import type { TimePhase, WeatherCategory } from './types';

export interface SkyGradient {
  top: string;
  bottom: string;
}

export interface HillColors {
  far: string;
  mid: string;
  near: string;
}

export interface AmbientOverlaySpec {
  color: string;
  opacity: number;
}

export const MOON_COLORS = {
  core: '#F0F0F0',
  glow: 'rgba(240, 240, 240, 0.4)',
  shadow: 'rgba(180, 180, 190, 0.12)',
} as const;

export const NIGHT_CLOUD_COLORS = {
  primary: 'rgba(170, 184, 194, 0.28)',
  accent: 'rgba(189, 178, 255, 0.12)',
} as const;

const SKY_BY_PHASE: Record<TimePhase, SkyGradient> = {
  deep_night: { top: '#0B0E1B', bottom: '#141824' },
  pre_dawn: { top: '#0B0E1B', bottom: '#1E2840' },
  dawn: { top: '#ff7043', bottom: '#ffcc80' },
  day: { top: '#42a5f5', bottom: '#90caf9' },
  golden_hour: { top: '#ff6f00', bottom: '#ffca28' },
  dusk: { top: '#6a1b9a', bottom: '#e91e63' },
  night: { top: '#0B0E1B', bottom: '#1A2238' },
};

const HILLS_BY_SEASON: Record<Season, HillColors> = {
  spring: { far: '#81c784', mid: '#66bb6a', near: '#4caf50' },
  summer: { far: '#388e3c', mid: '#2e7d32', near: '#1b5e20' },
  autumn: { far: '#bf360c', mid: '#e64a19', near: '#ff7043' },
  winter: { far: '#cfd8dc', mid: '#b0bec5', near: '#90a4ae' },
};

const AMBIENT_BY_PHASE: Record<TimePhase, AmbientOverlaySpec> = {
  deep_night: { color: '#020b1a', opacity: 0.52 },
  pre_dawn: { color: '#0d0828', opacity: 0.42 },
  dawn: { color: '#ff8f00', opacity: 0.15 },
  day: { color: 'transparent', opacity: 0 },
  golden_hour: { color: '#f57c00', opacity: 0.25 },
  dusk: { color: '#4a148c', opacity: 0.3 },
  night: { color: '#01003a', opacity: 0.42 },
};

const CLOUD_BLEND = '#6b7280';
const STORM_SKY_TOP = '#3d4a5c';
const STORM_SKY_BOTTOM = '#5c6b7a';
const DRIZZLE_SKY_BLEND = '#7a8796';

function blendHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ] as const;
  };
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * t);
  const r = mix(ar, br);
  const g = mix(ag, bg);
  const bl = mix(ab, bb);
  return `#${[r, g, bl].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export function getSkyGradient(
  timePhase: TimePhase,
  cloudCover: number,
  category?: WeatherCategory
): SkyGradient {
  const base = SKY_BY_PHASE[timePhase];

  if (isStormyCategory(category)) {
    const intensity = Math.min(1, 0.55 + cloudCover / 200);
    return {
      top: blendHex(base.top, STORM_SKY_TOP, intensity),
      bottom: blendHex(base.bottom, STORM_SKY_BOTTOM, intensity * 0.9),
    };
  }

  if (category === 'drizzle' || (category && isPrecipitatingCategory(category) && cloudCover > 40)) {
    const t = Math.min(1, 0.35 + cloudCover / 150);
    return {
      top: blendHex(base.top, DRIZZLE_SKY_BLEND, t),
      bottom: blendHex(base.bottom, CLOUD_BLEND, t * 0.85),
    };
  }

  if (cloudCover <= 60) return base;
  const intensity = Math.min(1, cloudCover / 100);
  return {
    top: blendHex(base.top, CLOUD_BLEND, intensity),
    bottom: blendHex(base.bottom, CLOUD_BLEND, intensity),
  };
}

export function getSkyCssBackground(
  timePhase: TimePhase,
  cloudCover: number,
  category?: WeatherCategory
): string {
  const { top, bottom } = getSkyGradient(timePhase, cloudCover, category);
  return `linear-gradient(180deg, ${top} 0%, ${bottom} 100%)`;
}

export function getHillColors(season: Season): HillColors {
  return HILLS_BY_SEASON[season];
}

/** Night meadow hill fills — reference palette; SVG paths unchanged. */
export function getNightHillColors(): HillColors {
  return { far: '#1c3c18', mid: '#255022', near: '#306a29' };
}

export const NIGHT_MEADOW_BASE = '#194218';

export function getAmbientOverlay(timePhase: TimePhase): AmbientOverlaySpec {
  return AMBIENT_BY_PHASE[timePhase];
}

/** Subtle wind-driven sway in degrees (±), layered on each flower's base lean. */
export function getWindSwayDegrees(windSpeed: number): number {
  const base = 0.9;
  const extra = Math.min(1.6, windSpeed * 0.06);
  return base + extra;
}

export function getSeasonFlowerFilter(season: Season): string {
  switch (season) {
    case 'spring':
      return 'none';
    case 'summer':
      return 'saturate(1.2)';
    case 'autumn':
      return 'sepia(0.3) hue-rotate(-20deg)';
    case 'winter':
      return 'opacity(0)';
  }
}

export function getNightFlowerFilter(timePhase: TimePhase): string {
  if (timePhase === 'deep_night' || timePhase === 'night' || timePhase === 'pre_dawn') {
    return 'brightness(0.4) saturate(0.6)';
  }
  if (timePhase === 'dusk') {
    return 'brightness(0.7) saturate(0.8)';
  }
  return 'none';
}

export function combineFlowerFilters(...filters: string[]): string {
  const active = filters.filter((f) => f && f !== 'none');
  return active.length > 0 ? active.join(' ') : 'none';
}

export function shouldRainDroop(category: WeatherCategory): boolean {
  return category === 'rain' || category === 'heavy_rain';
}

export function getRainParticleCount(category: WeatherCategory): number {
  switch (category) {
    case 'drizzle':
      return 40;
    case 'rain':
      return 100;
    case 'heavy_rain':
    case 'thunderstorm':
      return 200;
    default:
      return 0;
  }
}

export function shouldShowPetals(
  season: Season,
  category: WeatherCategory,
  windSpeed: number
): boolean {
  return (
    season === 'spring' &&
    windSpeed > 8 &&
    (category === 'clear' || category === 'partly_cloudy')
  );
}

export function shouldShowAutumnLeaves(season: Season): boolean {
  return season === 'autumn';
}

export function getSeasonPlaceholder(season: Season): string {
  switch (season) {
    case 'spring':
      return "What's blooming today?";
    case 'summer':
      return 'What are you soaking in?';
    case 'autumn':
      return 'What are you letting go of?';
    case 'winter':
      return 'What are you resting in?';
  }
}

export function isNightPhase(timePhase: TimePhase): boolean {
  return (
    timePhase === 'deep_night' ||
    timePhase === 'night' ||
    timePhase === 'pre_dawn'
  );
}

export function isSunPhase(timePhase: TimePhase): boolean {
  return timePhase === 'dawn' || timePhase === 'day' || timePhase === 'golden_hour';
}

/** @alias getSeasonFlowerFilter */
export const getFlowerSeasonFilter = getSeasonFlowerFilter;

/** @alias getNightFlowerFilter */
export const getFlowerNightFilter = getNightFlowerFilter;

export function isRainCategory(category: WeatherCategory): boolean {
  return shouldRainDroop(category);
}

export function shouldHideFlowersForWinter(season: Season): boolean {
  return season === 'winter';
}

/** True when the time-of-day window can show a moon disc (not the lunar phase). */
export function isMoonPhase(timePhase: TimePhase): boolean {
  return (
    timePhase === 'dusk' ||
    timePhase === 'night' ||
    timePhase === 'deep_night' ||
    timePhase === 'pre_dawn'
  );
}
