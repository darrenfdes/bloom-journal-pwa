'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import * as THREE from 'three';

import {
  CAM_DAMP_RATE,
  MOVE_ACCEL_RATE,
  STROLL_FACTOR,
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
export function FoxRig({
  world,
  playerRef,
  joystickRef,
}: {
  world: ExploreWorld;
  playerRef: RefObject<PlayerState>;
  joystickRef: RefObject<MoveInput>;
}) {
  const camera = useThree((s) => s.camera);
  const keysRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<MoveInput>({ forward: 0, strafe: 0 });
  const motionRef = useRef<FoxMotionState>({ heading: playerRef.current.yaw, speed: 0 });
  const shadowRef = useRef<THREE.Mesh>(null);
  const snapped = useRef(false);

  const shadowTexture = useMemo(() => radialTexture('rgba(20,30,25,.5)', 'rgba(20,30,25,0)'), []);
  useEffect(() => () => shadowTexture.dispose(), [shadowTexture]);

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
    playerRef.current = stepPlayer(prev, input, dt, {
      speed: WALK_SPEED,
      bounds: world.bounds,
      ponds: world.ponds,
    });
    const p = playerRef.current;
    motionRef.current = stepFoxMotion(motionRef.current, p.x - prev.x, p.z - prev.z, dt);

    const pose = followCameraPose(p, world.ponds);
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

    const shadow = shadowRef.current;
    if (shadow) {
      shadow.position.set(p.x, groundHeightAt(p.x, p.z, world.ponds) + 0.012, p.z);
      shadow.rotation.z = -motionRef.current.heading;
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
      <FoxErrorBoundary>
        <Suspense fallback={null}>
          <FoxModel playerRef={playerRef} motionRef={motionRef} ponds={world.ponds} />
        </Suspense>
      </FoxErrorBoundary>
    </>
  );
}
