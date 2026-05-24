'use client';

import { getAmbientOverlay } from '@bloom/core/scene';
import type { SceneState } from '@bloom/core/scene';

type Props = {
  scene: SceneState;
};

export function AmbientOverlay({ scene }: Props) {
  const ready = scene.status === 'ready';
  const { color, opacity } = getAmbientOverlay(scene.timePhase);
  const effectiveOpacity = ready ? opacity : 0;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 6,
        mixBlendMode: 'multiply',
        backgroundColor: color === 'transparent' ? 'transparent' : color,
        opacity: effectiveOpacity,
        transition: 'background-color 3s ease, opacity 3s ease',
      }}
    />
  );
}
