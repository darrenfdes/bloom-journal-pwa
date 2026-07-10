import { describe, expect, it } from 'vitest';

import { mulberry32 } from '@/lib/garden/bloom/rng';
import { DUCK_FLIGHT, SOLO_BIRDS } from '@/lib/garden/bloom/ducks';
import {
  buildFlight,
  firstDuckDelayMs,
  flightAllowed,
  flightPoseAt,
  nextBirdRollDelayMs,
  nextDuckDelayMs,
  rollDuckSession,
  rollSoloBird,
} from '@/lib/garden/explore/flights';

const camera = { x: 40, z: 8, yaw: 0 };

describe('flightAllowed', () => {
  it('grounds every flight in fog and precipitation', () => {
    expect(flightAllowed('clear')).toBe(true);
    expect(flightAllowed('partly_cloudy')).toBe(true);
    expect(flightAllowed('overcast')).toBe(true);
    expect(flightAllowed(undefined)).toBe(true);
    for (const cat of ['fog', 'drizzle', 'rain', 'heavy_rain', 'snow', 'thunderstorm'] as const) {
      expect(flightAllowed(cat)).toBe(false);
    }
  });
});

describe('session/timing rolls (single source: ducks.ts)', () => {
  it('mirrors the 2D duck session chances', () => {
    expect(rollDuckSession(0.2, 'golden')).toBe(true); // < 1/3
    expect(rollDuckSession(0.5, 'golden')).toBe(false);
    expect(rollDuckSession(0.1, 'dusk')).toBe(true); // < 1/6
    expect(rollDuckSession(0.3, 'dusk')).toBe(false);
    expect(rollDuckSession(0.0, 'day')).toBe(false);
    expect(rollDuckSession(0.0, 'night')).toBe(false);
  });

  it('mirrors the 2D solo-bird chance', () => {
    expect(rollSoloBird(0.5, 'day')).toBe(true); // < 0.8
    expect(rollSoloBird(0.9, 'day')).toBe(false);
    expect(rollSoloBird(0.1, 'night')).toBe(false);
  });

  it('keeps every delay inside the 2D tuning ranges', () => {
    for (const r of [0, 0.5, 1]) {
      const first = firstDuckDelayMs(r);
      expect(first).toBeGreaterThanOrEqual(DUCK_FLIGHT.firstFlightDelayMs[0]);
      expect(first).toBeLessThanOrEqual(DUCK_FLIGHT.firstFlightDelayMs[1]);
      const next = nextDuckDelayMs(r);
      expect(next).toBeGreaterThanOrEqual(DUCK_FLIGHT.repeatEveryMs[0]);
      expect(next).toBeLessThanOrEqual(DUCK_FLIGHT.repeatEveryMs[1]);
      const bird = nextBirdRollDelayMs(r);
      expect(bird).toBeGreaterThanOrEqual(SOLO_BIRDS.repeatEveryMs[0]);
      expect(bird).toBeLessThanOrEqual(SOLO_BIRDS.repeatEveryMs[1]);
    }
  });
});

describe('buildFlight', () => {
  it('is deterministic and crosses the sky ahead of the camera', () => {
    const a = buildFlight(mulberry32(31), 'ducks', camera);
    const b = buildFlight(mulberry32(31), 'ducks', camera);
    expect(a).toEqual(b);

    const mid = { x: (a.start.x + a.end.x) / 2, z: (a.start.z + a.end.z) / 2 };
    const distFromCamera = Math.hypot(mid.x - camera.x, mid.z - camera.z);
    expect(distFromCamera).toBeGreaterThan(30);
    expect(distFromCamera).toBeLessThan(60);
    // Camera at yaw 0 faces north (−z): the crossing must happen in front, not behind.
    expect(mid.z).toBeLessThan(camera.z);
    expect(a.altitude).toBeGreaterThanOrEqual(22);
    expect(a.altitude).toBeLessThanOrEqual(34);
    expect(a.durSec).toBeGreaterThanOrEqual(20);
    expect(a.durSec).toBeLessThanOrEqual(40);
  });

  it('forms a duck V: leader in front, alternating flanks trailing behind', () => {
    const flight = buildFlight(mulberry32(4), 'ducks', camera);
    expect(flight.members.length).toBeGreaterThanOrEqual(3);
    expect(flight.members.length).toBeLessThanOrEqual(7);
    const [leader, ...rest] = flight.members;
    expect(leader!.along).toBe(0);
    expect(leader!.lateral).toBe(0);
    rest.forEach((m, i) => {
      expect(m.along).toBeLessThan(0); // trailing
      const side = Math.sign(m.lateral);
      expect(side).toBe(i % 2 === 0 ? 1 : -1); // alternating flanks
    });
  });

  it('sends one or two solo birds', () => {
    for (let seed = 0; seed < 8; seed++) {
      const flight = buildFlight(mulberry32(seed), 'bird', camera);
      expect(flight.members.length).toBeGreaterThanOrEqual(1);
      expect(flight.members.length).toBeLessThanOrEqual(2);
    }
  });
});

describe('flightPoseAt', () => {
  it('fades in and out at the crossing edges and undulates in between', () => {
    const flight = buildFlight(mulberry32(9), 'ducks', camera);
    const m = flight.members[0]!;
    expect(flightPoseAt(flight, m, 0).opacity).toBe(0);
    expect(flightPoseAt(flight, m, 1).opacity).toBe(0);
    expect(flightPoseAt(flight, m, 0.5).opacity).toBe(1);

    const ys = [0.2, 0.35, 0.5, 0.65, 0.8].map((t) => flightPoseAt(flight, m, t).y);
    const spread = Math.max(...ys) - Math.min(...ys);
    expect(spread).toBeGreaterThan(0.3); // undulating, not a flat line
    for (const y of ys) {
      expect(Math.abs(y - flight.altitude)).toBeLessThan(4);
    }
  });

  it('keeps followers behind the leader along the path', () => {
    const flight = buildFlight(mulberry32(2), 'ducks', camera);
    const leader = flight.members[0]!;
    const wing = flight.members[1]!;
    const pl = flightPoseAt(flight, leader, 0.5);
    const pw = flightPoseAt(flight, wing, 0.5);
    const pathDir = {
      x: flight.end.x - flight.start.x,
      z: flight.end.z - flight.start.z,
    };
    const len = Math.hypot(pathDir.x, pathDir.z);
    // Project follower-relative offset onto the travel direction: must be negative (behind).
    const proj =
      ((pw.x - pl.x) * pathDir.x + (pw.z - pl.z) * pathDir.z) / len;
    expect(proj).toBeLessThan(0);
  });
});
