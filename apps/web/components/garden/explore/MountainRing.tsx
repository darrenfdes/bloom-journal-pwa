'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Low-poly mountain silhouettes ringing the horizon — two ridge bands at different radii
 * for parallax, colored from the phase's hill palette and hazed naturally by scene fog.
 * One draw call each.
 */

/** Triangle wave in [0,1] — sharp peaks instead of smooth sine crests. */
const tri = (v: number) => Math.abs(((v / Math.PI) % 2) - 1);

function ridgeGeometry(radius: number, seed: number, base: number, amp: number) {
  const SEG = 220;
  const positions = new Float32Array((SEG + 1) * 2 * 3);
  const indices: number[] = [];
  for (let i = 0; i <= SEG; i++) {
    const theta = (i / SEG) * Math.PI * 2;
    const h =
      base +
      amp *
        (0.55 * tri(9 * theta + seed) +
          0.3 * tri(23 * theta + seed * 2.1) +
          0.25 * Math.sin(3 * theta + seed * 3.7));
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    positions.set([x, -4, z], i * 6);
    positions.set([x, h, z], i * 6 + 3);
    if (i < SEG) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setIndex(indices);
  return geo;
}

export function MountainRing({
  colors,
  center,
}: {
  /** [far, near] ridge colors — pass PHASES[phase].hills[2] / [1]. */
  colors: [string, string];
  center: [number, number, number];
}) {
  const far = useMemo(() => ridgeGeometry(210, 1.7, 20, 26), []);
  const near = useMemo(() => ridgeGeometry(160, 4.3, 10, 16), []);
  useEffect(
    () => () => {
      far.dispose();
      near.dispose();
    },
    [far, near],
  );

  return (
    <group position={center}>
      <mesh geometry={far}>
        <meshBasicMaterial color={colors[0]} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh geometry={near}>
        <meshBasicMaterial color={colors[1]} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
    </group>
  );
}
