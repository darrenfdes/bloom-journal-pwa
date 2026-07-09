/**
 * Third-person follow camera for the explorable meadow: a boom that hangs behind the fox
 * along the player's yaw, elevated by drag-look pitch, and never dipping into the terrain.
 * The player state's {x, z} is the fox's position; yaw/pitch orbit the camera around it.
 *
 * Pure logic — no three.js, no DOM.
 */
import {
  CAM_BOOM,
  CAM_ELEV_BASE,
  CAM_ELEV_MAX,
  CAM_ELEV_MIN,
  CAM_MIN_CLEARANCE,
  FOX_HEAD_HEIGHT,
} from './constants';
import type { PlayerState } from './movement';
import type { Stream } from './stream';
import { surfaceHeightAt } from './terrain';

export interface CameraPose {
  position: { x: number; y: number; z: number };
  /** The fox's head — the camera looks at this. */
  target: { x: number; y: number; z: number };
}

export interface FollowCameraOptions {
  boom: number;
  elevBase: number;
  elevMin: number;
  elevMax: number;
  headHeight: number;
  minClearance: number;
}

export function followCameraPose(
  player: PlayerState,
  stream: Stream | null,
  opts?: Partial<FollowCameraOptions>,
): CameraPose {
  const boom = opts?.boom ?? CAM_BOOM;
  const elevBase = opts?.elevBase ?? CAM_ELEV_BASE;
  const elevMin = opts?.elevMin ?? CAM_ELEV_MIN;
  const elevMax = opts?.elevMax ?? CAM_ELEV_MAX;
  const headHeight = opts?.headHeight ?? FOX_HEAD_HEIGHT;
  const minClearance = opts?.minClearance ?? CAM_MIN_CLEARANCE;

  const target = {
    x: player.x,
    y: surfaceHeightAt(player.x, player.z, stream) + headHeight,
    z: player.z,
  };

  // Dragging up (positive pitch, "look up") tips the boom down toward fox level; dragging
  // down rises overhead — matching first-person look intuition.
  const elev = Math.min(elevMax, Math.max(elevMin, elevBase - player.pitch));

  // Yaw 0 faces −z, so the camera hangs back along +z.
  const back = { x: Math.sin(player.yaw), z: Math.cos(player.yaw) };
  const position = {
    x: target.x + back.x * boom * Math.cos(elev),
    y: target.y + boom * Math.sin(elev),
    z: target.z + back.z * boom * Math.cos(elev),
  };
  position.y = Math.max(
    position.y,
    surfaceHeightAt(position.x, position.z, stream) + minClearance,
  );

  return { position, target };
}
