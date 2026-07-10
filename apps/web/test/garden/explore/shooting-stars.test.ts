import { describe, expect, it } from 'vitest';

import {
  buildStreak,
  nextStreakDelayMs,
  shootingStarsAllowed,
  streakPoseAt,
} from '@/lib/garden/explore/shooting-stars';
import { mulberry32 } from '@/lib/garden/bloom/rng';

describe('shootingStarsAllowed', () => {
  it('allows only star-lit phases (dusk/night) under mostly clear skies', () => {
    expect(shootingStarsAllowed('night', 0.1, 'clear')).toBe(true);
    expect(shootingStarsAllowed('dusk', 0.3, 'partly_cloudy')).toBe(true);
    expect(shootingStarsAllowed('day', 0, 'clear')).toBe(false);
    expect(shootingStarsAllowed('dawn', 0, 'clear')).toBe(false);
    expect(shootingStarsAllowed('golden', 0, 'clear')).toBe(false);
  });

  it('hides streaks behind heavy cloud or precipitation', () => {
    expect(shootingStarsAllowed('night', 0.7, 'overcast')).toBe(false);
    expect(shootingStarsAllowed('night', 0.2, 'rain')).toBe(false);
    expect(shootingStarsAllowed('night', 0.2, 'snow')).toBe(false);
    expect(shootingStarsAllowed('night', 0.2, undefined)).toBe(true);
  });
});

describe('nextStreakDelayMs', () => {
  it('waits 45–110 s between streaks', () => {
    expect(nextStreakDelayMs(0)).toBe(45_000);
    expect(nextStreakDelayMs(1)).toBe(110_000);
    const mid = nextStreakDelayMs(0.5);
    expect(mid).toBeGreaterThan(45_000);
    expect(mid).toBeLessThan(110_000);
  });
});

describe('buildStreak / streakPoseAt', () => {
  it('is deterministic for the same rng and keeps the streak high in the sky', () => {
    const a = buildStreak(mulberry32(5));
    const b = buildStreak(mulberry32(5));
    expect(a).toEqual(b);
    expect(a.elevation).toBeGreaterThanOrEqual(0.5);
    expect(a.elevation).toBeLessThanOrEqual(1.15);
    expect(a.durSec).toBeGreaterThanOrEqual(0.8);
    expect(a.durSec).toBeLessThanOrEqual(1.5);
  });

  it('moves the head along the dome as a unit vector, tail trailing behind', () => {
    const streak = buildStreak(mulberry32(9));
    const start = streakPoseAt(streak, 0);
    const end = streakPoseAt(streak, 1);
    for (const p of [start, end]) {
      expect(Math.hypot(p.head.x, p.head.y, p.head.z)).toBeCloseTo(1, 5);
      expect(Math.hypot(p.tail.x, p.tail.y, p.tail.z)).toBeCloseTo(1, 5);
    }
    // Head actually travels…
    const moved = Math.hypot(
      end.head.x - start.head.x,
      end.head.y - start.head.y,
      end.head.z - start.head.z,
    );
    expect(moved).toBeGreaterThan(0.1);
    // …and the tail lags the head along the path (tail ≈ where the head was earlier).
    const mid = streakPoseAt(streak, 0.6);
    const earlier = streakPoseAt(streak, 0.45);
    expect(Math.hypot(
      mid.tail.x - earlier.head.x,
      mid.tail.y - earlier.head.y,
      mid.tail.z - earlier.head.z,
    )).toBeLessThan(0.12);
  });

  it('fades in fast and out by the end', () => {
    const streak = buildStreak(mulberry32(3));
    expect(streakPoseAt(streak, 0).opacity).toBe(0);
    expect(streakPoseAt(streak, 0.12).opacity).toBeGreaterThan(0.8);
    expect(streakPoseAt(streak, 1).opacity).toBeLessThan(0.05);
  });
});
