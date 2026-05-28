/**
 * Imperative canvas 2D renderer for the night garden scene.
 *
 * Pure draw/init logic — no React, no DOM ownership. Consumers create a state
 * via `createNightSceneState(W, skyBandHeight, sceneHeight)` and call
 * `renderNightAtmosphere` on each animation frame (or once for a static render).
 *
 * Hill geometry stays in SVG (buildHillPaths); this draws sky, mountains, and FX only.
 */

import {
  getGardenHorizonLayout,
  MOUNTAIN_REF_MAX,
} from '../garden/horizon-layout';
import {
  getGardenHillTop,
  getGardenMeadowHeight,
} from '../garden/scene-layout';
import { applyMoonPhaseShadow, type MoonPhaseState } from './moon-phase';

export type NightStar = {
  x: number;
  y: number;
  r: number;
  t0: number;
  ts: number;
};

export type NightCloud = {
  x: number;
  y: number;
  w: number;
  h: number;
  spd: number;
  layer: 'back' | 'front';
};

export type NightFirefly = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ls: number;
  sz: number;
};

export type NightSceneState = {
  stars: NightStar[];
  clouds: NightCloud[];
  flies: NightFirefly[];
};

export type RenderNightSceneOptions = {
  showMoon?: boolean;
  moonPhase?: MoonPhaseState;
  latitude?: number;
  /** Pan height — required when sky band H differs (web with header offset). */
  sceneHeight?: number;
  /** When true, omit time-dependent motion (cloud drift, firefly path). */
  animate?: boolean;
};

export type RenderNightLayerOptions = RenderNightSceneOptions;

const CLOUD_BACK_Y_FRAC = 0.38;

function initStars(W: number, skyBandHeight: number): NightStar[] {
  return Array.from({ length: 78 }, () => ({
    x: Math.random() * W,
    y: Math.random() * skyBandHeight * 0.92,
    r: 0.4 + Math.random() * 1.1,
    t0: Math.random() * Math.PI * 2,
    ts: 0.007 + Math.random() * 0.016,
  }));
}

function initClouds(W: number, skyBandHeight: number): NightCloud[] {
  return Array.from({ length: 4 }, (_, i) => {
    const y = skyBandHeight * 0.06 + Math.random() * skyBandHeight * 0.22;
    return {
      x: (i / 4) * W * 1.6 - W * 0.1,
      y,
      w: 90 + Math.random() * 160,
      h: 16 + Math.random() * 30,
      spd: 0.1 + Math.random() * 0.18,
      layer: y < skyBandHeight * CLOUD_BACK_Y_FRAC ? 'back' : 'front',
    };
  });
}

function initFireflies(W: number, sceneHeight: number): NightFirefly[] {
  const meadowTop = getGardenHillTop(sceneHeight);
  const meadowHeight = getGardenMeadowHeight(sceneHeight);
  return Array.from({ length: 9 }, () => ({
    x: 60 + Math.random() * (W - 120),
    y: meadowTop + meadowHeight * 0.18 + Math.random() * meadowHeight * 0.42,
    vx: (Math.random() - 0.5) * 0.38,
    vy: (Math.random() - 0.5) * 0.22,
    life: Math.random() * Math.PI * 2,
    ls: 0.013 + Math.random() * 0.019,
    sz: 1.1 + Math.random() * 0.9,
  }));
}

export function createNightSceneState(
  W: number,
  skyBandHeight: number,
  sceneHeight: number = skyBandHeight
): NightSceneState {
  return {
    stars: initStars(W, skyBandHeight),
    clouds: initClouds(W, skyBandHeight),
    flies: initFireflies(W, sceneHeight),
  };
}

function drawSky(ctx: CanvasRenderingContext2D, W: number, skyBandHeight: number) {
  const g = ctx.createLinearGradient(0, 0, 0, skyBandHeight);
  g.addColorStop(0, '#070d1c');
  g.addColorStop(1, '#11203a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, skyBandHeight);
}

function drawStars(ctx: CanvasRenderingContext2D, stars: NightStar[], t: number) {
  stars.forEach((s) => {
    const a = 0.32 + 0.68 * (0.5 + 0.5 * Math.sin(t * s.ts + s.t0));
    ctx.fillStyle = `rgba(205,220,245,${a})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

export type NightMoonCrater = {
  dx: number;
  dy: number;
  r: number;
  /** Horizontal stretch relative to base radius. */
  rx?: number;
  /** Vertical stretch relative to base radius. */
  ry?: number;
  /** 0–1 — deeper craters read darker in the bowl. */
  depth?: number;
};

/** Craters below this normalized radius skip rim/shadow layers — bowl only reads cleaner. */
export const NIGHT_MOON_CRATER_DETAIL_MIN_R = 0.04;

/** Normalized crater positions relative to moon radius — shared by canvas + SVG. */
export const NIGHT_MOON_CRATERS: NightMoonCrater[] = [
  // Large prominent craters
  { dx: -0.33, dy: -0.21, r: 0.13, rx: 1.12, ry: 0.76, depth: 0.72 },
  { dx: 0.24, dy: -0.19, r: 0.095, rx: 0.94, ry: 0.86, depth: 0.58 },
  { dx: -0.14, dy: 0.3, r: 0.105, rx: 1.06, ry: 0.74, depth: 0.64 },

  // Medium craters — fill each quadrant
  { dx: 0.3, dy: 0.22, r: 0.072, rx: 1, ry: 0.82, depth: 0.5 },
  { dx: -0.38, dy: 0.04, r: 0.062, rx: 0.96, ry: 0.88, depth: 0.46 },
  { dx: 0.06, dy: -0.36, r: 0.058, rx: 1.04, ry: 0.78, depth: 0.44 },
  { dx: -0.06, dy: 0.08, r: 0.055, rx: 0.9, ry: 0.92, depth: 0.48 },
  { dx: 0.36, dy: -0.06, r: 0.05, rx: 0.88, ry: 0.9, depth: 0.42 },

  // Small craters — surface texture
  { dx: -0.24, dy: -0.36, r: 0.042, rx: 1, ry: 0.86, depth: 0.4 },
  { dx: 0.14, dy: -0.08, r: 0.038, rx: 0.92, ry: 0.94, depth: 0.38 },
  { dx: -0.32, dy: 0.18, r: 0.035, rx: 1.08, ry: 0.8, depth: 0.36 },
  { dx: 0.2, dy: 0.38, r: 0.033, rx: 0.94, ry: 0.88, depth: 0.35 },
  { dx: -0.18, dy: -0.06, r: 0.03, rx: 1, ry: 0.9, depth: 0.34 },

  // Micro pinpricks — bowl only
  { dx: 0.4, dy: -0.28, r: 0.024, depth: 0.3 },
  { dx: -0.42, dy: -0.14, r: 0.022, depth: 0.28 },
  { dx: 0.08, dy: 0.2, r: 0.02, depth: 0.26 },
  { dx: -0.08, dy: 0.4, r: 0.018, depth: 0.24 },
  { dx: 0.28, dy: 0.06, r: 0.016, depth: 0.22 },
  { dx: -0.02, dy: -0.14, r: 0.014, depth: 0.2 },
];

export function getNightMoonCraterGeometry(
  mx: number,
  my: number,
  mr: number,
  crater: NightMoonCrater
): { cx: number; cy: number; rx: number; ry: number; depth: number } {
  const cx = mx + mr * crater.dx;
  const cy = my + mr * crater.dy;
  const baseR = mr * crater.r;
  return {
    cx,
    cy,
    rx: baseR * (crater.rx ?? 1),
    ry: baseR * (crater.ry ?? 0.82),
    depth: crater.depth ?? 0.55,
  };
}

/** Soft elliptical bowls with a lit rim — matches the moon's upper-left light source. */
export function drawNightMoonCraters(
  ctx: CanvasRenderingContext2D,
  mx: number,
  my: number,
  mr: number
): void {
  NIGHT_MOON_CRATERS.forEach((crater) => {
    const { cx, cy, rx, ry, depth } = getNightMoonCraterGeometry(mx, my, mr, crater);
    const bowlR = Math.max(rx, ry);
    const showDetail = crater.r >= NIGHT_MOON_CRATER_DETAIL_MIN_R;

    const bowl = ctx.createRadialGradient(cx, cy, 0, cx, cy, bowlR);
    bowl.addColorStop(0, `rgba(58,64,88,${0.28 + depth * 0.3})`);
    bowl.addColorStop(0.45, `rgba(78,84,108,${0.12 + depth * 0.14})`);
    bowl.addColorStop(0.78, `rgba(108,116,142,${0.04 + depth * 0.06})`);
    bowl.addColorStop(1, 'rgba(120,128,155,0)');
    ctx.fillStyle = bowl;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!showDetail) return;

    const rimCx = cx - rx * 0.28;
    const rimCy = cy - ry * 0.32;
    const rim = ctx.createRadialGradient(rimCx, rimCy, 0, rimCx, rimCy, bowlR * 0.72);
    rim.addColorStop(0, `rgba(228,234,248,${0.16 + depth * 0.08})`);
    rim.addColorStop(0.5, 'rgba(196,204,224,0.06)');
    rim.addColorStop(1, 'rgba(196,204,224,0)');
    ctx.fillStyle = rim;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.88, ry * 0.88, 0, 0, Math.PI * 2);
    ctx.fill();

    const shadowCx = cx + rx * 0.22;
    const shadowCy = cy + ry * 0.26;
    const shadow = ctx.createRadialGradient(shadowCx, shadowCy, 0, shadowCx, shadowCy, bowlR * 0.55);
    shadow.addColorStop(0, `rgba(48,54,76,${0.08 + depth * 0.1})`);
    shadow.addColorStop(0.6, 'rgba(48,54,76,0)');
    ctx.fillStyle = shadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.72, ry * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function getNightMoonLayout(
  W: number,
  skyBandHeight: number,
  sceneHeight: number
): { mx: number; my: number; mr: number } {
  const mr = sceneHeight * 0.053;
  const mx = W * 0.87;
  const my = Math.min(sceneHeight * 0.09, skyBandHeight * 0.32);
  return { mx, my, mr };
}

function drawMoon(
  ctx: CanvasRenderingContext2D,
  W: number,
  skyBandHeight: number,
  sceneHeight: number,
  moonPhase?: MoonPhaseState,
  latitude = 0
) {
  const { mx, my, mr } = getNightMoonLayout(W, skyBandHeight, sceneHeight);
  const hour = new Date().getHours();

  const mg = ctx.createRadialGradient(
    mx - mr * 0.3,
    my - mr * 0.36,
    mr * 0.05,
    mx,
    my,
    mr
  );
  mg.addColorStop(0, '#f4f6ff');
  mg.addColorStop(0.55, '#dde2f0');
  mg.addColorStop(1, '#b8bfd4');
  ctx.fillStyle = mg;
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.clip();
  drawNightMoonCraters(ctx, mx, my, mr);
  ctx.restore();

  if (moonPhase) {
    applyMoonPhaseShadow(ctx, mx, my, mr, moonPhase, latitude, hour);
  }
}

function drawCloud(
  ctx: CanvasRenderingContext2D,
  c: NightCloud,
  W: number,
  animate: boolean
) {
  if (animate) {
    c.x += c.spd;
    if (c.x > W + c.w) c.x = -c.w;
  }
  ctx.fillStyle = 'rgba(130,148,168,0.08)';
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, c.w, c.h * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x - c.w * 0.28, c.y + c.h * 0.12, c.w * 0.56, c.h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x + c.w * 0.22, c.y + c.h * 0.08, c.w * 0.46, c.h * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloudsLayer(
  ctx: CanvasRenderingContext2D,
  clouds: NightCloud[],
  W: number,
  layer: 'back' | 'front',
  animate: boolean
) {
  clouds.filter((c) => c.layer === layer).forEach((c) => drawCloud(ctx, c, W, animate));
}

function drawMountains(
  ctx: CanvasRenderingContext2D,
  W: number,
  sceneHeight: number,
  skyBandHeight: number
) {
  const { mountainY } = getGardenHorizonLayout(sceneHeight, skyBandHeight);
  const base = mountainY(MOUNTAIN_REF_MAX);

  ctx.fillStyle = '#172535';
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.lineTo(0, mountainY(0.41));
  ctx.lineTo(W * 0.13, mountainY(0.25));
  ctx.lineTo(W * 0.29, mountainY(0.37));
  ctx.lineTo(W * 0.43, mountainY(0.27));
  ctx.lineTo(W * 0.58, mountainY(0.195));
  ctx.lineTo(W * 0.7, mountainY(0.32));
  ctx.lineTo(W * 0.83, mountainY(0.37));
  ctx.lineTo(W, mountainY(0.35));
  ctx.lineTo(W, base);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1c2e42';
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.lineTo(0, mountainY(0.47));
  ctx.lineTo(W * 0.09, mountainY(0.37));
  ctx.lineTo(W * 0.23, mountainY(0.45));
  ctx.lineTo(W * 0.37, mountainY(0.31));
  ctx.lineTo(W * 0.51, mountainY(0.42));
  ctx.lineTo(W * 0.65, mountainY(0.35));
  ctx.lineTo(W * 0.79, mountainY(0.45));
  ctx.lineTo(W, mountainY(0.43));
  ctx.lineTo(W, base);
  ctx.closePath();
  ctx.fill();
}

function drawFireflies(
  ctx: CanvasRenderingContext2D,
  flies: NightFirefly[],
  W: number,
  sceneHeight: number,
  animate: boolean
) {
  flies.forEach((f) => {
    if (animate) {
      f.life += f.ls;
      f.x += f.vx + Math.sin(f.life * 1.2) * 0.32;
      f.y += f.vy + Math.cos(f.life * 0.85) * 0.2;
      const meadowTop = getGardenHillTop(sceneHeight);
      const meadowHeight = getGardenMeadowHeight(sceneHeight);
      const minY = meadowTop + meadowHeight * 0.18;
      const maxY = meadowTop + meadowHeight * 0.62;
      if (f.x < 0) f.x = W;
      if (f.x > W) f.x = 0;
      if (f.y < minY) f.y = maxY;
      if (f.y > maxY) f.y = minY;
    }

    const a = Math.max(0, Math.sin(f.life));
    if (a < 0.05) return;

    const fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.sz * 5.5);
    fg.addColorStop(0, `rgba(160,228,72,${a * 0.72})`);
    fg.addColorStop(1, 'rgba(160,228,72,0)');
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.sz * 5.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(205,255,130,${a})`;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.sz, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** SVG path data for mobile / static overlays — same geometry as canvas mountains. */
export function getNightMountainSvgPaths(
  W: number,
  sceneHeight: number,
  skyBandHeight: number
): { back: string; mid: string } {
  const { mountainY } = getGardenHorizonLayout(sceneHeight, skyBandHeight);
  const base = mountainY(MOUNTAIN_REF_MAX);
  const back = [
    `M 0 ${base}`,
    `L 0 ${mountainY(0.41)}`,
    `L ${W * 0.13} ${mountainY(0.25)}`,
    `L ${W * 0.29} ${mountainY(0.37)}`,
    `L ${W * 0.43} ${mountainY(0.27)}`,
    `L ${W * 0.58} ${mountainY(0.195)}`,
    `L ${W * 0.7} ${mountainY(0.32)}`,
    `L ${W * 0.83} ${mountainY(0.37)}`,
    `L ${W} ${mountainY(0.35)}`,
    `L ${W} ${base}`,
    'Z',
  ].join(' ');
  const mid = [
    `M 0 ${base}`,
    `L 0 ${mountainY(0.47)}`,
    `L ${W * 0.09} ${mountainY(0.37)}`,
    `L ${W * 0.23} ${mountainY(0.45)}`,
    `L ${W * 0.37} ${mountainY(0.31)}`,
    `L ${W * 0.51} ${mountainY(0.42)}`,
    `L ${W * 0.65} ${mountainY(0.35)}`,
    `L ${W * 0.79} ${mountainY(0.45)}`,
    `L ${W} ${mountainY(0.43)}`,
    `L ${W} ${base}`,
    'Z',
  ].join(' ');
  return { back, mid };
}

/**
 * Fixed background: sky → stars → back clouds → mountains → moon → front clouds.
 * Moon sits above distant peaks so it reads in front of the ridge line.
 */
export function renderNightAtmosphere(
  ctx: CanvasRenderingContext2D,
  W: number,
  skyBandHeight: number,
  t: number,
  state: NightSceneState,
  opts: RenderNightLayerOptions = {}
): void {
  const { showMoon = true, animate = true, sceneHeight = skyBandHeight, moonPhase, latitude = 0 } = opts;

  ctx.clearRect(0, 0, W, skyBandHeight);
  drawSky(ctx, W, skyBandHeight);
  drawStars(ctx, state.stars, t);
  drawCloudsLayer(ctx, state.clouds, W, 'back', animate);
  drawMountains(ctx, W, sceneHeight, skyBandHeight);
  if (showMoon) drawMoon(ctx, W, skyBandHeight, sceneHeight, moonPhase, latitude);
  drawCloudsLayer(ctx, state.clouds, W, 'front', animate);
}

/** Meadow fireflies only — render in the pan above hills, below flowers. */
export function renderNightFireflies(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  state: NightSceneState,
  opts: RenderNightLayerOptions = {}
): void {
  const { animate = true, sceneHeight = H } = opts;

  ctx.clearRect(0, 0, W, H);
  drawFireflies(ctx, state.flies, W, sceneHeight, animate);
}

/** @deprecated Use renderNightFireflies — horizon layer is fireflies-only. */
export function renderNightHorizon(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  state: NightSceneState,
  opts: RenderNightLayerOptions = {}
): void {
  renderNightFireflies(ctx, W, H, t, state, opts);
}

export function renderNightScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  skyBandHeight: number,
  t: number,
  state: NightSceneState,
  opts: RenderNightSceneOptions = {}
): void {
  const { sceneHeight = skyBandHeight } = opts;
  renderNightAtmosphere(ctx, W, skyBandHeight, t, state, opts);
  renderNightFireflies(ctx, W, sceneHeight, t, state, opts);
}
