import type { GroundVariant } from '../types';

export function buildHillPaths(width: number, groundSvgH: number) {
  const backHill = `M 0 ${groundSvgH * 0.42}
    C ${width * 0.15} ${groundSvgH * 0.34} ${width * 0.32} ${groundSvgH * 0.46} ${width * 0.5} ${groundSvgH * 0.4}
    C ${width * 0.7} ${groundSvgH * 0.32} ${width * 0.85} ${groundSvgH * 0.5} ${width} ${groundSvgH * 0.42}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const midHill = `M 0 ${groundSvgH * 0.55}
    C ${width * 0.2} ${groundSvgH * 0.45} ${width * 0.4} ${groundSvgH * 0.6} ${width * 0.55} ${groundSvgH * 0.5}
    C ${width * 0.75} ${groundSvgH * 0.4} ${width * 0.88} ${groundSvgH * 0.55} ${width} ${groundSvgH * 0.48}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const frontHill = `M 0 ${groundSvgH * 0.7}
    C ${width * 0.18} ${groundSvgH * 0.6} ${width * 0.35} ${groundSvgH * 0.72} ${width * 0.5} ${groundSvgH * 0.66}
    C ${width * 0.72} ${groundSvgH * 0.58} ${width * 0.88} ${groundSvgH * 0.72} ${width} ${groundSvgH * 0.66}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  return { backHill, midHill, frontHill };
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
