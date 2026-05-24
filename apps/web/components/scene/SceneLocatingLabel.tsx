'use client';

import type { SceneState } from '@bloom/core/scene';

import styles from './SceneFx.module.css';

type Props = {
  scene: SceneState;
};

export function SceneLocatingLabel({ scene }: Props) {
  if (scene.status !== 'fetching') return null;

  return (
    <p
      className={`fixed left-5 z-[8] text-sm italic text-ink-soft ${styles.locatingLabel}`}
      style={{ bottom: 'calc(7rem + var(--safe-bottom))' }}
    >
      Finding your meadow…
    </p>
  );
}
