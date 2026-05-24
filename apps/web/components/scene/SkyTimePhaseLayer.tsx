'use client';

import { getSkyCssBackground } from '@bloom/core/scene';
import type { SceneState } from '@bloom/core/scene';

type Props = {
  scene: SceneState;
  className?: string;
};

export function SkyTimePhaseLayer({ scene, className }: Props) {
  const ready = scene.status === 'ready';
  const cloudCover = scene.weather?.cloudCover ?? 0;
  const background = getSkyCssBackground(scene.timePhase, cloudCover);

  return (
    <div
      className={className}
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background,
        opacity: ready ? 1 : 0,
        transition: 'opacity 1.2s ease, background 2s ease',
        pointerEvents: 'none',
      }}
    />
  );
}
