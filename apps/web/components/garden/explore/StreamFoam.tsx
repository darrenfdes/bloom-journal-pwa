'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import { foamBlobs, foamPulse, riffleSites, riffleStones } from '@/lib/garden/explore/foam';
import { mixHex } from '@/lib/garden/explore/sky';
import type { Stream } from '@/lib/garden/explore/stream';

const STONE_GREYS = ['#8b8578', '#7a7268', '#9a8f7f'];

/**
 * Riffles where the creek narrows: shimmering white foam patches on the water and a stone or two
 * breaking the surface. Placement is deterministic (`riffleSites`/`foamBlobs`/`riffleStones`);
 * only the foam animates, via the pure `foamPulse`, and it holds a fixed pose under reduced motion.
 */
export function StreamFoam({
  stream,
  skyTint,
  reducedMotion,
}: {
  stream: Stream;
  skyTint: string;
  reducedMotion: boolean;
}) {
  const { sites, blobs, stones } = useMemo(() => {
    const s = riffleSites(stream, 404_031);
    return { sites: s, blobs: foamBlobs(s, stream, 404_033), stones: riffleStones(s, 404_037) };
  }, [stream]);

  const foamGeo = useMemo(() => new THREE.CircleGeometry(0.3, 8), []);
  const stoneGeo = useMemo(() => new THREE.DodecahedronGeometry(0.5, 0), []);
  useEffect(
    () => () => {
      foamGeo.dispose();
      stoneGeo.dispose();
    },
    [foamGeo, stoneGeo],
  );

  const foamRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const foamColor = useMemo(() => mixHex(skyTint, '#ffffff', 0.75), [skyTint]);

  // Stones never move: matrices + grey jitter set once per stream.
  const stoneMesh = useMemo(() => {
    const mesh = new THREE.InstancedMesh(
      stoneGeo,
      new THREE.MeshLambertMaterial({ flatShading: true }),
      stones.length,
    );
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const col = new THREE.Color();
    stones.forEach((stone, i) => {
      q.setFromEuler(new THREE.Euler(0, stone.rotation, 0));
      m.compose(
        new THREE.Vector3(stone.x, stream.level + 0.02, stone.z),
        q,
        new THREE.Vector3(stone.scale, stone.scale * 0.5, stone.scale),
      );
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(STONE_GREYS[i % STONE_GREYS.length]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }, [stoneGeo, stones, stream]);

  useEffect(
    () => () => {
      (stoneMesh.material as THREE.Material).dispose();
      stoneMesh.dispose();
    },
    [stoneMesh],
  );

  // Lay the foam flat once; per-frame we only rewrite scales.
  const placeFoam = (time: number) => {
    const mesh = foamRef.current;
    if (!mesh) return;
    blobs.forEach((blob, i) => {
      const pulse = foamPulse(blob, time, reducedMotion);
      dummy.position.set(blob.x, stream.level + 0.035, blob.z);
      dummy.rotation.set(-Math.PI / 2, 0, blob.phase);
      dummy.scale.set(pulse.scale, pulse.scale, pulse.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };

  useEffect(() => {
    placeFoam(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blobs, stream, reducedMotion]);

  useFrame(({ clock }) => {
    if (!reducedMotion) placeFoam(clock.elapsedTime);
  });

  if (sites.length === 0) return null;
  return (
    <group>
      <instancedMesh ref={foamRef} args={[foamGeo, undefined, blobs.length]}>
        <meshBasicMaterial
          color={foamColor}
          transparent
          opacity={0.45}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      <primitive object={stoneMesh} />
    </group>
  );
}
