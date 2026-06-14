'use client';

import { getSceneLight } from '@/lib/scene/atmosphere';
import type { SceneState } from '@bloom/core/scene';

type Props = {
  scene: SceneState;
};

/**
 * Scene-wide lighting grade — phase-keyed vignette, directional glow, and
 * sky-side wash layered as gradients (replaces the old flat color tint).
 */
export function AmbientOverlay({ scene }: Props) {
  const ready = scene.status === 'ready';
  const { background, opacity } = getSceneLight(scene.timePhase);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0"
      style={{
        zIndex: 6,
        mixBlendMode: 'multiply',
        background,
        opacity: ready ? opacity : 0,
        transition: 'opacity 3s ease',
      }}
    />
  );
}
