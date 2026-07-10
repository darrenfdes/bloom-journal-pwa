'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import type { PhaseKey } from '@/lib/garden/bloom/phases';
import { treePaletteFor } from '@/lib/garden/explore/sky-detail';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import {
  blossomTrees,
  bushBands,
  scatterInBand,
  treeBands,
  treelineRing,
  worldExclusions,
  type ScatterItem,
} from '@/lib/garden/explore/scatter';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

import { applyWindSway, type WindUniforms } from './wind-material';

/**
 * Trees framing the meadow — three-tier conifer firs, rounded lush broadleafs, slender pale-bark
 * birches, a few flowering blossom accents, soft edge bushes and a hazed background treeline for
 * depth. Each silhouette is built from several instanced meshes sharing one matrix per tree, and
 * every canopy layer is shaded dark → mid → light to fake volume without extra lights. `meshLambert`
 * picks up the phase-driven scene lights; rounded canopies (icosahedron detail 1) read as foliage
 * rather than faceted crystals at the mid-distance the fox always views them from. Canopy layers
 * sway in the wind; trunks, roots, branches and the fogged distant treeline stay rigid.
 */
export function TreeField({
  world,
  phase,
  wind,
}: {
  world: ExploreWorld;
  phase: PhaseKey;
  wind: WindUniforms | null;
}) {
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
    const blossoms = blossomTrees(world);

    const geometries: THREE.BufferGeometry[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };

    // Trunks + canopy layers, pre-translated so each tree's base sits at y=0. Foliage blobs use
    // icosahedron detail 1 (rounded) so canopies read as leaves, not crystals.
    const blob = (r: number, x: number, y: number, z: number, squash = 0.9) =>
      geo(new THREE.IcosahedronGeometry(r, 1).scale(1, squash, 1).translate(x, y, z));

    const trunkGeo = geo(new THREE.CylinderGeometry(0.12, 0.18, 1.15, 6).translate(0, 0.58, 0));
    const birchTrunkGeo = geo(new THREE.CylinderGeometry(0.06, 0.09, 1.7, 6).translate(0, 0.85, 0));
    // Conifer: a wide skirt cone under the existing mid + top cones → a full three-tier fir.
    const coneBaseGeo = geo(new THREE.ConeGeometry(1.25, 1.8, 7).translate(0, 1.15, 0));
    const coneMidGeo = geo(new THREE.ConeGeometry(0.92, 1.7, 7).translate(0, 2.05, 0));
    const coneTopGeo = geo(new THREE.ConeGeometry(0.58, 1.35, 7).translate(0, 2.95, 0));
    // Broadleaf: three base/mid blobs + a lifted crown blob for a lush rounded canopy.
    const blobAGeo = blob(0.98, 0, 1.95, 0);
    const blobBGeo = blob(0.72, 0.55, 2.35, 0.2);
    const blobCGeo = blob(0.64, -0.5, 2.2, -0.2);
    const blobCrownGeo = blob(0.6, 0.05, 2.8, 0);
    // Birch: three small airy blobs on a slender pale trunk.
    const birchBlobAGeo = blob(0.56, 0, 2.15, 0, 1.05);
    const birchBlobBGeo = blob(0.44, 0.28, 2.5, 0.1, 1.05);
    const birchBlobCGeo = blob(0.36, -0.24, 2.35, -0.08, 1.05);
    // Bush: a rounded lobe plus a smaller offset lobe so it isn't a lone sphere.
    const bushGeo = geo(new THREE.IcosahedronGeometry(1, 1).scale(1.1, 0.7, 1.1));
    const bushLobeGeo = geo(new THREE.IcosahedronGeometry(0.62, 1).scale(1.1, 0.7, 1.1).translate(0.55, 0.08, 0.15));
    // Blossom accent: broadleaf silhouette, tinted pink, on an ordinary brown trunk.
    const bloomAGeo = blob(0.9, 0, 1.9, 0);
    const bloomBGeo = blob(0.68, 0.5, 2.3, 0.2);
    const bloomCGeo = blob(0.6, -0.45, 2.15, -0.2);
    const bloomCrownGeo = blob(0.55, 0.05, 2.7, 0);
    // Distant treeline (kept low-poly — fogged): trunk + a single tall cone.
    const tlTrunkGeo = geo(new THREE.CylinderGeometry(0.12, 0.2, 1.2, 5).translate(0, 0.6, 0));
    const tlConeGeo = geo(new THREE.ConeGeometry(0.9, 3.0, 5).translate(0, 2.3, 0));

    // Extra near-tree detail (the fox only ever sees these at mid-distance):
    // a flared root base shared by the broadleaf/conifer/blossom trunks.
    const rootGeo = geo(new THREE.ConeGeometry(0.34, 0.42, 8).translate(0, 0.17, 0));
    // Conifer: a wide low skirt beneath the base cone → a fuller four-tier fir.
    const coneSkirtGeo = geo(new THREE.ConeGeometry(1.55, 1.3, 8).translate(0, 0.72, 0));
    // Broadleaf + blossom: a low shadowed skirt blob filling out the underside of the canopy.
    const blobSkirtGeo = blob(0.86, -0.05, 1.5, 0.1);
    const bloomSkirtGeo = blob(0.8, -0.05, 1.5, 0.1);
    // Birch: a fourth high blob and a pale angled branch stub.
    const birchBlobDGeo = blob(0.3, 0.12, 2.78, -0.1, 1.05);
    const birchBranchGeo = geo(
      new THREE.CylinderGeometry(0.02, 0.035, 0.85, 4).rotateZ(0.9).translate(0.24, 1.55, 0),
    );

    const materials: THREE.Material[] = [];
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const jitter = new THREE.Color();

    // One matrix per instance, reused across every layer of that instance's silhouette.
    const matricesFor = (list: ScatterItem[]): THREE.Matrix4[] =>
      list.map((it) => {
        q.setFromAxisAngle(up, it.rotation);
        return new THREE.Matrix4().compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.stream), it.z),
          q,
          new THREE.Vector3(it.scale, it.scale, it.scale),
        );
      });

    const layer = (
      mats: THREE.Matrix4[],
      g: THREE.BufferGeometry,
      color: string,
      seed: number,
      sway = false,
    ): THREE.InstancedMesh => {
      const mat = new THREE.MeshLambertMaterial({ color });
      if (sway && wind) applyWindSway(mat, 'canopy', wind);
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
    const bloomMats = matricesFor(blossoms);

    const meshes = [
      // Conifer firs — root flare, wide skirt, dark base → mid → lit top.
      layer(cMats, rootGeo, palette.trunk, 741_130),
      layer(cMats, trunkGeo, palette.trunk, 741_101),
      layer(cMats, coneSkirtGeo, palette.canopyDark, 741_131, true),
      layer(cMats, coneBaseGeo, palette.canopyDark, 741_102, true),
      layer(cMats, coneMidGeo, palette.canopy, 741_103, true),
      layer(cMats, coneTopGeo, palette.canopyLight, 741_114, true),
      // Broadleaf — root flare, shadowed skirt + base blob, mid blobs, sun-kissed crown.
      layer(bMats, rootGeo, palette.trunk, 741_132),
      layer(bMats, trunkGeo, palette.trunk, 741_104),
      layer(bMats, blobSkirtGeo, palette.canopyDark, 741_133, true),
      layer(bMats, blobAGeo, palette.canopyDark, 741_105, true),
      layer(bMats, blobBGeo, palette.canopyAlt, 741_106, true),
      layer(bMats, blobCGeo, palette.canopyAlt, 741_107, true),
      layer(bMats, blobCrownGeo, palette.canopyLight, 741_115, true),
      // Birch — pale bark, an angled branch, airy light foliage.
      layer(kMats, birchTrunkGeo, palette.birchBark, 741_108),
      layer(kMats, birchBranchGeo, palette.birchBark, 741_135),
      layer(kMats, birchBlobAGeo, palette.canopy, 741_109, true),
      layer(kMats, birchBlobBGeo, palette.canopyLight, 741_110, true),
      layer(kMats, birchBlobCGeo, palette.canopy, 741_116, true),
      layer(kMats, birchBlobDGeo, palette.canopyLight, 741_134, true),
      // Bushes — rounded twin lobes.
      layer(bushMats, bushGeo, palette.canopyDark, 741_111, true),
      layer(bushMats, bushLobeGeo, palette.canopyAlt, 741_117, true),
      // Blossom accents — root flare, dark skirt → pink → light.
      layer(bloomMats, rootGeo, palette.trunk, 741_136),
      layer(bloomMats, trunkGeo, palette.trunk, 741_118),
      layer(bloomMats, bloomSkirtGeo, palette.blossomDark, 741_137, true),
      layer(bloomMats, bloomAGeo, palette.blossomDark, 741_119, true),
      layer(bloomMats, bloomBGeo, palette.blossom, 741_120, true),
      layer(bloomMats, bloomCGeo, palette.blossom, 741_121, true),
      layer(bloomMats, bloomCrownGeo, palette.blossomLight, 741_122, true),
      // Distant treeline — deep-green, hazed.
      layer(tlMats, tlTrunkGeo, palette.trunk, 741_112),
      layer(tlMats, tlConeGeo, palette.canopyDark, 741_113),
    ];
    return { meshes, geometries, materials };
  }, [world, palette, wind]);

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
