'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import {
  scatterInBand,
  scatterInRing,
  worldExclusions,
  type ScatterItem,
} from '@/lib/garden/explore/scatter';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/**
 * Low-poly stones scattered across the meadow and clustered at pond rims. Two faceted
 * geometries, non-uniform per-instance scale, sunk slightly into the ground; lambert so they
 * shade with the phase lights.
 */
export function RockField({ world }: { world: ExploreWorld }) {
  const meshes = useMemo(() => {
    const exclusions = worldExclusions(world, { flowerRadius: 0.8, pondBuffer: 0.6, spawnRadius: 2.5 });
    const b = world.bounds;
    const field: ScatterItem[] = scatterInBand({
      seed: 322_019,
      count: 40,
      band: { xMin: b.minX, xMax: b.maxX, zMin: b.minZ, zMax: b.maxZ },
      minScale: 0.12,
      maxScale: 0.5,
      variants: 2,
      exclusions,
    });
    const rims: ScatterItem[] = world.ponds.flatMap((p, i) =>
      scatterInRing({
        seed: 322_500 + i * 131,
        count: 8,
        cx: p.x,
        cz: p.z,
        rMin: p.radius + 0.8,
        rMax: p.radius + 2.2,
        minScale: 0.16,
        maxScale: 0.42,
        variants: 2,
      }),
    );
    const all = [...field, ...rims];

    const geos = [new THREE.IcosahedronGeometry(1, 0), new THREE.DodecahedronGeometry(1, 0)];
    const colors = ['#8a8277', '#77706a'];
    const rng = mulberry32(322_777);
    const m = new THREE.Matrix4();
    const e = new THREE.Euler();
    const q = new THREE.Quaternion();
    const jitter = new THREE.Color();

    return geos.map((geo, variant) => {
      const list = all.filter((_, idx) => idx % 2 === variant);
      const mat = new THREE.MeshLambertMaterial({ color: colors[variant] });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((it, i) => {
        e.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
        q.setFromEuler(e);
        const sx = it.scale * (0.8 + rng() * 0.5);
        const sy = it.scale * 0.7;
        const sz = it.scale * (0.8 + rng() * 0.5);
        m.compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.ponds) - it.scale * 0.2, it.z),
          q,
          new THREE.Vector3(sx, sy, sz),
        );
        mesh.setMatrixAt(i, m);
        const v = 0.9 + rng() * 0.2;
        mesh.setColorAt(i, jitter.set(colors[variant]!).multiplyScalar(v));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return mesh;
    });
  }, [world]);

  useEffect(
    () => () => {
      meshes.forEach((mesh) => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        mesh.dispose();
      });
    },
    [meshes],
  );

  return (
    <>
      {meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
}
