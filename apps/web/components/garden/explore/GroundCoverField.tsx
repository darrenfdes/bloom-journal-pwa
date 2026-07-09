'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { groundCoverScatter, type ScatterItem } from '@/lib/garden/explore/scatter';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

/** Soft cottage-meadow wildflower hues, picked per instance by scatter variant. */
const WILDFLOWER_HUES = ['#e57ba0', '#f2d06b', '#f4efe4', '#b79ad6', '#e8896a'];
const STEM_GREEN = '#4d7a43';
const FERN_GREEN = '#3f6b3a';

/** A small fan of tapered blades radiating from the base — reads as a fern clump, not a flat card. */
function fernGeometry(): THREE.BufferGeometry {
  const blade = (x0: number, z0: number, x1: number, z1: number, tx: number, tz: number, h: number) => [
    x0, 0, z0, x1, 0, z1, tx, h, tz,
  ];
  const positions = new Float32Array([
    ...blade(-0.03, 0, 0.03, 0, 0, 0.02, 0.55),
    ...blade(0.02, -0.02, 0.06, 0.02, 0.28, 0.02, 0.42),
    ...blade(-0.02, -0.02, -0.06, 0.02, -0.28, 0.02, 0.42),
    ...blade(-0.02, 0.02, 0.02, 0.06, 0.02, 0.28, 0.44),
    ...blade(-0.02, -0.06, 0.02, -0.02, 0.02, -0.28, 0.44),
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return geo;
}

/**
 * Wildflowers (a thin green stem topped by a small coloured blossom, 5 hues) and ferns strewn
 * across the meadow floor — deterministic, off the journal flowers/ponds/spawn. Unlit so they stay
 * legible in every phase; the blossom colour rides on the instance colour, with a little jitter.
 */
export function GroundCoverField({ world }: { world: ExploreWorld }) {
  const built = useMemo(() => {
    const { wildflowers, ferns } = groundCoverScatter(world);

    const stemGeo = new THREE.CylinderGeometry(0.012, 0.016, 0.16, 4).translate(0, 0.08, 0);
    const blossomGeo = new THREE.IcosahedronGeometry(0.07, 0).scale(1, 0.8, 1).translate(0, 0.19, 0);
    const fernGeo = fernGeometry();
    const geometries = [stemGeo, blossomGeo, fernGeo];

    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const m = new THREE.Matrix4();
    const col = new THREE.Color();

    const build = (
      list: ScatterItem[],
      geo: THREE.BufferGeometry,
      hueFor: (variant: number) => string,
      seed: number,
    ) => {
      const mat = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const mesh = new THREE.InstancedMesh(geo, mat, list.length);
      const rng = mulberry32(seed);
      list.forEach((it, i) => {
        q.setFromAxisAngle(up, it.rotation);
        m.compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.stream), it.z),
          q,
          new THREE.Vector3(it.scale, it.scale, it.scale),
        );
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(hueFor(it.variant)).multiplyScalar(0.9 + rng() * 0.2));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return { mesh, mat };
    };

    // Wildflower stems + blossoms share the scatter list (so each blossom sits on its own stem).
    const stem = build(wildflowers, stemGeo, () => STEM_GREEN, 811_201);
    const blossom = build(
      wildflowers,
      blossomGeo,
      (v) => WILDFLOWER_HUES[v % WILDFLOWER_HUES.length]!,
      811_211,
    );
    const fern = build(ferns, fernGeo, () => FERN_GREEN, 811_811);

    return {
      meshes: [stem.mesh, blossom.mesh, fern.mesh],
      geometries,
      materials: [stem.mat, blossom.mat, fern.mat],
    };
  }, [world]);

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
