'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import type { PhaseKey } from '@/lib/garden/bloom/phases';
import { treePaletteFor } from '@/lib/garden/explore/sky-detail';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import {
  bushBands,
  scatterInBand,
  treeBands,
  worldExclusions,
  type ScatterItem,
} from '@/lib/garden/explore/scatter';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/**
 * Low-poly conifers and broadleaf trees framing the meadow, plus soft bushes along its edges.
 * Procedural instanced geometry (not billboards) so they hold their silhouette as the
 * third-person camera orbits; `meshLambertMaterial` picks up the phase-driven scene lights.
 */
export function TreeField({ world, phase }: { world: ExploreWorld; phase: PhaseKey }) {
  const palette = useMemo(() => treePaletteFor(phase), [phase]);

  const built = useMemo(() => {
    const exclusions = worldExclusions(world);
    const trees: ScatterItem[] = treeBands(world).flatMap((band, i) =>
      scatterInBand({
        seed: 741_002 + i * 17,
        count: 18,
        band,
        minScale: 1.3,
        maxScale: 2.4,
        variants: 2,
        exclusions,
      }),
    );
    const bushes: ScatterItem[] = bushBands(world).flatMap((band, i) =>
      scatterInBand({
        seed: 741_003 + i * 17,
        count: 14,
        band,
        minScale: 0.35,
        maxScale: 0.6,
        variants: 1,
        exclusions,
      }),
    );

    const trunkGeo = new THREE.CylinderGeometry(0.11, 0.16, 1.1, 6).translate(0, 0.55, 0);
    const coneGeo = new THREE.ConeGeometry(0.9, 2.3, 6).translate(0, 2.0, 0);
    const blobGeo = new THREE.IcosahedronGeometry(1, 0).scale(1, 0.85, 1).translate(0, 1.9, 0);
    const bushGeo = new THREE.IcosahedronGeometry(1, 0).scale(1.1, 0.7, 1.1);
    const geometries = [trunkGeo, coneGeo, blobGeo, bushGeo];
    const materials: THREE.Material[] = [];

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const jitter = new THREE.Color();

    const build = (list: ScatterItem[], geo: THREE.BufferGeometry, color: string, seed: number) => {
      const mat = new THREE.MeshLambertMaterial({ color });
      materials.push(mat);
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const rng = mulberry32(seed);
      list.forEach((it, i) => {
        q.setFromAxisAngle(up, it.rotation);
        m.compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.ponds), it.z),
          q,
          new THREE.Vector3(it.scale, it.scale, it.scale),
        );
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, jitter.set(color).multiplyScalar(0.92 + rng() * 0.16));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return mesh;
    };

    const conifers = trees.filter((t) => t.variant === 0);
    const broadleaf = trees.filter((t) => t.variant === 1);
    const meshes = [
      build(conifers, trunkGeo, palette.trunk, 741_101),
      build(conifers, coneGeo, palette.canopy, 741_102),
      build(broadleaf, trunkGeo, palette.trunk, 741_103),
      build(broadleaf, blobGeo, palette.canopyAlt, 741_104),
      build(bushes, bushGeo, palette.canopyAlt, 741_105),
    ];
    return { meshes, geometries, materials };
  }, [world, palette]);

  useEffect(
    () => () => {
      built.geometries.forEach((g) => g.dispose());
      built.materials.forEach((mat) => mat.dispose());
      built.meshes.forEach((mesh) => mesh.dispose());
    },
    [built],
  );

  return (
    <>
      {built.meshes.map((mesh, i) => (
        <primitive key={i} object={mesh} />
      ))}
    </>
  );
}
