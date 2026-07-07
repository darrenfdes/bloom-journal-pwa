import { describe, expect, it } from 'vitest';

import { applyLook, keysToInput, stepPlayer, strollHeld } from '@/lib/garden/explore/movement';
import type { PlayerState } from '@/lib/garden/explore/movement';
import type { Pond, WorldBounds } from '@/lib/garden/explore/world-layout';

const bounds: WorldBounds = { minX: -12, maxX: 96, minZ: -26, maxZ: 12 };
const opts = { speed: 3, bounds, ponds: [] as Pond[] };
const at = (x: number, z: number, yaw = 0, pitch = 0): PlayerState => ({ x, z, yaw, pitch });

describe('keysToInput', () => {
  it('maps WASD and arrows to the movement axes', () => {
    expect(keysToInput(new Set())).toEqual({ forward: 0, strafe: 0 });
    expect(keysToInput(new Set(['KeyW']))).toEqual({ forward: 1, strafe: 0 });
    expect(keysToInput(new Set(['ArrowUp']))).toEqual({ forward: 1, strafe: 0 });
    expect(keysToInput(new Set(['KeyS']))).toEqual({ forward: -1, strafe: 0 });
    expect(keysToInput(new Set(['KeyD']))).toEqual({ forward: 0, strafe: 1 });
    expect(keysToInput(new Set(['ArrowLeft']))).toEqual({ forward: 0, strafe: -1 });
  });

  it('normalizes diagonals to unit speed and cancels opposing keys', () => {
    const diag = keysToInput(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(diag.forward, diag.strafe)).toBeCloseTo(1);
    expect(diag.forward).toBeCloseTo(Math.SQRT1_2);
    expect(keysToInput(new Set(['KeyW', 'KeyS']))).toEqual({ forward: 0, strafe: 0 });
  });
});

describe('strollHeld', () => {
  it('detects either shift key', () => {
    expect(strollHeld(new Set())).toBe(false);
    expect(strollHeld(new Set(['KeyW']))).toBe(false);
    expect(strollHeld(new Set(['ShiftLeft']))).toBe(true);
    expect(strollHeld(new Set(['ShiftRight', 'KeyW']))).toBe(true);
  });
});

describe('stepPlayer', () => {
  it('walks north (−z) when facing north, scaled by speed and dt', () => {
    const next = stepPlayer(at(10, 0), { forward: 1, strafe: 0 }, 0.5, opts);
    expect(next.x).toBeCloseTo(10);
    expect(next.z).toBeCloseTo(-1.5);

    const half = stepPlayer(at(10, 0), { forward: 1, strafe: 0 }, 0.25, opts);
    expect(half.z).toBeCloseTo(-0.75);
  });

  it('walks east (+x) when yaw has turned right by 90°', () => {
    const next = stepPlayer(at(10, 0, -Math.PI / 2), { forward: 1, strafe: 0 }, 1, opts);
    expect(next.x).toBeCloseTo(13);
    expect(next.z).toBeCloseTo(0);
  });

  it('strafes east (+x) when facing north', () => {
    const next = stepPlayer(at(10, 0), { forward: 0, strafe: 1 }, 1, opts);
    expect(next.x).toBeCloseTo(13);
    expect(next.z).toBeCloseTo(0);
  });

  it('clamps to the world bounds', () => {
    const east = stepPlayer(at(95.5, 0), { forward: 0, strafe: 1 }, 2, opts);
    expect(east.x).toBe(bounds.maxX);
    const north = stepPlayer(at(0, -25.5), { forward: 1, strafe: 0 }, 2, opts);
    expect(north.z).toBe(bounds.minZ);
  });

  it('pushes the player out of pond water', () => {
    const pond: Pond = { x: 20, z: 5, radius: 5, level: -0.15 };
    const wet = { ...opts, ponds: [pond] };
    // Try to walk straight into the pond from its southern edge.
    let s = at(20, 11);
    for (let i = 0; i < 40; i++) s = stepPlayer(s, { forward: 1, strafe: 0 }, 0.1, wet);
    expect(Math.hypot(s.x - pond.x, s.z - pond.z)).toBeGreaterThanOrEqual(pond.radius);
  });

  it('does not move without input', () => {
    expect(stepPlayer(at(4, 4, 1.2, 0.3), { forward: 0, strafe: 0 }, 1, opts)).toEqual(
      at(4, 4, 1.2, 0.3),
    );
  });
});

describe('applyLook', () => {
  it('turns right when dragging right and looks down when dragging down', () => {
    const s = applyLook(at(0, 0), 100, 50, 0.005);
    expect(s.yaw).toBeCloseTo(-0.5);
    expect(s.pitch).toBeCloseTo(-0.25);
  });

  it('clamps pitch to a portrait-safe range', () => {
    const down = applyLook(at(0, 0), 0, 10_000, 0.005);
    expect(down.pitch).toBeCloseTo((-60 * Math.PI) / 180);
    const up = applyLook(at(0, 0), 0, -10_000, 0.005);
    expect(up.pitch).toBeCloseTo((45 * Math.PI) / 180);
  });
});
