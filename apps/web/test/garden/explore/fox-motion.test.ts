import { describe, expect, it } from 'vitest';

import { FOX_GAIT_RUN_MIN, FOX_GAIT_WALK_MIN } from '@/lib/garden/explore/constants';
import {
  dampAngle,
  expDamp,
  gaitFor,
  stepFoxMotion,
  type FoxMotionState,
} from '@/lib/garden/explore/fox-motion';

const idle = (): FoxMotionState => ({ heading: 0, speed: 0 });

describe('expDamp', () => {
  it('converges toward the target', () => {
    let v = 0;
    for (let i = 0; i < 200; i++) v = expDamp(v, 10, 8, 1 / 60);
    expect(v).toBeCloseTo(10, 3);
  });

  it('moves monotonically toward the target without overshooting', () => {
    const a = expDamp(0, 10, 8, 1 / 60);
    const b = expDamp(a, 10, 8, 1 / 60);
    expect(a).toBeGreaterThan(0);
    expect(b).toBeGreaterThan(a);
    expect(b).toBeLessThan(10);
  });

  it('gets closer to the target with a larger dt', () => {
    expect(expDamp(0, 10, 8, 0.1)).toBeGreaterThan(expDamp(0, 10, 8, 0.01));
  });
});

describe('dampAngle', () => {
  it('takes the shortest arc across the ±π seam', () => {
    // 3.1 → −3.1 should nudge *up* through π (short way ~0.083 rad), not down through 0.
    const next = dampAngle(3.1, -3.1, 10, 1 / 60);
    const moved = next - 3.1;
    expect(Math.abs(moved)).toBeLessThan(0.09);
    expect(next).toBeGreaterThan(3.1);
  });

  it('converges onto the target angle', () => {
    let a = 3.1;
    for (let i = 0; i < 300; i++) a = dampAngle(a, -3.1, 10, 1 / 60);
    // Compare on the circle, not numerically.
    const diff = Math.atan2(Math.sin(a + 3.1), Math.cos(a + 3.1));
    expect(Math.abs(diff)).toBeLessThan(1e-3);
  });

  it('stays within (−π, π]', () => {
    const a = dampAngle(3.14, -3.14, 50, 0.5);
    expect(a).toBeGreaterThan(-Math.PI);
    expect(a).toBeLessThanOrEqual(Math.PI);
  });
});

describe('stepFoxMotion', () => {
  it('heads exactly along yaw for a pure-forward step', () => {
    // yaw 0.7, forward step: dx = −sin(yaw)·d, dz = −cos(yaw)·d (movement.ts convention).
    const yaw = 0.7;
    const d = 0.05;
    let m: FoxMotionState = { heading: yaw, speed: 1 };
    m = stepFoxMotion(m, -Math.sin(yaw) * d, -Math.cos(yaw) * d, 1 / 60);
    expect(m.heading).toBeCloseTo(yaw, 6);
  });

  it('turns toward a new direction over successive frames', () => {
    let m = idle();
    for (let i = 0; i < 120; i++) m = stepFoxMotion(m, 0.05, 0, 1 / 60); // moving −heading… east
    expect(m.heading).toBeCloseTo(Math.atan2(-0.05, 0), 2);
  });

  it('ramps speed up while moving and decays it when stopped', () => {
    let m = idle();
    for (let i = 0; i < 120; i++) m = stepFoxMotion(m, -0.05, 0, 1 / 60); // 3 m/s
    expect(m.speed).toBeGreaterThan(2.5);
    for (let i = 0; i < 240; i++) m = stepFoxMotion(m, 0, 0, 1 / 60);
    expect(m.speed).toBeLessThan(0.05);
  });

  it('freezes heading while idle', () => {
    let m: FoxMotionState = { heading: 1.2, speed: 2 };
    for (let i = 0; i < 60; i++) m = stepFoxMotion(m, 0, 0, 1 / 60);
    expect(m.heading).toBe(1.2);
  });

  it('returns the previous state for a non-positive dt', () => {
    const m: FoxMotionState = { heading: 1, speed: 2 };
    expect(stepFoxMotion(m, 1, 1, 0)).toBe(m);
  });
});

describe('gaitFor', () => {
  it('maps speed to idle/walk/run with inclusive run threshold', () => {
    expect(gaitFor(0)).toBe('idle');
    expect(gaitFor(FOX_GAIT_WALK_MIN - 0.01)).toBe('idle');
    expect(gaitFor(FOX_GAIT_WALK_MIN)).toBe('walk');
    expect(gaitFor(FOX_GAIT_RUN_MIN - 0.01)).toBe('walk');
    expect(gaitFor(FOX_GAIT_RUN_MIN)).toBe('run');
    expect(gaitFor(10)).toBe('run');
  });
});
