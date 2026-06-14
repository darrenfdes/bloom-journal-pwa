'use client';

import { getSkyBackground } from '@/lib/scene/atmosphere';
import type { SceneState } from '@bloom/core/scene';

type Props = {
  scene: SceneState;
  className?: string;
};

/** Painterly multi-stop sky for the active time phase + weather grade. */
export function SkyTimePhaseLayer({ scene, className }: Props) {
  const ready = scene.status === 'ready';
  const cloudCover = scene.weather?.cloudCover ?? 0;
  const background = getSkyBackground(
    scene.timePhase,
    cloudCover,
    scene.weather?.category
  );

  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background,
        opacity: ready ? 1 : 0,
        transition: 'opacity 1.2s ease',
        pointerEvents: 'none',
      }}
    />
  );
}
