import type { GroundVariant } from '../types';

export function buildHillPaths(width: number, groundSvgH: number) {
  const backHill = `M 0 ${groundSvgH * 0.1}
    C ${width * 0.15} ${groundSvgH * 0.02} ${width * 0.32} ${groundSvgH * 0.14} ${width * 0.5} ${groundSvgH * 0.08}
    C ${width * 0.7} ${groundSvgH * 0} ${width * 0.85} ${groundSvgH * 0.18} ${width} ${groundSvgH * 0.1}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const midHill = `M 0 ${groundSvgH * 0.35}
    C ${width * 0.2} ${groundSvgH * 0.25} ${width * 0.4} ${groundSvgH * 0.4} ${width * 0.55} ${groundSvgH * 0.3}
    C ${width * 0.75} ${groundSvgH * 0.2} ${width * 0.88} ${groundSvgH * 0.35} ${width} ${groundSvgH * 0.28}
    L ${width} ${groundSvgH} L 0 ${groundSvgH} Z`;

  const frontHill = `M 0 ${groundSvgH * 0.55}
    C ${width * 0.18} ${groundSvgH * 0.45} ${width * 0.35} ${groundSvgH * 0.57} ${width * 0.5} ${groundSvgH * 0.51}
    C ${width * 0.72} ${groundSvgH * 0.43} ${width * 0.88} ${groundSvgH * 0.57} ${width} ${groundSvgH * 0.51}
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
