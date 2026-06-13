'use client';

import React from 'react';

import { getSkyBackground } from '@/lib/scene/atmosphere';
import { isMoonPhase, isSunPhase } from '@bloom/core/scene';
import type { SceneState, TimePhase } from '@bloom/core/scene';

/** Celestial body screen position per phase, as fractions of the viewport. */
const SUN_POS: Partial<Record<TimePhase, [number, number]>> = {
  dawn: [0.16, 0.52],
  day: [0.5, 0.16],
  golden_hour: [0.78, 0.46],
};

const MOON_POS: Partial<Record<TimePhase, [number, number]>> = {
  pre_dawn: [0.8, 0.26],
  night: [0.82, 0.2],
  deep_night: [0.78, 0.16],
};

type Props = {
  scene: SceneState;
};

export function MeadowSky({ scene }: Props) {
  const { timePhase, weather } = scene;
  const cloudCover = weather?.cloudCover ?? 0;
  const background = getSkyBackground(timePhase, cloudCover, weather?.category);

  const showSun = isSunPhase(timePhase) && Boolean(SUN_POS[timePhase]);
  const showMoon = isMoonPhase(timePhase) && Boolean(MOON_POS[timePhase]);
  const sun = SUN_POS[timePhase];
  const moon = MOON_POS[timePhase];

  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
      <div className="absolute inset-0" style={{ background }} />

      {showSun && sun ? (
        <div
          className="absolute h-[74px] w-[74px] rounded-full"
          style={{
            left: `${sun[0] * 100}%`,
            top: `${sun[1] * 100}%`,
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle at 38% 35%, #fff6d8, #ffd98a 55%, rgba(255,200,110,0) 78%)',
            boxShadow: '0 0 70px 28px rgba(255,214,130,0.5)',
          }}
        />
      ) : null}

      {showMoon && moon ? (
        <div
          className="absolute h-[52px] w-[52px] overflow-hidden rounded-full"
          style={{
            left: `${moon[0] * 100}%`,
            top: `${moon[1] * 100}%`,
            transform: 'translate(-50%, -50%)',
            background:
              'radial-gradient(circle at 40% 38%, #fbf7ea, #e6e0cc)',
            boxShadow: '0 0 46px 14px rgba(235,230,200,0.28)',
          }}
        >
          <span
            className="absolute rounded-full"
            style={{ width: 9, height: 9, left: 14, top: 24, background: 'rgba(150,140,112,0.32)' }}
          />
          <span
            className="absolute rounded-full"
            style={{ width: 6, height: 6, left: 30, top: 13, background: 'rgba(150,140,112,0.32)' }}
          />
        </div>
      ) : null}
    </div>
  );
}
