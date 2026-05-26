'use client';

import React, { useMemo } from 'react';

import { CloudCluster } from '@/components/garden/CloudCluster';
import { useSceneContextOptional } from '@/lib/scene/SceneContext';
import {
  getWeatherClouds,
  isNightPhase,
  isPrecipitatingCategory,
  isStormyCategory,
  isSunPhase,
} from '@bloom/core/scene';
import type { CloudVariant, WeatherCategory } from '@bloom/core/scene';
import { getSeason } from '@bloom/core/theme/seasons';

type CloudProps = {
  startX: number;
  endX: number;
  y: number;
  scale: number;
  opacity: number;
  duration: number;
  delay: number;
  variant: CloudVariant;
  static?: boolean;
  clusterVariant: 'fair' | 'storm' | 'drizzle' | 'thunder';
};

function StormSkyHaze({ width, skyHeight }: { width: number; skyHeight: number }) {
  const h = Math.round(skyHeight * 0.55);
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 z-[1]"
      style={{
        width,
        height: h,
        background: `
          radial-gradient(ellipse 85% 70% at 18% 8%, rgba(180, 195, 215, 0.34) 0%, transparent 55%),
          radial-gradient(ellipse 90% 65% at 52% 4%, rgba(150, 168, 190, 0.38) 0%, transparent 58%),
          radial-gradient(ellipse 80% 60% at 82% 10%, rgba(170, 185, 205, 0.3) 0%, transparent 52%),
          linear-gradient(180deg, rgba(70, 85, 105, 0.28) 0%, rgba(70, 85, 105, 0.1) 45%, transparent 100%)
        `,
      }}
      aria-hidden
    />
  );
}

function DriftingCloud({
  startX,
  endX,
  y,
  scale,
  opacity,
  duration,
  delay,
  static: isStatic,
  clusterVariant,
}: CloudProps) {
  return (
    <div
      className={`ambient-cloud pointer-events-none absolute left-0 z-[3]${isStatic ? ' ambient-cloud-static' : ''}`}
      style={
        {
          top: y,
          opacity,
          '--cloud-start': `${startX}px`,
          '--cloud-end': `${endX}px`,
          '--cloud-duration': `${duration}ms`,
          '--cloud-delay': `${delay}ms`,
          '--cloud-scale': scale,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <CloudCluster variant={clusterVariant} />
    </div>
  );
}

function clusterVariantFor(
  category: WeatherCategory | undefined,
  cloudVariant: CloudVariant,
  thunder: boolean
): 'fair' | 'storm' | 'drizzle' | 'thunder' {
  if (cloudVariant === 'fair') {
    return category === 'drizzle' ? 'drizzle' : 'fair';
  }
  return thunder ? 'thunder' : 'storm';
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
  const category = scene?.weather?.category;
  const timePhase = scene?.timePhase ?? 'day';
  const sceneReady = scene?.status === 'ready';
  const stormy = isStormyCategory(category);
  const precipitating = category != null && isPrecipitatingCategory(category);
  const thunder = category === 'thunderstorm' || category === 'heavy_rain';

  const clouds = useMemo(
    () =>
      sceneReady && isNightPhase(timePhase)
        ? []
        : getWeatherClouds(cloudCover, width, category),
    [cloudCover, width, sceneReady, timePhase, category]
  );

  const mountainH = Math.min(140, Math.round(skyHeight * 0.45));
  const showSun =
    sceneReady && isSunPhase(timePhase) && timePhase !== 'dawn' && !stormy;
  const showStormHaze =
    sceneReady && precipitating && category !== 'drizzle';

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ height: skyHeight }}
    >
      {showStormHaze ? <StormSkyHaze width={width} skyHeight={skyHeight} /> : null}

      {showSun ? (
        <div
          className="ambient-sun absolute z-[2]"
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
      ) : null}

      {clouds.map((cloud, i) => (
        <DriftingCloud
          key={i}
          {...cloud}
          clusterVariant={clusterVariantFor(category, cloud.variant, thunder)}
        />
      ))}

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
          fill={stormy ? 'rgba(90, 105, 115, 0.42)' : 'rgba(140, 160, 170, 0.38)'}
        />
        <path
          d={`M 0 ${mountainH * 0.92} L ${width * 0.22} ${mountainH * 0.65} L ${width * 0.4} ${mountainH * 0.83} L ${width * 0.58} ${mountainH * 0.6} L ${width * 0.75} ${mountainH * 0.8} L ${width} ${mountainH * 0.67} L ${width} ${mountainH} L 0 ${mountainH} Z`}
          fill={stormy ? 'rgba(70, 88, 95, 0.5)' : 'rgba(120, 145, 145, 0.45)'}
        />
      </svg>
    </div>
  );
}
