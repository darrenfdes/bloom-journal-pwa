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
  treelineRing,
  worldExclusions,
  type ScatterItem,
} from '@/lib/garden/explore/scatter';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/**
 * Low-poly trees framing the meadow — layered conifers (stacked cones), clustered broadleaf blobs
 * and slender birches — plus soft edge bushes and a hazed background treeline for depth. Each
 * silhouette is built from several instanced meshes sharing one matrix per tree, so a tree stays a
 * handful of draw calls total. `meshLambertMaterial` picks up the phase-driven scene lights.
 */
export function TreeField({ world, phase }: { world: ExploreWorld; phase: PhaseKey }) {
  const palette = useMemo(() => treePaletteFor(phase), [phase]);

  const built = useMemo(() => {
    const exclusions = worldExclusions(world);
    const trees: ScatterItem[] = treeBands(world).flatMap((band, i) =>
      scatterInBand({
        seed: 741_002 + i * 17,
        count: 22,
        band,
        minScale: 1.2,
        maxScale: 2.7,
        variants: 3,
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
    const treeline = treelineRing(world);

    const geometries: THREE.BufferGeometry[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };

    // Trunks + canopy layers, pre-translated so each tree's base sits at y=0.
    const trunkGeo = geo(new THREE.CylinderGeometry(0.11, 0.16, 1.1, 6).translate(0, 0.55, 0));
    const birchTrunkGeo = geo(new THREE.CylinderGeometry(0.06, 0.09, 1.7, 6).translate(0, 0.85, 0));
    const coneLowGeo = geo(new THREE.ConeGeometry(0.95, 1.9, 6).translate(0, 1.75, 0));
    const coneHighGeo = geo(new THREE.ConeGeometry(0.62, 1.4, 6).translate(0, 2.75, 0));
    const blobAGeo = geo(new THREE.IcosahedronGeometry(0.95, 0).scale(1, 0.9, 1).translate(0, 1.95, 0));
    const blobBGeo = geo(new THREE.IcosahedronGeometry(0.7, 0).scale(1, 0.9, 1).translate(0.55, 2.35, 0.2));
    const blobCGeo = geo(new THREE.IcosahedronGeometry(0.62, 0).scale(1, 0.9, 1).translate(-0.5, 2.2, -0.2));
    const birchBlobAGeo = geo(new THREE.IcosahedronGeometry(0.55, 0).scale(1, 1.05, 1).translate(0, 2.15, 0));
    const birchBlobBGeo = geo(new THREE.IcosahedronGeometry(0.42, 0).scale(1, 1.05, 1).translate(0.28, 2.5, 0.1));
    const bushGeo = geo(new THREE.IcosahedronGeometry(1, 0).scale(1.1, 0.7, 1.1));
    const tlTrunkGeo = geo(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 5).translate(0, 0.6, 0));
    const tlConeGeo = geo(new THREE.ConeGeometry(0.9, 3.0, 5).translate(0, 2.3, 0));

    const materials: THREE.Material[] = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const jitter = new THREE.Color();

    // One matrix per instance, reused across every layer of that instance's silhouette.
    const matricesFor = (list: ScatterItem[]): THREE.Matrix4[] =>
      list.map((it) => {
        q.setFromAxisAngle(up, it.rotation);
        return new THREE.Matrix4().compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.ponds), it.z),
          q,
          new THREE.Vector3(it.scale, it.scale, it.scale),
        );
      });

    const layer = (
      mats: THREE.Matrix4[],
      g: THREE.BufferGeometry,
      color: string,
      seed: number,
    ): THREE.InstancedMesh => {
      const mat = new THREE.MeshLambertMaterial({ color });
      materials.push(mat);
      const mesh = new THREE.InstancedMesh(g, mat, mats.length);
      const rng = mulberry32(seed);
      mats.forEach((mm, i) => {
        mesh.setMatrixAt(i, mm);
        mesh.setColorAt(i, jitter.set(color).multiplyScalar(0.9 + rng() * 0.2));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return mesh;
    };

    const cMats = matricesFor(trees.filter((t) => t.variant === 0));
    const bMats = matricesFor(trees.filter((t) => t.variant === 1));
    const kMats = matricesFor(trees.filter((t) => t.variant === 2));
    const bushMats = matricesFor(bushes);
    const tlMats = matricesFor(treeline);

    const meshes = [
      layer(cMats, trunkGeo, palette.trunk, 741_101),
      layer(cMats, coneLowGeo, palette.canopy, 741_102),
      layer(cMats, coneHighGeo, palette.canopy, 741_103),
      layer(bMats, trunkGeo, palette.trunk, 741_104),
      layer(bMats, blobAGeo, palette.canopyAlt, 741_105),
      layer(bMats, blobBGeo, palette.canopyAlt, 741_106),
      layer(bMats, blobCGeo, palette.canopyAlt, 741_107),
      layer(kMats, birchTrunkGeo, palette.trunk, 741_108),
      layer(kMats, birchBlobAGeo, palette.canopy, 741_109),
      layer(kMats, birchBlobBGeo, palette.canopy, 741_110),
      layer(bushMats, bushGeo, palette.canopyAlt, 741_111),
      layer(tlMats, tlTrunkGeo, palette.trunk, 741_112),
      layer(tlMats, tlConeGeo, palette.canopy, 741_113),
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
