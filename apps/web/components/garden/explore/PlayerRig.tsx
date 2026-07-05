'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, type RefObject } from 'react';

import { EYE_HEIGHT, WALK_SPEED } from '@/lib/garden/explore/constants';
import {
  keysToInput,
  stepPlayer,
  type MoveInput,
  type PlayerState,
} from '@/lib/garden/explore/movement';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { ExploreWorld } from '@/lib/garden/explore/world-layout';

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Drives the first-person camera each frame: merges keyboard + virtual-joystick input through
 * the pure movement math and pins the eye to the terrain. Renders nothing.
 */
export function PlayerRig({
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

  useEffect(() => {
    camera.rotation.order = 'YXZ';
  }, [camera]);

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
    const keys = keysToInput(keysRef.current);
    const joy = joystickRef.current;
    const input: MoveInput = {
      forward: clamp1(keys.forward + joy.forward),
      strafe: clamp1(keys.strafe + joy.strafe),
    };
    playerRef.current = stepPlayer(playerRef.current, input, Math.min(delta, 0.1), {
      speed: WALK_SPEED,
      bounds: world.bounds,
      ponds: world.ponds,
    });
    const p = playerRef.current;
    camera.position.set(p.x, groundHeightAt(p.x, p.z, world.ponds) + EYE_HEIGHT, p.z);
    camera.rotation.set(p.pitch, p.yaw, 0);
  });

  return null;
}
