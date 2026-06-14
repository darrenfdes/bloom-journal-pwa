import { isMoonPhase } from './palette';
import type { TimePhase, WeatherCategory } from './types';

/** Synodic month length in days. */
const SYNODIC_MONTH = 29.530588853;

/** Known new moon: 15 Jun 2026 02:54 UTC. */
const KNOWN_NEW_MOON = Date.UTC(2026, 5, 15, 2, 54);

export const NEW_MOON_ILLUMINATION_THRESHOLD = 0.03;

export type MoonPhaseName =
  | 'new_moon'
  | 'waxing_crescent'
  | 'first_quarter'
  | 'waxing_gibbous'
  | 'full_moon'
  | 'waning_gibbous'
  | 'last_quarter'
  | 'waning_crescent';

export interface MoonPhaseState {
  /** 0–1 synodic position (0 = new, 0.5 = full). */
  phase: number;
  /** 0–1 lit fraction of the disc. */
  illumination: number;
  name: MoonPhaseName;
  waxing: boolean;
}

export type MoonPhaseMaskKind = 'none' | 'outer' | 'inner';

export interface MoonPhaseMaskGeometry {
  kind: MoonPhaseMaskKind;
  /** 0–1 fraction of moon diameter covered by the shadow overlay. */
  shadowWidthFrac: number;
  /** Side the shadow grows from before latitude flip. */
  shadowSide: 'left' | 'right';
}

export function bucketPhaseName(phase: number): MoonPhaseName {
  if (phase < 0.03 || phase > 0.97) return 'new_moon';
  if (phase >= 0.47 && phase <= 0.53) return 'full_moon';
  if (phase < 0.22) return 'waxing_crescent';
  if (phase < 0.28) return 'first_quarter';
  if (phase < 0.47) return 'waxing_gibbous';
  if (phase < 0.72) return 'waning_gibbous';
  if (phase < 0.78) return 'last_quarter';
  return 'waning_crescent';
}

export function getMoonPhase(date: Date): MoonPhaseState {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const normalized =
    ((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const phase = normalized / SYNODIC_MONTH;
  const illumination = 0.5 * (1 - Math.cos(2 * Math.PI * phase));
  const waxing = phase < 0.5;
  const name = bucketPhaseName(phase);
  return { phase, illumination, name, waxing };
}

function resolveShadowSide(waxing: boolean, latitude: number): 'left' | 'right' {
  const northern = latitude >= 0;
  const litFromRight = northern ? waxing : !waxing;
  return litFromRight ? 'left' : 'right';
}

/** Shadow mask geometry — crescent/quarter use outer overlay; gibbous uses inner cutout. */
export function getMoonPhaseMaskGeometry(
  moon: MoonPhaseState,
  latitude = 0
): MoonPhaseMaskGeometry {
  if (moon.name === 'full_moon' || moon.illumination > 0.97) {
    return { kind: 'none', shadowWidthFrac: 0, shadowSide: 'left' };
  }

  const shadowWidthFrac = Math.max(0, Math.min(1, 1 - moon.illumination));
  const shadowSide = resolveShadowSide(moon.waxing, latitude);
  const isGibbous = moon.name === 'waxing_gibbous' || moon.name === 'waning_gibbous';

  return {
    kind: isGibbous ? 'inner' : 'outer',
    shadowWidthFrac,
    shadowSide,
  };
}

function drawOuterMoonShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  geom: MoonPhaseMaskGeometry,
  skyColor: string
): void {
  const w = r * 2 * geom.shadowWidthFrac;
  ctx.fillStyle = skyColor;

  if (geom.shadowSide === 'left') {
    const x0 = cx - r;
    const x1 = cx - r + w;
    ctx.beginPath();
    ctx.moveTo(x0, cy - r);
    ctx.lineTo(x1, cy - r);
    ctx.arc(x1, cy, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x0, cy + r);
    ctx.closePath();
    ctx.fill();
    return;
  }

  const x1 = cx + r;
  const x0 = cx + r - w;
  ctx.beginPath();
  ctx.moveTo(x1, cy - r);
  ctx.lineTo(x0, cy - r);
  ctx.arc(x0, cy, r, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(x1, cy + r);
  ctx.closePath();
  ctx.fill();
}

function drawInnerMoonShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  geom: MoonPhaseMaskGeometry,
  skyColor: string
): void {
  const w = r * 2 * geom.shadowWidthFrac;
  const offsetX = geom.shadowSide === 'left' ? cx - w : cx + w;
  ctx.fillStyle = skyColor;
  ctx.beginPath();
  ctx.arc(offsetX, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Apply sky-colored phase shadow over a filled moon disc (DEV article overlay technique). */
export function applyMoonPhaseShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  moon: MoonPhaseState,
  latitude = 0,
  skyColor = '#070d1c'
): void {
  const geom = getMoonPhaseMaskGeometry(moon, latitude);
  if (geom.kind === 'none') return;

  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  if (geom.kind === 'outer') {
    drawOuterMoonShadow(ctx, cx, cy, r, geom, skyColor);
  } else {
    drawInnerMoonShadow(ctx, cx, cy, r, geom, skyColor);
  }

  ctx.restore();
}

/**
 * SVG path for the sky-colored phase shadow (local moon coords, disc centered at (r, r)).
 *
 * The unlit region is bounded by two arcs that meet at the poles (top & bottom of the disc):
 *   1. the dark outer limb — a true semicircle of radius `r`, and
 *   2. the terminator — a half-ellipse whose horizontal radius shrinks with the lit fraction
 *      (`rx = r·|1 − 2·illumination|`): `r` at new/full, `0` (a straight line) at the quarters.
 * Crescents (illumination < 0.5) have the terminator bulge toward the lit limb; gibbous phases have
 * it bulge over the dark limb, leaving only a thin lens of shadow.
 */
export function getMoonPhaseShadowSvgPath(
  r: number,
  moon: MoonPhaseState,
  latitude = 0
): string | null {
  const illum = moon.illumination;
  if (illum >= 0.985) return null; // full moon → no shadow

  const cx = r;
  const cy = r;
  const top = `${cx} ${cy - r}`;
  const bottom = `${cx} ${cy + r}`;

  if (illum <= 0.015) {
    // New moon → the whole disc is in shadow.
    return `M ${top} A ${r} ${r} 0 1 0 ${bottom} A ${r} ${r} 0 1 0 ${top} Z`;
  }

  const rx = r * Math.abs(1 - 2 * illum); // terminator half-width (0 at the quarters)
  const litRight = latitude >= 0 ? moon.waxing : !moon.waxing; // hemisphere flips the lit side
  const crescent = illum < 0.5;
  const limbSweep = litRight ? 0 : 1; // dark outer limb: left when lit is on the right
  const termSweep = litRight ? (crescent ? 0 : 1) : crescent ? 1 : 0;

  return [
    `M ${top}`,
    `A ${r} ${r} 0 0 ${limbSweep} ${bottom}`, // dark outer limb
    `A ${rx} ${r} 0 0 ${termSweep} ${top}`, // terminator
    'Z',
  ].join(' ');
}

export function shouldHideMoonForWeather(category?: WeatherCategory | null): boolean {
  return category === 'rain' || category === 'heavy_rain' || category === 'thunderstorm';
}

export function shouldShowMoonDisc(params: {
  timePhase: TimePhase;
  weatherCategory?: WeatherCategory | null;
  moon: MoonPhaseState;
}): boolean {
  if (!isMoonPhase(params.timePhase)) return false;
  if (params.moon.illumination < NEW_MOON_ILLUMINATION_THRESHOLD) return false;
  if (shouldHideMoonForWeather(params.weatherCategory)) return false;
  return true;
}
