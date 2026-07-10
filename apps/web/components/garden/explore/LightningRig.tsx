'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

import type { WeatherCategory } from '@bloom/core/scene';

import { flashEnvelope, LIGHTNING, nextFlashDelayMs } from '@/lib/garden/explore/lightning';

const FLASH_WHITE = new THREE.Color('#ffffff');

/**
 * Storm lightning: an extra hemisphere light (idle at intensity 0) plus a fog-colour lift,
 * pulsed on the 2D meadow's flash cadence. Clock-based scheduling so a backgrounded tab
 * doesn't queue a burst of flashes. Not mounted under reduced motion — sudden full-field
 * flashes are the canonical vestibular trigger.
 */
export function LightningRig({
  category,
  fogColor,
  fastForDev = false,
}: {
  category: WeatherCategory | undefined;
  fogColor: string;
  /** Dev `?flash=1`: flash every ~1.5 s so the effect can be verified without waiting. */
  fastForDev?: boolean;
}) {
  const lightRef = useRef<THREE.HemisphereLight>(null);
  const scene = useThree((s) => s.scene);
  // nextAt/flashStart in scene-clock seconds; null nextAt = not yet scheduled.
  const nextAtRef = useRef<number | null>(null);
  const flashStartRef = useRef<number | null>(null);

  // Reschedule from scratch when the weather changes.
  useEffect(() => {
    nextAtRef.current = null;
    flashStartRef.current = null;
  }, [category]);

  useFrame(({ clock }) => {
    const light = lightRef.current;
    if (!light) return;
    const t = clock.elapsedTime;

    if (nextAtRef.current === null && flashStartRef.current === null) {
      const delay = fastForDev ? 1500 : nextFlashDelayMs(category, Math.random());
      nextAtRef.current = delay === null ? Infinity : t + delay / 1000;
    }
    if (flashStartRef.current === null && t >= (nextAtRef.current ?? Infinity)) {
      flashStartRef.current = t;
      nextAtRef.current = null;
    }

    let env = 0;
    if (flashStartRef.current !== null) {
      env = flashEnvelope(t - flashStartRef.current);
      if (env === 0 && t - flashStartRef.current > 0.5) flashStartRef.current = null;
    }

    light.intensity = env * LIGHTNING.hemiBoost;
    if (scene.fog) {
      // Pull the fog toward the flash white by the envelope; restore exactly when dark.
      scene.fog.color.set(fogColor);
      if (env > 0) scene.fog.color.lerp(FLASH_WHITE, env * LIGHTNING.fogLift);
    }
  });

  return (
    <hemisphereLight ref={lightRef} args={[LIGHTNING.hemiSky, LIGHTNING.hemiGround, 0]} />
  );
}
