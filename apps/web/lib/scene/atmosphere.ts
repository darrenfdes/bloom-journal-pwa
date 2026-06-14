/**
 * Painterly atmosphere for the web garden scene.
 *
 * Web-only visual constants and silhouette builders — multi-stop sky ramps,
 * ridge/treeline tints with atmospheric perspective, scene-light grades, and
 * periodic path generators that tile seamlessly across viewport-width tiles.
 *
 * Mobile renders its own scene from `@bloom/core`; nothing here is shared.
 */

import { isStormyCategory } from '@bloom/core/scene';
import type { TimePhase, WeatherCategory } from '@bloom/core/scene';
import type { Season } from '@bloom/core/theme/seasons';

/* ----------------------------- color utils ----------------------------- */

function parseHex(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/** Blend hex `a` toward hex `b` by t (0..1). */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a);
  const [br, bg, bb] = parseHex(b);
  const mix = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(ar, br)}${mix(ag, bg)}${mix(ab, bb)}`;
}

/* ------------------------------- sky ramps ------------------------------ */

type SkyStop = [offset: number, color: string];

interface SkySpec {
  stops: SkyStop[];
  /** Horizon bloom — [xPercent, intensityColor] or null. */
  bloom: { x: number; color: string; spread: number } | null;
  /** Haze color feathered along the bottom of the sky band. */
  haze: string;
}

const CLEAR_SKY: Record<TimePhase, SkySpec> = {
  dawn: {
    stops: [
      [0, '#39406e'],
      [0.26, '#6f6fa6'],
      [0.5, '#b68cb4'],
      [0.7, '#eca98c'],
      [0.87, '#ffd49c'],
      [1, '#ffeac0'],
    ],
    bloom: { x: 16, color: 'rgba(255, 211, 145, 0.6)', spread: 58 },
    haze: '#f7dcbb',
  },
  day: {
    stops: [
      [0, '#3f8bd8'],
      [0.34, '#69aceb'],
      [0.62, '#9ccdf2'],
      [0.85, '#cfe7f3'],
      [1, '#e9f3e9'],
    ],
    bloom: { x: 68, color: 'rgba(255, 252, 232, 0.34)', spread: 52 },
    haze: '#e3eee8',
  },
  golden_hour: {
    stops: [
      [0, '#49659c'],
      [0.28, '#7a7fb0'],
      [0.52, '#c08a85'],
      [0.72, '#eda263'],
      [0.88, '#ffcf78'],
      [1, '#ffe8ae'],
    ],
    bloom: { x: 78, color: 'rgba(255, 191, 105, 0.66)', spread: 60 },
    haze: '#ffe2ad',
  },
  dusk: {
    stops: [
      [0, '#2c2a52'],
      [0.32, '#4d3c74'],
      [0.58, '#85497f'],
      [0.78, '#bf5a78'],
      [0.93, '#e58569'],
      [1, '#f4a878'],
    ],
    bloom: { x: 30, color: 'rgba(238, 145, 110, 0.5)', spread: 55 },
    haze: '#d9a08e',
  },
  night: {
    stops: [
      [0, '#0b0e1b'],
      [0.6, '#131a2e'],
      [1, '#1a2238'],
    ],
    bloom: null,
    haze: '#1c2336',
  },
  deep_night: {
    stops: [
      [0, '#0b0e1b'],
      [0.65, '#10141f'],
      [1, '#141824'],
    ],
    bloom: null,
    haze: '#161a26',
  },
  pre_dawn: {
    stops: [
      [0, '#0b0e1b'],
      [0.55, '#16203a'],
      [1, '#283452'],
    ],
    bloom: { x: 18, color: 'rgba(94, 110, 160, 0.3)', spread: 45 },
    haze: '#2a3450',
  },
};

const OVERCAST_SKY: Record<TimePhase, SkySpec> = {
  ...CLEAR_SKY,
  dawn: {
    stops: [
      [0, '#4b5070'],
      [0.4, '#787c98'],
      [0.74, '#b1a09c'],
      [1, '#d8bfa6'],
    ],
    bloom: { x: 16, color: 'rgba(235, 200, 160, 0.32)', spread: 50 },
    haze: '#d3bda8',
  },
  day: {
    stops: [
      [0, '#5f7d9c'],
      [0.4, '#85a0b8'],
      [0.74, '#aebfc9'],
      [1, '#cdd8d6'],
    ],
    bloom: { x: 60, color: 'rgba(245, 248, 240, 0.22)', spread: 48 },
    haze: '#c8d2cd',
  },
  golden_hour: {
    stops: [
      [0, '#586186'],
      [0.42, '#8a7d96'],
      [0.74, '#c09a82'],
      [1, '#e2bd8d'],
    ],
    bloom: { x: 78, color: 'rgba(240, 188, 122, 0.4)', spread: 52 },
    haze: '#dcba90',
  },
  dusk: {
    stops: [
      [0, '#2e2d4e'],
      [0.4, '#4d4470'],
      [0.74, '#7d5578'],
      [1, '#a86f78'],
    ],
    bloom: { x: 30, color: 'rgba(205, 130, 110, 0.3)', spread: 48 },
    haze: '#9d7a7e',
  },
};

const STORM_SKY: SkySpec = {
  stops: [
    [0, '#39434f'],
    [0.4, '#4f5b68'],
    [0.74, '#6e7a85'],
    [1, '#8b969d'],
  ],
  bloom: { x: 50, color: 'rgba(190, 200, 205, 0.18)', spread: 60 },
  haze: '#87929a',
};

function resolveSkySpec(
  timePhase: TimePhase,
  cloudCover: number,
  category?: WeatherCategory
): SkySpec {
  if (isStormyCategory(category)) return STORM_SKY;
  if (category === 'drizzle' || cloudCover > 62) return OVERCAST_SKY[timePhase];
  return CLEAR_SKY[timePhase];
}

/**
 * Layered CSS background for the sky band: horizon bloom + painterly
 * multi-stop vertical ramp + horizon haze feather.
 */
export function getSkyBackground(
  timePhase: TimePhase,
  cloudCover: number,
  category?: WeatherCategory
): string {
  const spec = resolveSkySpec(timePhase, cloudCover, category);
  const ramp = spec.stops
    .map(([o, c]) => `${c} ${(o * 100).toFixed(1)}%`)
    .join(', ');
  const layers: string[] = [];
  if (spec.bloom) {
    layers.push(
      `radial-gradient(${spec.bloom.spread}% 46% at ${spec.bloom.x}% 100%, ${spec.bloom.color} 0%, transparent 70%)`
    );
  }
  layers.push(
    `linear-gradient(180deg, transparent 72%, ${spec.haze}55 90%, ${spec.haze}99 100%)`
  );
  layers.push(`linear-gradient(180deg, ${ramp})`);
  return layers.join(', ');
}

/** Horizon haze color for the active sky — feathers ridges into the sky. */
export function getHorizonHaze(
  timePhase: TimePhase,
  cloudCover: number,
  category?: WeatherCategory
): string {
  return resolveSkySpec(timePhase, cloudCover, category).haze;
}

/* --------------------------- ridges & treeline -------------------------- */

export interface RidgeColors {
  far: string;
  mid: string;
  treeline: string;
}

const RIDGE_SEASON_BASE: Record<Season, string> = {
  spring: '#76a489',
  summer: '#5d9070',
  autumn: '#a4795e',
  winter: '#9caebf',
};

const TREELINE_SEASON_BASE: Record<Season, string> = {
  spring: '#49745a',
  summer: '#3c674b',
  autumn: '#76573f',
  winter: '#68809a',
};

const PHASE_ATMOSPHERE_TINT: Record<TimePhase, string> = {
  dawn: '#c9a4be',
  day: '#a7c6de',
  golden_hour: '#e7ae74',
  dusk: '#6c5390',
  night: '#27334e',
  deep_night: '#1d2740',
  pre_dawn: '#2c3a5c',
};

const STORM_TINT = '#7e8c99';

/** Distance-graded silhouette colors for mountains and treeline. */
export function getRidgeColors(
  timePhase: TimePhase,
  season: Season,
  category?: WeatherCategory
): RidgeColors {
  const tint = isStormyCategory(category)
    ? STORM_TINT
    : PHASE_ATMOSPHERE_TINT[timePhase];
  const ridgeBase = RIDGE_SEASON_BASE[season];
  const treeBase = TREELINE_SEASON_BASE[season];
  return {
    far: mixHex(ridgeBase, tint, 0.62),
    mid: mixHex(ridgeBase, tint, 0.4),
    treeline: mixHex(treeBase, tint, 0.22),
  };
}

/* ------------------------------ scene light ----------------------------- */

export interface SceneLight {
  background: string;
  opacity: number;
}

const VIGNETTE =
  'radial-gradient(125% 120% at 50% 42%, transparent 62%, rgba(18, 22, 38, 0.14) 100%)';

const SCENE_LIGHT: Record<TimePhase, SceneLight> = {
  dawn: {
    background: `${VIGNETTE}, radial-gradient(115% 85% at 16% 90%, rgba(255, 188, 120, 0.26) 0%, transparent 62%), linear-gradient(180deg, rgba(56, 60, 118, 0.20) 0%, transparent 46%)`,
    opacity: 1,
  },
  day: {
    background: `${VIGNETTE}, radial-gradient(140% 95% at 52% 112%, rgba(255, 255, 240, 0.12) 0%, transparent 60%), linear-gradient(180deg, rgba(116, 168, 220, 0.10) 0%, transparent 42%)`,
    opacity: 1,
  },
  golden_hour: {
    background: `${VIGNETTE}, radial-gradient(125% 92% at 80% 86%, rgba(255, 173, 82, 0.32) 0%, transparent 64%), linear-gradient(180deg, rgba(66, 76, 138, 0.18) 0%, transparent 50%)`,
    opacity: 1,
  },
  dusk: {
    background: `${VIGNETTE}, radial-gradient(115% 80% at 28% 98%, rgba(235, 142, 110, 0.24) 0%, transparent 58%), linear-gradient(180deg, rgba(64, 42, 112, 0.30) 0%, rgba(110, 56, 104, 0.12) 55%, transparent 100%)`,
    opacity: 1,
  },
  night: {
    background: `linear-gradient(180deg, rgba(1, 0, 58, 0.42) 0%, rgba(2, 6, 40, 0.40) 100%)`,
    opacity: 1,
  },
  deep_night: {
    background: `linear-gradient(180deg, rgba(2, 11, 26, 0.52) 0%, rgba(2, 8, 24, 0.50) 100%)`,
    opacity: 1,
  },
  pre_dawn: {
    background: `linear-gradient(180deg, rgba(13, 8, 40, 0.42) 0%, rgba(16, 14, 48, 0.38) 100%)`,
    opacity: 1,
  },
};

/** Layered lighting grade for the whole scene — replaces the flat tint. */
export function getSceneLight(timePhase: TimePhase): SceneLight {
  return SCENE_LIGHT[timePhase];
}

/* ------------------------- periodic path builders ----------------------- */

export interface SilhouettePoint {
  x: number;
  y: number;
}

interface Harmonic {
  freq: number;
  amp: number;
  phase: number;
  /** 'sin' rolls softly; 'ridge' (|sin|) forms peaky crests. */
  shape: 'sin' | 'ridge';
}

function harmonicY(t: number, base: number, harmonics: Harmonic[]): number {
  let y = base;
  for (const h of harmonics) {
    const u = 2 * Math.PI * h.freq * t + h.phase;
    y -= h.amp * (h.shape === 'ridge' ? Math.abs(Math.sin(u)) : Math.sin(u));
  }
  return y;
}

/** Sample a horizontally-periodic silhouette — y(0) === y(width). */
function sampleSilhouette(
  width: number,
  base: number,
  harmonics: Harmonic[],
  segments: number
): SilhouettePoint[] {
  const pts: SilhouettePoint[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    pts.push({ x: t * width, y: harmonicY(t, base, harmonics) });
  }
  return pts;
}

/**
 * Smooth open path through periodic samples (Catmull-Rom → cubic bezier,
 * with wrapped neighbors so the curve is C1-continuous across tiles).
 */
function smoothPeriodicCrest(pts: SilhouettePoint[], width: number): string {
  const n = pts.length;
  if (n < 3) return '';
  const at = (i: number): SilhouettePoint => {
    if (i < 0) return { x: pts[n - 2 + i + 1]!.x - width, y: pts[n - 2 + i + 1]!.y };
    if (i >= n) return { x: pts[i - n + 1]!.x + width, y: pts[i - n + 1]!.y };
    return pts[i]!;
  };
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export interface Silhouette {
  /** Closed fill path down to `floorY`. */
  fill: string;
  /** Open path along the top edge (crest light). */
  crest: string;
  /** The crest samples — for placing trees/shrubs on the line. */
  points: SilhouettePoint[];
}

function buildSilhouette(
  width: number,
  floorY: number,
  base: number,
  harmonics: Harmonic[],
  segments: number
): Silhouette {
  const points = sampleSilhouette(width, base, harmonics, segments);
  const crest = smoothPeriodicCrest(points, width);
  const fill = `${crest} L ${width.toFixed(1)} ${floorY.toFixed(1)} L 0 ${floorY.toFixed(1)} Z`;
  return { fill, crest, points };
}

/** Distant mountain range — peaky, slow undulation. Period = width. */
export function buildFarRidge(width: number, height: number): Silhouette {
  return buildSilhouette(
    width,
    height,
    height * 0.66,
    [
      { freq: 1, amp: height * 0.3, phase: 0.9, shape: 'ridge' },
      { freq: 2, amp: height * 0.17, phase: 2.2, shape: 'ridge' },
      { freq: 5, amp: height * 0.045, phase: 4.4, shape: 'sin' },
    ],
    26
  );
}

/** Nearer foothill ridge — softer, taller base. */
export function buildMidRidge(width: number, height: number): Silhouette {
  return buildSilhouette(
    width,
    height,
    height * 0.55,
    [
      { freq: 2, amp: height * 0.2, phase: 4.1, shape: 'ridge' },
      { freq: 3, amp: height * 0.1, phase: 1.3, shape: 'sin' },
      { freq: 7, amp: height * 0.03, phase: 5.2, shape: 'sin' },
    ],
    26
  );
}

/** Treeline canopy — clustered round bumps along the horizon. */
export function buildTreeline(width: number, height: number): Silhouette {
  return buildSilhouette(
    width,
    height,
    height * 0.46,
    [
      { freq: 3, amp: height * 0.2, phase: 0.4, shape: 'ridge' },
      { freq: 8, amp: height * 0.16, phase: 2.8, shape: 'ridge' },
      { freq: 13, amp: height * 0.08, phase: 1.7, shape: 'sin' },
    ],
    40
  );
}

/* ------------------------------ meadow hills ---------------------------- */

export interface MeadowHills {
  back: Silhouette;
  mid: Silhouette;
  front: Silhouette;
}

/**
 * Rolling meadow hill bands for one tile. Band anchors match the legacy
 * `buildHillPaths` fractions (0.10 / 0.33 / 0.53 of the meadow SVG height)
 * so flower stems keep sitting on the front slope.
 */
export function buildMeadowHills(width: number, height: number): MeadowHills {
  const back = buildSilhouette(
    width,
    height,
    height * 0.105,
    [
      { freq: 1, amp: height * 0.052, phase: 5.6, shape: 'ridge' },
      { freq: 2, amp: height * 0.032, phase: 1.1, shape: 'sin' },
      { freq: 4, amp: height * 0.013, phase: 3.4, shape: 'sin' },
    ],
    22
  );
  const mid = buildSilhouette(
    width,
    height,
    height * 0.33,
    [
      { freq: 1, amp: height * 0.062, phase: 2.4, shape: 'sin' },
      { freq: 2, amp: height * 0.04, phase: 4.9, shape: 'sin' },
      { freq: 5, amp: height * 0.014, phase: 0.6, shape: 'sin' },
    ],
    22
  );
  const front = buildSilhouette(
    width,
    height,
    height * 0.53,
    [
      { freq: 1, amp: height * 0.035, phase: 0.8, shape: 'sin' },
      { freq: 2, amp: height * 0.022, phase: 3.7, shape: 'sin' },
      { freq: 4, amp: height * 0.01, phase: 5.9, shape: 'sin' },
    ],
    22
  );
  return { back, mid, front };
}

/* ----------------------------- meadow light ----------------------------- */

export interface MeadowLightTint {
  color: string;
  /** Mix factors per hill band — distance catches more of the sky's light. */
  far: number;
  mid: number;
  near: number;
}

const NO_TINT: MeadowLightTint = { color: '#ffffff', far: 0, mid: 0, near: 0 };

/**
 * How the meadow greens bend toward the sky's light per phase/weather.
 * Night phases return no tint — the night palette handles them.
 */
export function getMeadowLightTint(
  timePhase: TimePhase,
  category?: WeatherCategory
): MeadowLightTint {
  if (isStormyCategory(category)) {
    return { color: '#5c6a76', far: 0.36, mid: 0.28, near: 0.2 };
  }
  if (category === 'rain' || category === 'drizzle') {
    return { color: '#8a96a0', far: 0.24, mid: 0.18, near: 0.12 };
  }
  switch (timePhase) {
    case 'dawn':
      return { color: '#c79ab8', far: 0.34, mid: 0.22, near: 0.14 };
    case 'golden_hour':
      return { color: '#e8a45c', far: 0.4, mid: 0.28, near: 0.18 };
    case 'dusk':
      return { color: '#7a5894', far: 0.44, mid: 0.34, near: 0.24 };
    default:
      return NO_TINT;
  }
}

/* --------------------------------- grain -------------------------------- */

/** Static paper-grain tile (SVG turbulence, rendered once by the browser). */
export const GRAIN_DATA_URI = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3CfeComponentTransfer%3E%3CfeFuncA type='linear' slope='0.55'/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23g)'/%3E%3C/svg%3E")`;
