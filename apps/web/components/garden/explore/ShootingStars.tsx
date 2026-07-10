'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import {
  buildStreak,
  nextStreakDelayMs,
  shootingStarsAllowed,
  streakPoseAt,
  type Streak,
} from '@/lib/garden/explore/shooting-stars';

import { radialTexture } from './textures';

const DOME_RADIUS = 470;
const TAIL_POINTS = 8;

/**
 * A rare single shooting star crossing the night dome: an additive sprite head and a short
 * line tail fading to black (invisible under additive blending). Clock-based scheduling so a
 * backgrounded tab doesn't queue streaks; not mounted under reduced motion. `forceShoot`
 * (dev `?shoot=1`) fires one immediately for manual verification.
 */
export function ShootingStars({
  phase,
  cloudCover,
  category,
  center,
  forceShoot = false,
}: {
  phase: PhaseKey;
  cloudCover: number;
  category: WeatherCategory | undefined;
  center: [number, number, number];
  forceShoot?: boolean;
}) {
  const activeRef = useRef<{ streak: Streak; start: number } | null>(null);
  const nextAtRef = useRef<number | null>(null);
  const forceUsedRef = useRef(false);

  const built = useMemo(() => {
    const headTexture = radialTexture('#ffffffee', '#ffffff00');
    const headMaterial = new THREE.SpriteMaterial({
      map: headTexture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    });
    const head = new THREE.Sprite(headMaterial);
    head.scale.set(6, 6, 1);
    head.visible = false;

    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(TAIL_POINTS * 3), 3),
    );
    tailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(TAIL_POINTS * 3), 3),
    );
    tailGeometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    const tailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      fog: false,
      depthWrite: false,
      toneMapped: false,
    });
    const tail = new THREE.Line(tailGeometry, tailMaterial);
    tail.frustumCulled = false;
    tail.visible = false;

    return { head, headMaterial, headTexture, tail, tailGeometry, tailMaterial };
  }, []);
  useEffect(
    () => () => {
      built.headTexture.dispose();
      built.headMaterial.dispose();
      built.tailGeometry.dispose();
      built.tailMaterial.dispose();
    },
    [built],
  );

  useFrame(({ clock }) => {
    const { head, headMaterial, tail, tailGeometry } = built;
    const t = clock.elapsedTime;
    const allowed = shootingStarsAllowed(phase, cloudCover, category);

    if (nextAtRef.current === null) nextAtRef.current = t + nextStreakDelayMs(Math.random()) / 1000;
    if (forceShoot && !forceUsedRef.current && !activeRef.current) {
      forceUsedRef.current = true;
      nextAtRef.current = t;
    }
    if (!activeRef.current && allowed && t >= nextAtRef.current) {
      activeRef.current = { streak: buildStreak(Math.random), start: t };
    }

    const active = activeRef.current;
    if (!active) {
      head.visible = false;
      tail.visible = false;
      return;
    }
    const t01 = (t - active.start) / active.streak.durSec;
    if (t01 >= 1) {
      activeRef.current = null;
      nextAtRef.current = t + nextStreakDelayMs(Math.random()) / 1000;
      head.visible = false;
      tail.visible = false;
      return;
    }

    const pose = streakPoseAt(active.streak, t01);
    head.visible = true;
    tail.visible = true;
    head.position.set(
      pose.head.x * DOME_RADIUS,
      pose.head.y * DOME_RADIUS,
      pose.head.z * DOME_RADIUS,
    );
    headMaterial.opacity = pose.opacity;

    const pos = tailGeometry.attributes.position as THREE.BufferAttribute;
    const col = tailGeometry.attributes.color as THREE.BufferAttribute;
    for (let i = 0; i < TAIL_POINTS; i++) {
      const f = i / (TAIL_POINTS - 1);
      pos.setXYZ(
        i,
        (pose.head.x + (pose.tail.x - pose.head.x) * f) * DOME_RADIUS,
        (pose.head.y + (pose.tail.y - pose.head.y) * f) * DOME_RADIUS,
        (pose.head.z + (pose.tail.z - pose.head.z) * f) * DOME_RADIUS,
      );
      // Fade to black down the tail — black is invisible under additive blending.
      const v = pose.opacity * (1 - f) * (1 - f);
      col.setXYZ(i, v, v, v);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <group position={center}>
      <primitive object={built.head} />
      <primitive object={built.tail} />
    </group>
  );
}
