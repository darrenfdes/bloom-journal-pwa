'use client';

import { useId } from 'react';

type Props = {
  variant: 'fair' | 'storm' | 'drizzle' | 'thunder';
  width?: number;
  height?: number;
};

/** Soft multi-lobe cloud: sharp core silhouette + blurred puff layer. */
export function CloudCluster({ variant, width = 160, height = 64 }: Props) {
  const uid = useId().replace(/:/g, '');
  const blurId = `cloud-blur-${uid}`;

  const palette =
    variant === 'fair'
      ? { hi: 'rgba(255,255,255,0.92)', mid: 'rgba(255,255,255,0.78)', lo: 'rgba(240,245,252,0.55)', core: 'rgba(255,255,255,0.4)' }
      : variant === 'drizzle'
        ? { hi: 'rgba(230,236,245,0.65)', mid: 'rgba(190,200,215,0.5)', lo: 'rgba(160,175,195,0.35)', core: 'rgba(210,220,235,0.38)' }
        : variant === 'thunder'
          ? { hi: 'rgba(235,242,252,0.92)', mid: 'rgba(175,190,210,0.72)', lo: 'rgba(110,125,145,0.55)', core: 'rgba(190,205,225,0.42)' }
          : { hi: 'rgba(230,240,252,0.9)', mid: 'rgba(175,190,210,0.7)', lo: 'rgba(115,130,150,0.5)', core: 'rgba(195,210,228,0.4)' };

  return (
    <svg width={width} height={height} viewBox="0 0 160 64" aria-hidden>
      <defs>
        <filter id={blurId} x="-30%" y="-40%" width="160%" height="180%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <radialGradient id={`${blurId}-hi`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor={palette.hi} />
          <stop offset="100%" stopColor={palette.mid} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${blurId}-mid`} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={palette.mid} />
          <stop offset="100%" stopColor={palette.lo} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g>
        <ellipse cx="72" cy="30" rx="36" ry="20" fill={palette.core} />
        <ellipse cx="48" cy="36" rx="28" ry="16" fill={palette.core} opacity="0.85" />
        <ellipse cx="100" cy="34" rx="26" ry="15" fill={palette.core} opacity="0.75" />
      </g>
      <g filter={`url(#${blurId})`}>
        <ellipse cx="38" cy="40" rx="32" ry="19" fill={`url(#${blurId}-mid)`} />
        <ellipse cx="72" cy="28" rx="38" ry="24" fill={`url(#${blurId}-hi)`} />
        <ellipse cx="104" cy="38" rx="30" ry="18" fill={`url(#${blurId}-mid)`} />
        <ellipse cx="128" cy="34" rx="24" ry="15" fill={`url(#${blurId}-mid)`} opacity="0.9" />
        <ellipse cx="56" cy="26" rx="26" ry="15" fill={`url(#${blurId}-hi)`} opacity="0.8" />
        <ellipse cx="88" cy="44" rx="40" ry="12" fill={palette.lo} opacity="0.55" />
      </g>
    </svg>
  );
}
