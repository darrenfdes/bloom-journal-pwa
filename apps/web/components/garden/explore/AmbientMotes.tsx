'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import type { WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import {
  buildMotes,
  FIREFLY_BOX,
  FIREFLY_COUNT,
  fireflyIntensity,
  moteAt,
  moteOpacityFor,
  POLLEN_BOX,
  POLLEN_COUNT,
  type Mote,
  type MoteBox,
} from '@/lib/garden/explore/motes';

/** Ease constant for the ~1.6 s opacity glide matching the 2D layer fades. */
const FADE_RATE = 2;

/**
 * Fireflies (dusk/night, additive blink) and pollen sparkles (day/golden) — two camera-tiled
 * `Points` clouds. Mote positions are world-anchored and wrap modulo the box, so the swarm
 * doesn't glide along with a running fox. Frozen (but visible) under reduced motion.
 */
export function AmbientMotes({
  phase,
  category,
  reducedMotion,
}: {
  phase: PhaseKey;
  category: WeatherCategory | undefined;
  reducedMotion: boolean;
}) {
  return (
    <>
      <MoteCloud kind="fire" phase={phase} category={category} reducedMotion={reducedMotion} />
      <MoteCloud kind="pollen" phase={phase} category={category} reducedMotion={reducedMotion} />
    </>
  );
}

const mod = (v: number, n: number) => ((v % n) + n) % n;

function MoteCloud({
  kind,
  phase,
  category,
  reducedMotion,
}: {
  kind: 'fire' | 'pollen';
  phase: PhaseKey;
  category: WeatherCategory | undefined;
  reducedMotion: boolean;
}) {
  const fire = kind === 'fire';
  const box: MoteBox = fire ? FIREFLY_BOX : POLLEN_BOX;
  const pointsRef = useRef<THREE.Points>(null);
  const targetOpacity = moteOpacityFor(kind, phase, category);

  const motes: Mote[] = useMemo(
    () => buildMotes(fire ? 660_101 : 660_202, fire ? FIREFLY_COUNT : POLLEN_COUNT, box),
    [fire, box],
  );

  const geometry = useMemo(() => {
    const positions = new Float32Array(motes.length * 3);
    motes.forEach((m, i) => {
      const p = moteAt(m, 0);
      positions.set([p.x, p.y, p.z], i * 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    if (fire) {
      // Blink rides on per-point colour (multiplies the additive material colour).
      const colors = new Float32Array(motes.length * 3).fill(0.5);
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    }
    // The cloud hugs the camera; culling by its moving bounds is never useful.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    return geo;
  }, [motes, fire]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ camera, clock }, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    const mat = points.material as THREE.PointsMaterial;
    mat.opacity += (targetOpacity - mat.opacity) * Math.min(1, delta * FADE_RATE);
    points.visible = mat.opacity > 0.004;

    const ox = camera.position.x - box.w / 2;
    const oz = camera.position.z - box.d / 2;
    points.position.set(ox, 0, oz);
    if (!points.visible) return;

    const t = reducedMotion ? 0 : clock.elapsedTime;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const col = fire ? (geometry.attributes.color as THREE.BufferAttribute) : null;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i]!;
      const p = moteAt(m, t);
      pos.setXYZ(i, mod(p.x - ox, box.w), p.y, mod(p.z - oz, box.d));
      if (col && !reducedMotion) {
        const v = 0.08 + 0.92 * fireflyIntensity(m, t);
        col.setXYZ(i, v, v, v);
      }
    }
    pos.needsUpdate = true;
    if (col && !reducedMotion) col.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} visible={false}>
      <pointsMaterial
        size={fire ? 4 : 2.4}
        sizeAttenuation={false}
        color={fire ? '#ffe98a' : '#fffae1'}
        vertexColors={fire}
        blending={fire ? THREE.AdditiveBlending : THREE.NormalBlending}
        transparent
        opacity={0}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
