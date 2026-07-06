'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  FOX_HEADING_OFFSET,
  FOX_MODEL_URL,
  FOX_SCALE,
} from '@/lib/garden/explore/constants';
import { gaitFor, type FoxGait, type FoxMotionState } from '@/lib/garden/explore/fox-motion';
import type { PlayerState } from '@/lib/garden/explore/movement';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { Pond } from '@/lib/garden/explore/world-layout';

/**
 * The player's fox — the Khronos glTF Sample Fox (model by PixelMannen, CC0; rigging &
 * animations by @tomkranis, CC BY 4.0 — see public/models/CREDITS.md). Follows the shared
 * player ref each frame and crossfades Survey/Walk/Run by the smoothed gait speed.
 */

const FADE_S = 0.25;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function FoxModel({
  playerRef,
  motionRef,
  ponds,
}: {
  playerRef: RefObject<PlayerState>;
  motionRef: RefObject<FoxMotionState>;
  ponds: readonly Pond[];
}) {
  const gltf = useLoader(GLTFLoader, FOX_MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);
  const prevGait = useRef<FoxGait>('idle');

  // The fox must never swallow flower taps, and its skinned bounds mis-cull at screen edges.
  useEffect(() => {
    gltf.scene.traverse((obj) => {
      obj.raycast = () => {};
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) obj.frustumCulled = false;
    });
  }, [gltf]);

  const { mixer, actions } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const clip = (name: string) => THREE.AnimationClip.findByName(gltf.animations, name);
    const action = (name: string) => {
      const c = clip(name);
      const a = c ? mixer.clipAction(c) : null;
      if (a) {
        a.play();
        a.setEffectiveWeight(0);
      }
      return a;
    };
    const actions: Record<FoxGait, THREE.AnimationAction | null> = {
      idle: action('Survey'),
      walk: action('Walk'),
      run: action('Run'),
    };
    actions.idle?.setEffectiveWeight(1);
    return { mixer, actions };
  }, [gltf]);

  // Guard StrictMode's double mount — without this the second mixer doubles animation speed.
  useEffect(
    () => () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(gltf.scene);
    },
    [mixer, gltf],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const p = playerRef.current;
    const m = motionRef.current;

    group.position.set(p.x, groundHeightAt(p.x, p.z, ponds), p.z);
    group.rotation.y = m.heading + FOX_HEADING_OFFSET;

    const gait = gaitFor(m.speed);
    if (gait !== prevGait.current) {
      actions[prevGait.current]?.fadeOut(FADE_S);
      actions[gait]?.reset().fadeIn(FADE_S);
      prevGait.current = gait;
    }
    const walk = actions.walk;
    if (walk) walk.timeScale = clamp(m.speed / 1.35, 0.7, 1.4);
    const run = actions.run;
    if (run) run.timeScale = clamp(m.speed / 3, 0.8, 1.25);

    mixer.update(delta);
  });

  return (
    <group ref={groupRef} scale={FOX_SCALE}>
      <primitive object={gltf.scene} />
    </group>
  );
}
