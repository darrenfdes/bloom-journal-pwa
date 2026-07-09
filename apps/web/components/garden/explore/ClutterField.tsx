'use client';

import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { clutterScatter, type ScatterItem } from '@/lib/garden/explore/scatter';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

const MUSH_CAP = ['#c0503f', '#a9713f'];
const PEBBLE = ['#8a8277', '#77706a'];
const STEM = '#e7dfca';
const WOOD = '#6b5334';

/**
 * Small ground clutter — mushrooms (stem + cap), fallen logs, stumps and pebbles — scattered
 * deterministically over the walkable meadow (off the flowers/ponds/spawn) for close-up interest.
 * Instanced `meshLambertMaterial` so it shades with the phase lights.
 */
export function ClutterField({ world }: { world: ExploreWorld }) {
  const built = useMemo(() => {
    const { mushrooms, logs, stumps, pebbles } = clutterScatter(world);

    const geometries: THREE.BufferGeometry[] = [];
    const geo = <T extends THREE.BufferGeometry>(g: T): T => {
      geometries.push(g);
      return g;
    };
    const stemGeo = geo(new THREE.CylinderGeometry(0.03, 0.045, 0.16, 5).translate(0, 0.08, 0));
    const capGeo = geo(
      new THREE.SphereGeometry(0.12, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.15, 0),
    );
    const logGeo = geo(new THREE.CylinderGeometry(0.16, 0.2, 1.6, 7));
    const stumpGeo = geo(new THREE.CylinderGeometry(0.22, 0.28, 0.34, 8).translate(0, 0.17, 0));
    const pebbleGeo = geo(new THREE.IcosahedronGeometry(0.16, 0).scale(1, 0.6, 1));

    const materials: THREE.Material[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const zAxis = new THREE.Vector3(0, 0, 1);
    const qYaw = new THREE.Quaternion();
    const qLay = new THREE.Quaternion();
    const m = new THREE.Matrix4();
    const col = new THREE.Color();

    /** `orient` yields the instance quaternion; `hueFor` the per-variant colour; `lift` sinks/raises it. */
    const build = (
      list: ScatterItem[],
      g: THREE.BufferGeometry,
      base: number,
      hueFor: (v: number) => string,
      orient: (it: ScatterItem) => THREE.Quaternion,
      lift: number,
      seed: number,
    ) => {
      const mat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
      materials.push(mat);
      const mesh = new THREE.InstancedMesh(g, mat, list.length);
      const rng = mulberry32(seed);
      list.forEach((it, i) => {
        const s = it.scale * base;
        m.compose(
          new THREE.Vector3(it.x, groundHeightAt(it.x, it.z, world.stream) + lift * s, it.z),
          orient(it),
          new THREE.Vector3(s, s, s),
        );
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, col.set(hueFor(it.variant)).multiplyScalar(0.9 + rng() * 0.2));
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      return mesh;
    };

    const yaw = (it: ScatterItem) => qYaw.setFromAxisAngle(up, it.rotation).clone();
    // Logs lie on their side: spin to horizontal, then yaw across the ground.
    const laid = (it: ScatterItem) => {
      qLay.setFromAxisAngle(zAxis, Math.PI / 2);
      return qYaw.setFromAxisAngle(up, it.rotation).multiply(qLay).clone();
    };

    const meshes = [
      build(mushrooms, stemGeo, 0.7, () => STEM, yaw, 0, 830_101),
      build(mushrooms, capGeo, 0.7, (v) => MUSH_CAP[v % MUSH_CAP.length]!, yaw, 0, 830_102),
      build(logs, logGeo, 0.7, () => WOOD, laid, 0.16, 830_103),
      build(stumps, stumpGeo, 0.85, () => WOOD, yaw, 0, 830_104),
      build(pebbles, pebbleGeo, 0.6, (v) => PEBBLE[v % PEBBLE.length]!, yaw, -0.2, 830_105),
    ];
    return { meshes, geometries, materials };
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
