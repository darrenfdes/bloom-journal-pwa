'use client';

import React, { useId, useMemo } from 'react';

import { CloudCluster } from '@/components/garden/CloudCluster';
import {
  buildFarRidge,
  buildMidRidge,
  buildTreeline,
  getHorizonHaze,
  getRidgeColors,
  mixHex,
} from '@/lib/scene/atmosphere';
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

/** Parallax factors per silhouette layer — fraction of meadow scroll speed. */
const FAR_RIDGE_PARALLAX = 0.05;
const MID_RIDGE_PARALLAX = 0.1;
const TREELINE_PARALLAX = 0.18;

function parallaxOffset(scrollLeft: number, factor: number, period: number): number {
  if (period <= 0) return 0;
  const raw = (scrollLeft * factor) % period;
  return raw < 0 ? raw + period : raw;
}

/**
 * One horizon silhouette band: a periodic 2×-width SVG translated by a
 * fraction of the meadow scroll for depth parallax.
 */
function SilhouetteBand({
  width,
  height,
  fillPath,
  crestPath,
  fillTop,
  fillBottom,
  crestColor,
  opacity,
  offset,
  gradId,
}: {
  width: number;
  height: number;
  fillPath: string;
  crestPath: string;
  fillTop: string;
  fillBottom: string;
  crestColor: string;
  opacity: number;
  offset: number;
  gradId: string;
}) {
  return (
    <div
      className="absolute bottom-0 left-0"
      style={{
        width: width * 2,
        height,
        transform: `translate3d(${-offset}px, 0, 0)`,
        opacity,
      }}
    >
      <svg
        width={width * 2}
        height={height}
        viewBox={`0 0 ${width * 2} ${height}`}
        preserveAspectRatio="none"
        className="absolute inset-0"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillTop} />
            <stop offset="100%" stopColor={fillBottom} />
          </linearGradient>
        </defs>
        {[0, width].map((dx) => (
          <g key={dx} transform={dx === 0 ? undefined : `translate(${dx} 0)`}>
            <path d={fillPath} fill={`url(#${gradId})`} />
            <path
              d={crestPath}
              fill="none"
              stroke={crestColor}
              strokeWidth={1.1}
              strokeOpacity={0.5}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function AmbientSky({
  month = new Date().getMonth() + 1,
  width,
  skyHeight = 260,
  scrollLeft = 0,
}: {
  month?: number;
  width: number;
  skyHeight?: number;
  scrollLeft?: number;
}) {
  const scene = useSceneContextOptional();
  const uid = useId().replace(/:/g, '');

  const cloudCover = scene?.weather?.cloudCover ?? 35;
  const category = scene?.weather?.category;
  const timePhase = scene?.timePhase ?? 'day';
  const sceneReady = scene?.status === 'ready';
  const season = (sceneReady ? scene?.season : null) ?? getSeason(month);
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

  const farH = Math.round(skyHeight * 0.46);
  const midH = Math.round(skyHeight * 0.34);
  const treeH = Math.round(skyHeight * 0.2);

  const farRidge = useMemo(() => (width > 0 ? buildFarRidge(width, farH) : null), [width, farH]);
  const midRidge = useMemo(() => (width > 0 ? buildMidRidge(width, midH) : null), [width, midH]);
  const treeline = useMemo(() => (width > 0 ? buildTreeline(width, treeH) : null), [width, treeH]);

  const ridgeColors = getRidgeColors(timePhase, season, category);
  const haze = getHorizonHaze(timePhase, cloudCover, category);

  const showSun =
    sceneReady && isSunPhase(timePhase) && timePhase !== 'dawn' && !stormy;
  const showStormHaze = sceneReady && precipitating && category !== 'drizzle';

  const goldenSun = timePhase === 'golden_hour';
  const sunX = width * 0.78;
  const sunY = goldenSun ? skyHeight * 0.52 : skyHeight * 0.24;
  const sunCore = goldenSun ? '#FFE9A8' : '#FFF8DC';
  const sunGlow = goldenSun ? 'rgba(255, 196, 110, 0.55)' : 'rgba(255, 244, 200, 0.42)';

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ height: skyHeight }}
    >
      {showStormHaze ? <StormSkyHaze width={width} skyHeight={skyHeight} /> : null}

      {showSun ? (
        <div
          className="ambient-sun absolute z-[2]"
          style={{ left: sunX - 70, top: sunY - 70, width: 140, height: 140 }}
          aria-hidden
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${sunGlow} 0%, transparent 65%)`,
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              left: 70 - 22,
              top: 70 - 22,
              width: 44,
              height: 44,
              background: `radial-gradient(circle at 42% 36%, #FFFDF2 0%, ${sunCore} 55%, rgba(255, 224, 150, 0.0) 100%)`,
              boxShadow: `0 0 34px 14px ${sunGlow}`,
            }}
          />
        </div>
      ) : null}

      {/* Distant mountain range — slowest parallax, hazed into the sky */}
      {farRidge ? (
        <div className="absolute inset-x-0 bottom-0 z-[2]" style={{ height: farH }}>
          <SilhouetteBand
            width={width}
            height={farH}
            fillPath={farRidge.fill}
            crestPath={farRidge.crest}
            fillTop={mixHex(ridgeColors.far, '#ffffff', 0.22)}
            fillBottom={ridgeColors.far}
            crestColor={mixHex(ridgeColors.far, '#ffffff', 0.55)}
            opacity={0.9}
            offset={parallaxOffset(scrollLeft, FAR_RIDGE_PARALLAX, width)}
            gradId={`ridge-far-${uid}`}
          />
          {/* Atmospheric haze pushes the far range back */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{
              height: farH * 0.7,
              background: `linear-gradient(180deg, transparent 0%, ${haze}66 70%, ${haze}AA 100%)`,
            }}
          />
        </div>
      ) : null}

      {midRidge ? (
        <div className="absolute inset-x-0 bottom-0 z-[2]" style={{ height: midH }}>
          <SilhouetteBand
            width={width}
            height={midH}
            fillPath={midRidge.fill}
            crestPath={midRidge.crest}
            fillTop={mixHex(ridgeColors.mid, '#ffffff', 0.14)}
            fillBottom={mixHex(ridgeColors.mid, '#1c2430', 0.12)}
            crestColor={mixHex(ridgeColors.mid, '#ffffff', 0.4)}
            opacity={0.94}
            offset={parallaxOffset(scrollLeft, MID_RIDGE_PARALLAX, width)}
            gradId={`ridge-mid-${uid}`}
          />
        </div>
      ) : null}

      {treeline ? (
        <div className="absolute inset-x-0 bottom-0 z-[2]" style={{ height: treeH }}>
          <SilhouetteBand
            width={width}
            height={treeH}
            fillPath={treeline.fill}
            crestPath={treeline.crest}
            fillTop={mixHex(ridgeColors.treeline, '#ffffff', 0.08)}
            fillBottom={mixHex(ridgeColors.treeline, '#141d18', 0.22)}
            crestColor={mixHex(ridgeColors.treeline, '#ffffff', 0.25)}
            opacity={0.96}
            offset={parallaxOffset(scrollLeft, TREELINE_PARALLAX, width)}
            gradId={`treeline-${uid}`}
          />
        </div>
      ) : null}

      {clouds.map((cloud, i) => (
        <DriftingCloud
          key={i}
          {...cloud}
          clusterVariant={clusterVariantFor(category, cloud.variant, thunder)}
        />
      ))}
    </div>
  );
}
