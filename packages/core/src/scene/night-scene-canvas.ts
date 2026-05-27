/**
 * Imperative canvas 2D renderer for the night garden scene.
 *
 * Pure draw/init logic — no React, no DOM ownership. Consumers create a state
 * via `createNightSceneState(W, H)` and call `renderNightScene` on each animation
 * frame (or once for a static render).
 */

import {
  getGardenGroundLineY,
  getGardenHillTop,
  getGardenMeadowHeight,
  getGardenSkyHeight,
} from '../garden/scene-layout';
import {
  getScaledHillLayerYFracs,
  NIGHT_MOUNTAIN_SPEC,
  scaleMeadowHillY,
} from '../garden/season-hills';

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
};

export type NightBlade = {
  x: number;
  y: number;
  h: number;
  off: number;
  c: string;
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
  grass: NightBlade[];
  flies: NightFirefly[];
};

export type RenderNightSceneOptions = {
  showMoon?: boolean;
  /** When true, omit time-dependent motion (cloud drift, sway, firefly path). */
  animate?: boolean;
};

function nightMeadowY(H: number, meadowFrac: number): number {
  return getGardenHillTop(H) + getGardenMeadowHeight(H) * meadowFrac;
}

function initStars(W: number, H: number): NightStar[] {
  return Array.from({ length: 78 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H * 0.52,
    r: 0.4 + Math.random() * 1.1,
    t0: Math.random() * Math.PI * 2,
    ts: 0.007 + Math.random() * 0.016,
  }));
}

function initClouds(W: number, H: number): NightCloud[] {
  return Array.from({ length: 4 }, (_, i) => ({
    x: (i / 4) * W * 1.6 - W * 0.1,
    y: H * 0.06 + Math.random() * H * 0.22,
    w: 90 + Math.random() * 160,
    h: 16 + Math.random() * 30,
    spd: 0.10 + Math.random() * 0.18,
  }));
}

function initGrass(W: number, H: number): NightBlade[] {
  const groundLine = getGardenGroundLineY(H);
  const meadowHeight = getGardenMeadowHeight(H);
  return Array.from({ length: 38 }, () => ({
    x: Math.random() * W,
    y: groundLine + meadowHeight * 0.08 + Math.random() * meadowHeight * 0.09,
    h: H * 0.024 + Math.random() * H * 0.038,
    off: Math.random() * Math.PI * 2,
    c: Math.random() > 0.5 ? '#4a8a3e' : '#2e6228',
  }));
}

function initFireflies(W: number, H: number): NightFirefly[] {
  const meadowTop = getGardenHillTop(H);
  const meadowHeight = getGardenMeadowHeight(H);
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

export function createNightSceneState(W: number, H: number): NightSceneState {
  return {
    stars: initStars(W, H),
    clouds: initClouds(W, H),
    grass: initGrass(W, H),
    flies: initFireflies(W, H),
  };
}

function drawSky(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const skyHeight = getGardenSkyHeight(H);
  const g = ctx.createLinearGradient(0, 0, 0, skyHeight);
  g.addColorStop(0, '#070d1c');
  g.addColorStop(1, '#11203a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, skyHeight);
  ctx.fillStyle = '#11203a';
  ctx.fillRect(0, skyHeight, W, H - skyHeight);
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

function drawMoon(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const mx = W * 0.87;
  const my = H * 0.09;
  const mr = H * 0.053;

  const hg = ctx.createRadialGradient(mx, my, mr * 0.85, mx, my, mr * 2.8);
  hg.addColorStop(0, 'rgba(190,208,228,0.11)');
  hg.addColorStop(1, 'rgba(190,208,228,0)');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(mx, my, mr * 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#c5d0dc';
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(165,178,192,0.42)';
  ctx.beginPath();
  ctx.arc(mx - mr * 0.27, my + mr * 0.13, mr * 0.17, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + mr * 0.21, my - mr * 0.24, mr * 0.10, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  clouds: NightCloud[],
  W: number,
  animate: boolean
) {
  clouds.forEach((c) => {
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
  });
}

function drawMountains(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const meadowTop = getGardenHillTop(H);
  const { foot, base, yFracs, xFracs } = NIGHT_MOUNTAIN_SPEC;
  const y = (frac: number) => nightMeadowY(H, scaleMeadowHillY(foot, frac));
  const mountainBase = nightMeadowY(H, base);

  ctx.fillStyle = '#172535';
  ctx.beginPath();
  ctx.moveTo(0, mountainBase);
  ctx.lineTo(0, y(yFracs[0]!));
  for (let i = 1; i < xFracs.length; i += 1) {
    ctx.lineTo(W * xFracs[i]!, y(yFracs[i]!));
  }
  ctx.lineTo(W, mountainBase);
  ctx.closePath();
  ctx.fill();

  const mg = ctx.createLinearGradient(0, meadowTop, 0, mountainBase + H * 0.02);
  mg.addColorStop(0, 'rgba(90,112,138,0.12)');
  mg.addColorStop(1, 'rgba(90,112,138,0)');
  ctx.fillStyle = mg;
  ctx.fillRect(0, meadowTop, W, mountainBase - meadowTop + H * 0.02);
}

/** Hill silhouettes mirror scaled SVG `buildHillPaths` crests (see season-hills.ts). */
function drawHills(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const meadowTop = getGardenHillTop(H);
  const meadowH = getGardenMeadowHeight(H);
  const yAt = (frac: number) => meadowTop + meadowH * frac;
  const fills = ['#1c3c18', '#255022', '#306a29'] as const;

  getScaledHillLayerYFracs().forEach((layer, index) => {
    const [y0, y1, y2, y3, y4, y5, y6] = layer.yFracs;
    const [x0, x1, x2, x3, x4, x5, x6] = layer.xFracs;

    ctx.fillStyle = fills[index] ?? fills[0];
    ctx.beginPath();
    ctx.moveTo(W * x0, yAt(y0));
    ctx.bezierCurveTo(W * x1, yAt(y1), W * x2, yAt(y2), W * x3, yAt(y3));
    ctx.bezierCurveTo(W * x4, yAt(y4), W * x5, yAt(y5), W * x6, yAt(y6));
    ctx.lineTo(W, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fill();
  });
}

function drawGrass(
  ctx: CanvasRenderingContext2D,
  grass: NightBlade[],
  t: number,
  animate: boolean
) {
  grass.forEach((g) => {
    const sway = animate ? Math.sin(t * 0.021 + g.off) * g.h * 0.28 : 0;
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.quadraticCurveTo(g.x + sway * 0.5, g.y - g.h * 0.55, g.x + sway, g.y - g.h);
    ctx.stroke();
  });
}

function drawFireflies(
  ctx: CanvasRenderingContext2D,
  flies: NightFirefly[],
  W: number,
  H: number,
  animate: boolean
) {
  flies.forEach((f) => {
    if (animate) {
      f.life += f.ls;
      f.x += f.vx + Math.sin(f.life * 1.2) * 0.32;
      f.y += f.vy + Math.cos(f.life * 0.85) * 0.20;
      const meadowTop = getGardenHillTop(H);
      const meadowHeight = getGardenMeadowHeight(H);
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
    fg.addColorStop(1, `rgba(160,228,72,0)`);
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

export function renderNightScene(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  t: number,
  state: NightSceneState,
  opts: RenderNightSceneOptions = {}
): void {
  const { showMoon = true, animate = true } = opts;

  drawSky(ctx, W, H);
  drawStars(ctx, state.stars, t);
  drawClouds(ctx, state.clouds, W, animate);
  if (showMoon) drawMoon(ctx, W, H);
  drawMountains(ctx, W, H);
  drawHills(ctx, W, H);
  drawGrass(ctx, state.grass, t, animate);
  drawFireflies(ctx, state.flies, W, H, animate);
}
