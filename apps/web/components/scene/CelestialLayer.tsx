'use client';

import { useMemo } from 'react';

import {
  getMoonPhaseShadowSvgPath,
  getMoonRotationDeg,
  getNightCloudField,
  getStarField,
  isMoonPhase,
  isNightPhase,
  NIGHT_CLOUD_COLORS,
  shouldShowMoonDisc,
} from '@bloom/core/scene';
import type { SceneState, TimePhase } from '@bloom/core/scene';

import styles from './SceneFx.module.css';

type Props = {
  scene: SceneState;
  width: number;
  skyHeight: number;
};

const MOON_SIZE = 52;

function sunPosition(phase: TimePhase, width: number, skyHeight: number) {
  switch (phase) {
    case 'dawn':
      return { left: width * 0.12, top: skyHeight * 0.55, size: 80 };
    case 'golden_hour':
      return { left: width * 0.78, top: skyHeight * 0.5, size: 80 };
    case 'day':
    default:
      return { left: width * 0.5 - 30, top: skyHeight * 0.18, size: 60 };
  }
}

export function CelestialLayer({ scene, width, skyHeight }: Props) {
  const ready = scene.status === 'ready';
  const { timePhase } = scene;

  const stars = useMemo(() => getStarField(65), []);
  const nightClouds = useMemo(() => getNightCloudField(10), []);

  if (!ready) return null;

  const showSun = timePhase === 'dawn';
  const showMoonDisc = shouldShowMoonDisc({
    timePhase,
    weatherCategory: scene.weather?.category,
    moon: scene.moon,
  });
  const showStars = isNightPhase(timePhase);
  const showNightClouds = isMoonPhase(timePhase) || isNightPhase(timePhase);
  const sun = sunPosition(timePhase, width, skyHeight);

  const moonRight = width * 0.12;
  const moonTop = skyHeight * 0.12;
  const moonR = MOON_SIZE / 2;
  const latitude = scene.weather?.coords.lat ?? 0;
  const hour = new Date().getHours();
  const moonRotation = getMoonRotationDeg(latitude, hour);
  const moonShadowPath = getMoonPhaseShadowSvgPath(moonR, scene.moon, latitude, hour);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden
      style={{ height: skyHeight }}
    >
      {showSun ? (
        <div
          style={{
            position: 'absolute',
            left: sun.left,
            top: sun.top,
            width: sun.size,
            height: sun.size,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, #fff176 0%, rgba(255,235,59,0.35) 45%, rgba(255,235,59,0) 70%)',
          }}
        />
      ) : null}

      {showNightClouds
        ? nightClouds.map((wisp) => (
            <div
              key={wisp.id}
              style={{
                position: 'absolute',
                left: `${wisp.left}%`,
                top: `${wisp.top}%`,
                width: wisp.width,
                height: wisp.height,
                borderRadius: 9999,
                backgroundColor:
                  wisp.color === 'accent'
                    ? NIGHT_CLOUD_COLORS.accent
                    : NIGHT_CLOUD_COLORS.primary,
                opacity: wisp.opacity,
              }}
            />
          ))
        : null}

      {showStars
        ? stars.map((star) => {
            const warmth = star.warmth > 0.55 ? '#fff8e8' : '#eef2ff';
            const starClass =
              star.kind === 'sparkle'
                ? styles.starSparkle
                : star.kind === 'bright'
                  ? styles.starBright
                  : styles.star;

            return (
              <span
                key={star.id}
                className={starClass}
                style={{
                  left: `${star.left}%`,
                  top: `${star.top}%`,
                  width: star.size,
                  height: star.size,
                  background: warmth,
                  animationDelay: `${star.delay}s`,
                  animationDuration: `${star.duration}s`,
                }}
              />
            );
          })
        : null}

      {showMoonDisc ? (
        <svg
          width={MOON_SIZE}
          height={MOON_SIZE}
          style={{
            position: 'absolute',
            right: moonRight,
            top: moonTop,
            transform: `rotate(${moonRotation}deg)`,
            transformOrigin: 'center center',
          }}
          aria-hidden
        >
          <defs>
            <radialGradient id="celestialMoonGrad" cx="35%" cy="32%" r="65%">
              <stop offset="0%" stopColor="#f4f6ff" />
              <stop offset="55%" stopColor="#dde2f0" />
              <stop offset="100%" stopColor="#b8bfd4" />
            </radialGradient>
            <clipPath id="celestialMoonClip">
              <circle cx={moonR} cy={moonR} r={moonR} />
            </clipPath>
          </defs>
          <circle cx={moonR} cy={moonR} r={moonR} fill="url(#celestialMoonGrad)" />
          {moonShadowPath ? (
            <path d={moonShadowPath} fill="#070d1c" clipPath="url(#celestialMoonClip)" />
          ) : null}
        </svg>
      ) : null}
    </div>
  );
}
