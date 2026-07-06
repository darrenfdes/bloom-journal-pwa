import { describe, expect, it } from 'vitest';

import {
  CAM_BOOM,
  CAM_ELEV_MAX,
  CAM_MIN_CLEARANCE,
  FOX_HEAD_HEIGHT,
} from '@/lib/garden/explore/constants';
import { followCameraPose } from '@/lib/garden/explore/follow-camera';
import type { PlayerState } from '@/lib/garden/explore/movement';
import { groundHeightAt } from '@/lib/garden/explore/terrain';
import type { Pond } from '@/lib/garden/explore/world-layout';

const player = (over: Partial<PlayerState> = {}): PlayerState => ({
  x: 4,
  z: -3,
  yaw: 0,
  pitch: 0,
  ...over,
});

describe('followCameraPose', () => {
  it('targets the fox head above the terrain', () => {
    const p = player();
    const { target } = followCameraPose(p, []);
    expect(target.x).toBe(p.x);
    expect(target.z).toBe(p.z);
    expect(target.y).toBeCloseTo(groundHeightAt(p.x, p.z) + FOX_HEAD_HEIGHT, 6);
  });

  it('hangs behind the fox (+z) at yaw 0, looking toward −z', () => {
    const { position, target } = followCameraPose(player(), []);
    expect(position.z).toBeGreaterThan(target.z);
    expect(position.x).toBeCloseTo(target.x, 6);
    expect(position.y).toBeGreaterThan(target.y);
  });

  it('keeps the boom length between camera and target', () => {
    const { position, target } = followCameraPose(player({ yaw: 1.1 }), []);
    const d = Math.hypot(position.x - target.x, position.y - target.y, position.z - target.z);
    expect(d).toBeCloseTo(CAM_BOOM, 6);
  });

  it('rotates with yaw', () => {
    // yaw π/2 turns the walker to face −x, so the camera hangs at +x.
    const { position, target } = followCameraPose(player({ yaw: Math.PI / 2 }), []);
    expect(position.x).toBeGreaterThan(target.x);
    expect(position.z).toBeCloseTo(target.z, 6);
  });

  it('lowers toward fox level when looking up, rises when looking down', () => {
    const up = followCameraPose(player({ pitch: 0.6 }), []);
    const level = followCameraPose(player(), []);
    const down = followCameraPose(player({ pitch: -0.6 }), []);
    expect(up.position.y).toBeLessThan(level.position.y);
    expect(down.position.y).toBeGreaterThan(level.position.y);
  });

  it('clamps boom elevation', () => {
    // Extreme look-down pitch (−60° is the applyLook clamp) must not exceed CAM_ELEV_MAX.
    const { position, target } = followCameraPose(player({ pitch: -Math.PI / 3 }), []);
    const elev = Math.asin((position.y - target.y) / CAM_BOOM);
    expect(elev).toBeLessThanOrEqual(CAM_ELEV_MAX + 1e-6);
  });

  it('never dips below terrain clearance', () => {
    // A pond dip behind the fox pulls the ground down; force a low boom via pitch up.
    const pond: Pond = { x: 4, z: 2, radius: 3, level: -0.15 };
    const p = player({ x: 4, z: -2, pitch: 0.6 }); // camera lands near the pond edge
    const { position } = followCameraPose(p, [pond]);
    const ground = groundHeightAt(position.x, position.z, [pond]);
    expect(position.y).toBeGreaterThanOrEqual(ground + CAM_MIN_CLEARANCE - 1e-9);
  });
});
