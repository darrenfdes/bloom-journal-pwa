import type { GroundVariant } from '../types';

/** Multiplier for hill crest rise above each layer's foot line (≥3 = visibly taller background). */
export const HILL_CREST_SCALE = 3;

type HillLayerSpec = {
  foot: number;
  /** [startY, cp1y, cp2y, endY, cp3y, cp4y, endY] within hill SVG height. */
  yFracs: readonly [number, number, number, number, number, number, number];
  xFracs: readonly [number, number, number, number, number, number, number];
};

const HILL_LAYERS: readonly HillLayerSpec[] = [
  {
    foot: 0.1,
    yFracs: [0.1, 0.02, 0.14, 0.08, 0.0, 0.18, 0.1],
    xFracs: [0, 0.15, 0.32, 0.5, 0.7, 0.85, 1],
  },
  {
    foot: 0.35,
    yFracs: [0.35, 0.25, 0.4, 0.3, 0.2, 0.35, 0.28],
    xFracs: [0, 0.2, 0.4, 0.55, 0.75, 0.88, 1],
  },
  {
    foot: 0.55,
    yFracs: [0.55, 0.45, 0.57, 0.51, 0.43, 0.57, 0.51],
    xFracs: [0, 0.18, 0.35, 0.5, 0.72, 0.88, 1],
  },
] as const;

/** Night-canvas mountain ridge — same crest scale, foot at meadow frac 0.20. */
export const NIGHT_MOUNTAIN_SPEC = {
  foot: 0.2,
  base: 0.2,
  yFracs: [0.1, 0.02, 0.08, 0.03, 0.06, 0.12, 0.04, 0.02] as const,
  xFracs: [0, 0.13, 0.29, 0.43, 0.58, 0.7, 0.83, 1] as const,
} as const;

function scaleCrestY(foot: number, y: number, scale = HILL_CREST_SCALE): number {
  if (y <= foot) return foot - (foot - y) * scale;
  return foot + (y - foot) * 0.6;
}

function scaleLayer(spec: HillLayerSpec): HillLayerSpec {
  const [y0, y1, y2, y3, y4, y5, y6] = spec.yFracs;
  return {
    foot: spec.foot,
    yFracs: [
      scaleCrestY(spec.foot, y0),
      scaleCrestY(spec.foot, y1),
      scaleCrestY(spec.foot, y2),
      scaleCrestY(spec.foot, y3),
      scaleCrestY(spec.foot, y4),
      scaleCrestY(spec.foot, y5),
      scaleCrestY(spec.foot, y6),
    ],
    xFracs: spec.xFracs,
  };
}

const SCALED_HILL_LAYERS = HILL_LAYERS.map(scaleLayer);

/** Scaled meadow-relative Y fractions for canvas renderers (night scene). */
export function getScaledHillLayerYFracs(): ReadonlyArray<HillLayerSpec> {
  return SCALED_HILL_LAYERS;
}

export function scaleMeadowHillY(foot: number, y: number): number {
  return scaleCrestY(foot, y);
}

function hillPath(width: number, groundSvgH: number, layer: HillLayerSpec): string {
  const [y0, y1, y2, y3, y4, y5, y6] = layer.yFracs;
  const [x0, x1, x2, x3, x4, x5, x6] = layer.xFracs;
  const y = (frac: number) => groundSvgH * frac;
  const x = (frac: number) => width * frac;

  return `M ${x(x0)} ${y(y0)}
    C ${x(x1)} ${y(y1)} ${x(x2)} ${y(y2)} ${x(x3)} ${y(y3)}
    C ${x(x4)} ${y(y4)} ${x(x5)} ${y(y5)} ${x(x6)} ${y(y6)}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;
}

export function buildHillPaths(width: number, groundSvgH: number) {
  const back = SCALED_HILL_LAYERS[0]!;
  const mid = SCALED_HILL_LAYERS[1]!;
  const front = SCALED_HILL_LAYERS[2]!;
  return {
    backHill: hillPath(width, groundSvgH, back),
    midHill: hillPath(width, groundSvgH, mid),
    frontHill: hillPath(width, groundSvgH, front),
  };
}

export function getHorizonGlow(
  variant: GroundVariant,
  season: 'spring' | 'summer' | 'autumn' | 'winter'
): string {
  if (variant === 4) return '#F8E4B0';
  if (season === 'spring') return '#FDE9C9';
  if (season === 'summer') return '#FFE3B0';
  if (season === 'autumn') return '#F4C794';
  return '#E2DCE6';
}
