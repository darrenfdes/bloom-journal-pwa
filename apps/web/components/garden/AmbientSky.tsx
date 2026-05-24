'use client';

import React, { useMemo } from 'react';

import { useSceneContextOptional } from '@/lib/scene/SceneContext';
import { getWeatherClouds, isNightPhase } from '@bloom/core/scene';
import { getSeason } from '@bloom/core/theme/seasons';

type CloudProps = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  drift: number;
};

function DriftingCloud({ x, y, scale, opacity, duration, delay, drift }: CloudProps) {
  return (
    <div
      className="ambient-cloud pointer-events-none absolute"
      style={
        {
          left: x,
          top: y,
          scale,
          opacity,
          '--cloud-drift': `${drift}px`,
          '--cloud-duration': `${duration}ms`,
          '--cloud-delay': `${delay}ms`,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <svg width={120} height={50} viewBox="0 0 120 50">
        <ellipse cx="35" cy="32" rx="28" ry="14" fill="rgba(255,255,255,0.72)" />
        <ellipse cx="65" cy="24" rx="34" ry="18" fill="rgba(255,255,255,0.82)" />
        <ellipse cx="92" cy="32" rx="22" ry="12" fill="rgba(255,255,255,0.68)" />
      </svg>
    </div>
  );
}

export function AmbientSky({ month = new Date().getMonth() + 1, width }: { month?: number; width: number }) {
  const scene = useSceneContextOptional();
  const season = getSeason(month);
  const sunY = 60;
  const sunX = width * 0.78;
  const sunR = 36;
  const isWarm = season === 'summer' || season === 'spring';

  const cloudCover = scene?.weather?.cloudCover ?? 35;
  const timePhase = scene?.timePhase ?? 'day';
  const sceneReady = scene?.status === 'ready';

  const clouds = useMemo(
    () => (sceneReady && isNightPhase(timePhase) ? [] : getWeatherClouds(cloudCover, width)),
    [cloudCover, width, sceneReady, timePhase]
  );

  return (
    <div className="pointer-events-none absolute left-0 right-0 top-0 h-[260px] overflow-hidden">
      <div
        className="ambient-sun absolute"
        style={{ left: sunX - sunR, top: sunY - sunR }}
        aria-hidden
      >
        <svg width={sunR * 2} height={sunR * 2}>
          <defs>
            <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isWarm ? '#FFF6CE' : '#F3EBD8'} stopOpacity="1" />
              <stop offset="55%" stopColor={isWarm ? '#FFE5A0' : '#E2DAC6'} stopOpacity="0.95" />
              <stop offset="100%" stopColor={isWarm ? '#FFCC78' : '#C7BFAA'} stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={sunR} cy={sunR} r={sunR * 0.9} fill="url(#sunGrad)" />
          <circle
            cx={sunR}
            cy={sunR}
            r={sunR * 0.45}
            fill={isWarm ? '#FFEFB8' : '#EFE6CE'}
            fillOpacity={0.8}
          />
        </svg>
      </div>

      <svg
        className="absolute bottom-0 left-0 right-0 opacity-95"
        width={width}
        height={120}
        viewBox={`0 0 ${width} 120`}
        preserveAspectRatio="none"
      >
        <path
          d={`M 0 90 L ${width * 0.18} 50 L ${width * 0.3} 78 L ${width * 0.42} 38 L ${width * 0.55} 70 L ${width * 0.68} 42 L ${width * 0.82} 76 L ${width} 56 L ${width} 120 L 0 120 Z`}
          fill="rgba(140, 160, 170, 0.32)"
        />
        <path
          d={`M 0 110 L ${width * 0.22} 78 L ${width * 0.4} 100 L ${width * 0.58} 72 L ${width * 0.75} 96 L ${width} 80 L ${width} 120 L 0 120 Z`}
          fill="rgba(120, 145, 145, 0.38)"
        />
      </svg>

      {clouds.map((cloud, i) => (
        <DriftingCloud key={i} {...cloud} />
      ))}
    </div>
  );
}
