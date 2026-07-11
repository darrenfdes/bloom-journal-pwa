'use client';

import { useFrame, useLoader } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { FISH_HEADING_OFFSET, FISH_MODEL_URL } from '@/lib/garden/explore/constants';
import { fishAt, fishSchool, rippleAt } from '@/lib/garden/explore/fish';
import type { Stream } from '@/lib/garden/explore/stream';

const FISH_COUNT = 12;

/**
 * One instanced body layer of the fish. The glTF model splits into back/belly/fin primitives;
 * each becomes its own instanced mesh (sharing the per-fish matrices) so a single species colour
 * can shade the layers differently — bright back, pale belly, dusky fins.
 */
interface FishLayer {
  geometry: THREE.BufferGeometry;
  /** Derives this layer's instance colour from the species colour (mutates and returns `c`). */
  tint: (c: THREE.Color) => THREE.Color;
}

const WHITE = new THREE.Color('#ffffff');

/** Per-material tints keyed by the model's primitive material names. */
const LAYER_TINTS: Record<string, (c: THREE.Color) => THREE.Color> = {
  Top: (c) => c,
  Bottom: (c) => c.lerp(WHITE, 0.55),
  Fins: (c) => c.multiplyScalar(0.78),
};

/** A flat little fish pointing +Z: a diamond body with a vertical tail fin. Read from above. */
function fishGeometry(): THREE.BufferGeometry {
  const v = {
    nose: [0, 0, 0.5],
    left: [-0.17, 0, 0.05],
    right: [0.17, 0, 0.05],
    tail: [0, 0, -0.28],
    finTop: [0, 0.13, -0.46],
    finBot: [0, -0.13, -0.46],
  } as const;
  const positions = new Float32Array([
    ...v.nose, ...v.tail, ...v.left, // body left
    ...v.nose, ...v.right, ...v.tail, // body right
    ...v.tail, ...v.finTop, ...v.finBot, // tail fin
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

/**
 * Pull each primitive of the fish model out as plain world-space geometry, then normalize the
 * set together: centred on the origin, nose-to-tail length 1 (matching the fallback fish, so
 * the `fish.size * 0.4` instance scale keeps its meaning).
 */
function extractFishLayers(scene: THREE.Object3D): FishLayer[] {
  scene.updateMatrixWorld(true);
  const layers: FishLayer[] = [];
  const box = new THREE.Box3();
  scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const geometry = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    // The GLB is rigged for a swim clip we don't play — instancing wants plain geometry.
    geometry.deleteAttribute('skinIndex');
    geometry.deleteAttribute('skinWeight');
    geometry.computeBoundingBox();
    box.union(geometry.boundingBox!);
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    layers.push({ geometry, tint: LAYER_TINTS[material?.name ?? ''] ?? ((c) => c) });
  });
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = 1 / (size.z || 1);
  for (const layer of layers) {
    layer.geometry.translate(-center.x, -center.y, -center.z);
    layer.geometry.scale(scale, scale, scale);
  }
  return layers;
}

/**
 * A mixed school — orange koi holding the pool, silvery minnows darting the runs — driven by the
 * pure `fishAt`. One instanced mesh per body layer with per-species instance colours, matrices
 * refreshed each frame; a tail-yaw wiggle (quicker on quicker fish) sells the swim. A further
 * instanced mesh draws the expanding ripple rings left when a fish rises (`rippleAt`). Frozen but
 * present under reduced motion (no ripples then).
 */
function FishInstances({
  stream,
  reducedMotion,
  layers,
  headingOffset,
}: {
  stream: Stream;
  reducedMotion: boolean;
  layers: FishLayer[];
  headingOffset: number;
}) {
  const school = useMemo(() => fishSchool(stream, 404_017, FISH_COUNT), [stream]);
  const ringGeometry = useMemo(() => new THREE.RingGeometry(0.85, 1, 20), []);
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const ringRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => () => ringGeometry.dispose(), [ringGeometry]);

  // Species colours never change: set per-instance colours once, shaded per layer.
  useEffect(() => {
    const col = new THREE.Color();
    layers.forEach((layer, li) => {
      const mesh = meshRefs.current[li];
      if (!mesh) return;
      school.forEach((fish, i) => mesh.setColorAt(i, layer.tint(col.set(fish.color))));
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [school, layers]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    school.forEach((fish, i) => {
      const p = fishAt(fish, stream, t, reducedMotion);
      // Quicker fish flick their tails faster.
      const wiggle = reducedMotion ? 0 : Math.sin(t * (5 + fish.speed * 4) + fish.phase) * 0.3;
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.heading + wiggle + headingOffset, 0);
      const s = fish.size * 0.4;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      for (const mesh of meshRefs.current) mesh?.setMatrixAt(i, dummy.matrix);
    });
    for (const mesh of meshRefs.current) {
      if (mesh) mesh.instanceMatrix.needsUpdate = true;
    }

    const rings = ringRef.current;
    if (!rings) return;
    school.forEach((fish, i) => {
      const ring = rippleAt(fish, stream, t, reducedMotion);
      // Opacity is folded into the radius-driven scale; absent rings collapse to zero.
      const r = ring ? ring.radius * (0.5 + ring.opacity) : 0;
      dummy.position.set(ring?.x ?? 0, stream.level + 0.04, ring?.z ?? 0);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(r, r, r);
      dummy.updateMatrix();
      rings.setMatrixAt(i, dummy.matrix);
    });
    rings.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      {/* Drawn after the water sheet (renderOrder) so the school stays visible beneath it; the
          slight transparency reads as depth. */}
      {layers.map((layer, li) => (
        <instancedMesh
          key={li}
          ref={(mesh) => {
            meshRefs.current[li] = mesh;
          }}
          args={[layer.geometry, undefined, school.length]}
          renderOrder={1}
        >
          <meshLambertMaterial color="#ffffff" transparent opacity={0.85} side={THREE.DoubleSide} />
        </instancedMesh>
      ))}
      <instancedMesh ref={ringRef} args={[ringGeometry, undefined, school.length]} renderOrder={2}>
        <meshBasicMaterial
          color="#dfeef0"
          transparent
          opacity={0.5}
          depthWrite={false}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
    </group>
  );
}

/** The school built from the glTF fish model (suspends while the GLB loads). */
function GltfFishInstances({ stream, reducedMotion }: { stream: Stream; reducedMotion: boolean }) {
  const gltf = useLoader(GLTFLoader, FISH_MODEL_URL);
  const layers = useMemo(() => extractFishLayers(gltf.scene), [gltf]);
  useEffect(() => () => layers.forEach((layer) => layer.geometry.dispose()), [layers]);
  return (
    <FishInstances
      stream={stream}
      reducedMotion={reducedMotion}
      layers={layers}
      headingOffset={FISH_HEADING_OFFSET}
    />
  );
}

/** The old hand-rolled fish — only mounted when the GLB fails to load. */
function ProceduralFishInstances({
  stream,
  reducedMotion,
}: {
  stream: Stream;
  reducedMotion: boolean;
}) {
  const geometry = useMemo(() => fishGeometry(), []);
  const layers = useMemo<FishLayer[]>(() => [{ geometry, tint: (c) => c }], [geometry]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <FishInstances stream={stream} reducedMotion={reducedMotion} layers={layers} headingOffset={0} />
  );
}

/** A missing/corrupt Fish.glb degrades to the old procedural school instead of crashing. */
class FishErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function FishField({ stream, reducedMotion }: { stream: Stream; reducedMotion: boolean }) {
  return (
    <FishErrorBoundary
      fallback={<ProceduralFishInstances stream={stream} reducedMotion={reducedMotion} />}
    >
      <Suspense fallback={null}>
        <GltfFishInstances stream={stream} reducedMotion={reducedMotion} />
      </Suspense>
    </FishErrorBoundary>
  );
}
