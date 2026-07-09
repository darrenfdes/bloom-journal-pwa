'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import {
  FOX_HEADING_OFFSET,
  FOX_MODEL_URL,
  FOX_SCALE,
  STROLL_FACTOR,
  WADE_HALF_WIDTH,
  WALK_SPEED,
} from '@/lib/garden/explore/constants';
import { gaitFor, type FoxGait, type FoxMotionState } from '@/lib/garden/explore/fox-motion';
import type { PlayerState } from '@/lib/garden/explore/movement';
import { closestOnStream, type Stream } from '@/lib/garden/explore/stream';
import { surfaceHeightAt } from '@/lib/garden/explore/terrain';

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
  stream,
  reducedMotion = false,
}: {
  playerRef: RefObject<PlayerState>;
  motionRef: RefObject<FoxMotionState>;
  stream: Stream | null;
  reducedMotion?: boolean;
}) {
  const gltf = useLoader(GLTFLoader, FOX_MODEL_URL);
  const groupRef = useRef<THREE.Group>(null);
  const prevGait = useRef<FoxGait>('idle');
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Record<FoxGait, THREE.AnimationAction | null>>({
    idle: null,
    walk: null,
    run: null,
  });

  // The fox must never swallow flower taps, and its skinned bounds mis-cull at screen edges.
  useEffect(() => {
    gltf.scene.traverse((obj) => {
      obj.raycast = () => {};
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) obj.frustumCulled = false;
    });
  }, [gltf]);

  // Mixer setup AND teardown both live in this effect. Keeping `.play()` out of useMemo is
  // deliberate: under React StrictMode's dev mount→unmount→remount, a cleanup that stops the
  // actions would otherwise never be paired with a re-play (useMemo doesn't re-run), leaving
  // the fox frozen in its bind pose.
  useEffect(() => {
    const mixer = new THREE.AnimationMixer(gltf.scene);
    const make = (name: string, weight: number) => {
      const clip = THREE.AnimationClip.findByName(gltf.animations, name);
      if (!clip) return null;
      const a = mixer.clipAction(clip);
      a.reset().play();
      a.setEffectiveWeight(weight);
      return a;
    };
    actionsRef.current = {
      idle: make('Survey', 1),
      walk: make('Walk', 0),
      run: make('Run', 0),
    };
    mixerRef.current = mixer;
    prevGait.current = 'idle';
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(gltf.scene);
      mixerRef.current = null;
    };
  }, [gltf]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    const mixer = mixerRef.current;
    if (!group || !mixer) return;
    const p = playerRef.current;
    const m = motionRef.current;
    const actions = actionsRef.current;

    // Float on the water surface in the deep pool (with a gentle bob), otherwise sit on the ground.
    let y = surfaceHeightAt(p.x, p.z, stream);
    if (stream && !reducedMotion) {
      const w = closestOnStream(p.x, p.z, stream);
      if (w.dist < w.halfWidth && w.halfWidth >= WADE_HALF_WIDTH) {
        y += Math.sin(state.clock.elapsedTime * 2) * 0.02;
      }
    }
    group.position.set(p.x, y, p.z);
    group.rotation.y = m.heading + FOX_HEADING_OFFSET;

    const gait = gaitFor(m.speed);
    if (gait !== prevGait.current) {
      actions[prevGait.current]?.fadeOut(FADE_S);
      // setEffectiveWeight(1) is essential: fadeIn() modulates the action's base weight, so
      // without resetting it to 1 the incoming gait (initialised at weight 0) stays invisible.
      actions[gait]?.reset().setEffectiveWeight(1).fadeIn(FADE_S);
      prevGait.current = gait;
    }
    // Reference speeds the clips were authored around, so the feet track the ground at the new
    // top speed instead of slipping: a full stroll for Walk, a full run for Run.
    const walk = actions.walk;
    if (walk) walk.timeScale = clamp(m.speed / (STROLL_FACTOR * WALK_SPEED), 0.7, 1.4);
    const run = actions.run;
    if (run) run.timeScale = clamp(m.speed / WALK_SPEED, 0.8, 1.25);

    mixer.update(delta);
  });

  return (
    <group ref={groupRef} scale={FOX_SCALE}>
      <primitive object={gltf.scene} />
    </group>
  );
}
