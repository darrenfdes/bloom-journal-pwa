'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

import type { WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import {
  buildButterflies,
  butterflyAt,
  butterflyCountFor,
  type PerchPoint,
} from '@/lib/garden/explore/butterflies';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

// Reused per-frame scratch objects — ≤12 matrix composes per frame, zero allocation.
const TMP = {
  m: new THREE.Matrix4(),
  pos: new THREE.Vector3(),
  scl: new THREE.Vector3(),
  q: new THREE.Quaternion(),
  qHeading: new THREE.Quaternion(),
  qFlap: new THREE.Quaternion(),
  Y: new THREE.Vector3(0, 1, 0),
  Z: new THREE.Vector3(0, 0, 1),
};

/**
 * A handful of butterflies flitting between the journal flowers — one instanced wing quad
 * (two mirrored instances per butterfly) plus tiny instanced bodies. Poses are closed-form
 * (`butterflyAt`), so per-frame work is composing ≤12 matrices. Never mounted at night, in
 * bad weather, or under reduced motion; raycasting is disabled so flower taps pass through.
 */
export function ButterflyField({
  world,
  phase,
  category,
}: {
  world: ExploreWorld;
  phase: PhaseKey;
  category: WeatherCategory | undefined;
}) {
  const count = butterflyCountFor(phase, category);

  const perches: PerchPoint[] = useMemo(
    () =>
      world.flowers.map((f) => ({
        x: f.x,
        y: groundHeightAt(f.x, f.z, world.stream) + f.height * 0.8,
        z: f.z,
      })),
    [world],
  );

  const built = useMemo(() => {
    if (count === 0 || perches.length === 0) return null;
    const specs = buildButterflies(202_507, count);

    // Wing: a small quad in the xz-plane, hinged at the body line (x=0), extending +x.
    const wingGeo = new THREE.PlaneGeometry(0.16, 0.2).rotateX(-Math.PI / 2).translate(0.09, 0, 0);
    const bodyGeo = new THREE.SphereGeometry(0.024, 6, 5).scale(1, 1, 2.4);
    const wingMat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const bodyMat = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false });

    const wings = new THREE.InstancedMesh(wingGeo, wingMat, specs.length * 2);
    const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, specs.length);
    // Butterflies must never swallow the flower tap raycast.
    wings.raycast = () => {};
    bodies.raycast = () => {};
    wings.frustumCulled = false;
    bodies.frustumCulled = false;

    const col = new THREE.Color();
    specs.forEach((spec, i) => {
      wings.setColorAt(i * 2, col.set(spec.wing[0]));
      wings.setColorAt(i * 2 + 1, col.set(spec.wing[0]));
      bodies.setColorAt(i, col.set(spec.wing[1]).multiplyScalar(0.55));
    });
    if (wings.instanceColor) wings.instanceColor.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;

    return { specs, wings, bodies, wingGeo, bodyGeo, wingMat, bodyMat };
  }, [count, perches]);

  useEffect(() => {
    if (!built) return;
    return () => {
      built.wingGeo.dispose();
      built.bodyGeo.dispose();
      built.wingMat.dispose();
      built.bodyMat.dispose();
      built.wings.dispose();
      built.bodies.dispose();
    };
  }, [built]);

  useFrame(({ clock }) => {
    if (!built) return;
    const t = clock.elapsedTime;

    built.specs.forEach((spec, i) => {
      // Stagger each butterfly along its own timeline so they never move in sync.
      const pose = butterflyAt(spec, perches, t + (spec.seed % 97))!;
      TMP.pos.set(pose.x, pose.y, pose.z);
      TMP.qHeading.setFromAxisAngle(TMP.Y, pose.heading);
      // Perched: wings held high, fanning slowly. Flying: full beats.
      const flapPhase = Math.sin(t * Math.PI * 2 * pose.flap + spec.seed);
      const angle = pose.mode === 'perch' ? 1.05 - 0.25 * flapPhase : 0.15 + 0.85 * flapPhase;
      for (const side of [0, 1] as const) {
        TMP.qFlap.setFromAxisAngle(TMP.Z, side === 0 ? angle : -angle);
        TMP.q.copy(TMP.qHeading).multiply(TMP.qFlap);
        TMP.scl.set(spec.size * (side === 0 ? 1 : -1), spec.size, spec.size);
        TMP.m.compose(TMP.pos, TMP.q, TMP.scl);
        built.wings.setMatrixAt(i * 2 + side, TMP.m);
      }
      TMP.scl.set(spec.size, spec.size, spec.size);
      TMP.m.compose(TMP.pos, TMP.qHeading, TMP.scl);
      built.bodies.setMatrixAt(i, TMP.m);
    });
    built.wings.instanceMatrix.needsUpdate = true;
    built.bodies.instanceMatrix.needsUpdate = true;
  });

  if (!built) return null;
  return (
    <>
      <primitive object={built.wings} />
      <primitive object={built.bodies} />
    </>
  );
}
