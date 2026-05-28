/**
 * Animated meadow grass blades (quadratic sway).
 * Used by garden pan layers at all time phases.
 */

import { getGardenGroundLineY, getGardenMeadowHeight } from './scene-layout';

export type SwayingBlade = {
  x: number;
  y: number;
  h: number;
  off: number;
  c: string;
};

export type SwayingGrassState = {
  blades: SwayingBlade[];
};

export type RenderSwayingGrassOptions = {
  animate?: boolean;
};

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSwayingGrassState(
  W: number,
  H: number,
  seed = 1337
): SwayingGrassState {
  const rng = mulberry32(seed);
  const groundLine = getGardenGroundLineY(H);
  const meadowHeight = getGardenMeadowHeight(H);
  const blades: SwayingBlade[] = Array.from({ length: 38 }, () => ({
    x: rng() * W,
    y: groundLine + meadowHeight * 0.08 + rng() * meadowHeight * 0.09,
    h: H * 0.024 + rng() * H * 0.038,
    off: rng() * Math.PI * 2,
    c: rng() > 0.5 ? '#4a8a3e' : '#2e6228',
  }));
  return { blades };
}

export function renderSwayingGrass(
  ctx: CanvasRenderingContext2D,
  W: number,
  _H: number,
  t: number,
  state: SwayingGrassState,
  opts: RenderSwayingGrassOptions = {}
): void {
  const { animate = true } = opts;
  const frame = animate ? t : 0;

  state.blades.forEach((g) => {
    const sway = Math.sin(frame * 0.021 + g.off) * g.h * 0.28;
    ctx.strokeStyle = g.c;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(g.x, g.y);
    ctx.quadraticCurveTo(g.x + sway * 0.5, g.y - g.h * 0.55, g.x + sway, g.y - g.h);
    ctx.stroke();
  });
}
