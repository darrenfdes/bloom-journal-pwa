'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

const TUFT_COUNT = 800;

/**
 * Two crossed blade pairs — narrow tapered triangles with a dark-base/light-tip vertex
 * gradient. Unlit (basic material) so they read as brushstroke highlights on the ground
 * rather than shaded slabs.
 */
function tuftGeometry() {
  // Each blade: base-left, base-right, tip (tapered triangle).
  const blade = (x0: number, z0: number, x1: number, z1: number, tx: number, tz: number, h: number) => [
    x0, 0, z0, x1, 0, z1, tx, h, tz,
  ];
  const positions = new Float32Array([
    ...blade(-0.05, 0, 0.05, 0, -0.02, 0.01, 0.26),
    ...blade(-0.01, -0.05, -0.01, 0.05, 0.03, -0.02, 0.2),
    ...blade(0.02, 0.02, 0.09, -0.03, 0.08, 0.02, 0.17),
  ]);
  const d = 0.62;
  const colors = new Float32Array([
    d, d, d, d, d, d, 1.25, 1.25, 1.25,
    d, d, d, d, d, d, 1.2, 1.2, 1.2,
    d, d, d, d, d, d, 1.15, 1.15, 1.15,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

/**
 * One InstancedMesh of deterministic grass tufts scattered across the walkable meadow
 * (skipping pond water). Static — matrices are set once per world.
 */
export function GrassField({ world, color }: { world: ExploreWorld; color: string }) {
  const geometry = useMemo(() => tuftGeometry(), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const mesh = useMemo(() => {
    const material = new THREE.MeshBasicMaterial({
      color,
      vertexColors: true,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const instanced = new THREE.InstancedMesh(geometry, material, TUFT_COUNT);
    const rng = mulberry32(913_007);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    let placed = 0;
    let guard = 0;
    while (placed < TUFT_COUNT && guard++ < TUFT_COUNT * 4) {
      const x = world.bounds.minX + rng() * (world.bounds.maxX - world.bounds.minX);
      const z = world.bounds.minZ + rng() * (world.bounds.maxZ - world.bounds.minZ);
      if (world.ponds.some((p) => Math.hypot(x - p.x, z - p.z) < p.radius + 1)) continue;
      const s = 0.7 + rng() * 0.8;
      q.setFromAxisAngle(up, rng() * Math.PI);
      m.compose(
        new THREE.Vector3(x, groundHeightAt(x, z, world.ponds), z),
        q,
        new THREE.Vector3(s, s, s),
      );
      instanced.setMatrixAt(placed, m);
      placed++;
    }
    instanced.count = placed;
    instanced.instanceMatrix.needsUpdate = true;
    return instanced;
  }, [world, color, geometry]);

  useEffect(
    () => () => {
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );

  return <primitive object={mesh} />;
}
