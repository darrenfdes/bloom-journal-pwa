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

export function AmbientSky({
  month = new Date().getMonth() + 1,
  width,
  skyHeight = 260,
}: {
  month?: number;
  width: number;
  skyHeight?: number;
}) {
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

  const mountainH = Math.min(140, Math.round(skyHeight * 0.45));

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ height: skyHeight }}
    >
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
        className="absolute bottom-0 left-0 right-0 z-[2] opacity-95"
        width={width}
        height={mountainH}
        viewBox={`0 0 ${width} ${mountainH}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <path
          d={`M 0 ${mountainH * 0.75} L ${width * 0.18} ${mountainH * 0.42} L ${width * 0.3} ${mountainH * 0.65} L ${width * 0.42} ${mountainH * 0.32} L ${width * 0.55} ${mountainH * 0.58} L ${width * 0.68} ${mountainH * 0.35} L ${width * 0.82} ${mountainH * 0.63} L ${width} ${mountainH * 0.47} L ${width} ${mountainH} L 0 ${mountainH} Z`}
          fill="rgba(140, 160, 170, 0.38)"
        />
        <path
          d={`M 0 ${mountainH * 0.92} L ${width * 0.22} ${mountainH * 0.65} L ${width * 0.4} ${mountainH * 0.83} L ${width * 0.58} ${mountainH * 0.6} L ${width * 0.75} ${mountainH * 0.8} L ${width} ${mountainH * 0.67} L ${width} ${mountainH} L 0 ${mountainH} Z`}
          fill="rgba(120, 145, 145, 0.45)"
        />
      </svg>

      {clouds.map((cloud, i) => (
        <DriftingCloud key={i} {...cloud} />
      ))}
    </div>
  );
}
