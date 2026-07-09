'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { fishAt, fishSchool } from '@/lib/garden/explore/fish';
import type { Stream } from '@/lib/garden/explore/stream';

const FISH_COUNT = 8;
const BODY = '#3b4a3c';

/** A flat little fish pointing +Z: a diamond body with a vertical tail fin. Read from above. */
function fishGeometry(): THREE.BufferGeometry {
  const v = {
    nose: [0, 0, 0.5],
    left: [-0.17, 0, 0.05],
    right: [0.17, 0, 0.05],
    tail: [0, 0, -0.28],
    finTop: [0, 0.13, -0.46],
    finBot: [0, -0.13, -0.46],
  } as const;
  const positions = new Float32Array([
    ...v.nose, ...v.tail, ...v.left, // body left
    ...v.nose, ...v.right, ...v.tail, // body right
    ...v.tail, ...v.finTop, ...v.finBot, // tail fin
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * A small school of fish patrolling the pool, driven by the pure `fishAt`. One instanced mesh,
 * matrices refreshed each frame; a subtle tail-yaw wiggle sells the swim. Frozen but present under
 * reduced motion.
 */
export function FishField({ stream, reducedMotion }: { stream: Stream; reducedMotion: boolean }) {
  const school = useMemo(() => fishSchool(stream, 404_017, FISH_COUNT), [stream]);
  const geometry = useMemo(() => fishGeometry(), []);
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    school.forEach((fish, i) => {
      const p = fishAt(fish, stream, t, reducedMotion);
      const wiggle = reducedMotion ? 0 : Math.sin(t * 7 + fish.phase) * 0.3;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.heading + wiggle, 0);
      const s = fish.size * 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, school.length]}>
      <meshLambertMaterial color={BODY} side={THREE.DoubleSide} />
    </instancedMesh>
  );
}
