'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';

import {
  CAM_DAMP_RATE,
  MOVE_ACCEL_RATE,
  STROLL_FACTOR,
  SWIM_SPEED_FACTOR,
  WADE_HALF_WIDTH,
  WALK_SPEED,
} from '@/lib/garden/explore/constants';
import { followCameraPose } from '@/lib/garden/explore/follow-camera';
import { expDamp, rampInput, stepFoxMotion, type FoxMotionState } from '@/lib/garden/explore/fox-motion';
import {
  keysToInput,
  stepPlayer,
  strollHeld,
  type MoveInput,
  type PlayerState,
} from '@/lib/garden/explore/movement';
import { closestOnStream, type Stream } from '@/lib/garden/explore/stream';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

import { FoxModel } from './FoxModel';
import { radialTexture } from './textures';

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/** A missing/corrupt Fox.glb degrades to an invisible walker instead of crashing the canvas. */
class FoxErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Drives the third-person fox each frame: merges keyboard + virtual-joystick input through
 * the pure movement math, smooths the fox's heading/gait, and floats the follow camera on a
 * damped boom behind it. Renders the fox model plus its soft ground shadow.
 */
/** True when the fox is over deep enough water to swim (as opposed to wade). */
function swimming(stream: Stream | null, x: number, z: number): boolean {
  if (!stream) return false;
  const w = closestOnStream(x, z, stream);
  return w.dist < w.halfWidth && w.halfWidth >= WADE_HALF_WIDTH;
}

export function FoxRig({
  world,
  playerRef,
  joystickRef,
  reducedMotion = false,
}: {
  world: ExploreWorld;
  playerRef: RefObject<PlayerState>;
  joystickRef: RefObject<MoveInput>;
  reducedMotion?: boolean;
}) {
  const camera = useThree((s) => s.camera);
  const keysRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<MoveInput>({ forward: 0, strafe: 0 });
  const motionRef = useRef<FoxMotionState>({ heading: playerRef.current.yaw, speed: 0 });
  const shadowRef = useRef<THREE.Mesh>(null);
  const wakeRef = useRef<THREE.Mesh>(null);
  const snapped = useRef(false);

  const shadowTexture = useMemo(() => radialTexture('rgba(20,30,25,.5)', 'rgba(20,30,25,0)'), []);
  const wakeTexture = useMemo(() => radialTexture('rgba(232,246,255,.6)', 'rgba(232,246,255,0)'), []);
  useEffect(() => () => shadowTexture.dispose(), [shadowTexture]);
  useEffect(() => () => wakeTexture.dispose(), [wakeTexture]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    const clear = () => keysRef.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const keys = keysToInput(keysRef.current);
    const keyScale = strollHeld(keysRef.current) ? STROLL_FACTOR : 1;
    const joy = joystickRef.current;
    const target: MoveInput = {
      forward: clamp1(keys.forward * keyScale + joy.forward),
      strafe: clamp1(keys.strafe * keyScale + joy.strafe),
    };
    // Ease the input so the fox accelerates from rest and coasts to a stop.
    const input = rampInput(inputRef.current, target, MOVE_ACCEL_RATE, dt);
    inputRef.current = input;
    const prev = playerRef.current;
    // Swimming through the deep pool is slower than running on land.
    const speed = swimming(world.stream, prev.x, prev.z) ? WALK_SPEED * SWIM_SPEED_FACTOR : WALK_SPEED;
    playerRef.current = stepPlayer(prev, input, dt, { speed, bounds: world.bounds });
    const p = playerRef.current;
    motionRef.current = stepFoxMotion(motionRef.current, p.x - prev.x, p.z - prev.z, dt);

    const pose = followCameraPose(p, world.stream);
    if (snapped.current) {
      camera.position.set(
        expDamp(camera.position.x, pose.position.x, CAM_DAMP_RATE, dt),
        expDamp(camera.position.y, pose.position.y, CAM_DAMP_RATE, dt),
        expDamp(camera.position.z, pose.position.z, CAM_DAMP_RATE, dt),
      );
    } else {
      camera.position.set(pose.position.x, pose.position.y, pose.position.z);
      snapped.current = true;
    }
    camera.lookAt(pose.target.x, pose.target.y, pose.target.z);

    // In the deep pool, drop the ground shadow and trail a soft wake instead.
    const deep = swimming(world.stream, p.x, p.z);
    const shadow = shadowRef.current;
    if (shadow) {
      (shadow.material as THREE.MeshBasicMaterial).opacity = deep ? 0 : 0.45;
      shadow.position.set(p.x, groundHeightAt(p.x, p.z, world.stream) + 0.012, p.z);
      shadow.rotation.z = -motionRef.current.heading;
    }
    const wake = wakeRef.current;
    if (wake) {
      (wake.material as THREE.MeshBasicMaterial).opacity = deep ? 0.3 : 0;
      if (deep && world.stream) {
        wake.position.set(p.x, world.stream.level + 0.03, p.z);
        wake.rotation.z = -motionRef.current.heading;
      }
    }
  });

  return (
    <>
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.62, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={shadowTexture}
          transparent
          opacity={0.45}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={wakeRef} rotation={[-Math.PI / 2, 0, 0]} scale={[0.9, 1.9, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={wakeTexture}
          transparent
          opacity={0}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <FoxErrorBoundary>
        <Suspense fallback={null}>
          <FoxModel
            playerRef={playerRef}
            motionRef={motionRef}
            stream={world.stream}
            reducedMotion={reducedMotion}
          />
        </Suspense>
      </FoxErrorBoundary>
    </>
  );
}
