'use client';

import { useMemo } from 'react';

import { getStarField, isMoonPhase, isNightPhase, isSunPhase } from '@bloom/core/scene';
import type { SceneState, TimePhase } from '@bloom/core/scene';

import styles from './SceneFx.module.css';

type Props = {
  scene: SceneState;
  width: number;
  skyHeight: number;
};

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

  if (!ready) return null;

  const showSun = isSunPhase(timePhase);
  const showMoon = isMoonPhase(timePhase);
  const showStars = isNightPhase(timePhase);
  const sun = sunPosition(timePhase, width, skyHeight);

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

      {showMoon ? (
        <div
          style={{
            position: 'absolute',
            right: width * 0.12,
            top: skyHeight * 0.12,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 35% 32%, #f4f6ff 0%, #dde2f0 55%, #b8bfd4 100%)',
            boxShadow:
              'inset -6px -4px 12px rgba(90,98,130,0.2), 0 0 32px rgba(220,225,245,0.5)',
          }}
        />
      ) : null}

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
    </div>
  );
}
