import { describe, expect, it } from 'vitest';

import { isShootingStarSpecialDay } from '@/lib/garden/bloom/shooting-star';

// The configured one-off: 18 Jun 2026, extended through the following morning until 6 AM.
describe('isShootingStarSpecialDay — 18 Jun 2026 one-off window', () => {
  it('is active any time on 18 Jun 2026', () => {
    expect(isShootingStarSpecialDay(new Date(2026, 5, 18, 0, 0))).toBe(true);
    expect(isShootingStarSpecialDay(new Date(2026, 5, 18, 21, 30))).toBe(true);
    expect(isShootingStarSpecialDay(new Date(2026, 5, 18, 23, 59))).toBe(true);
  });

  it('stays active into 19 Jun 2026 until 6 AM', () => {
    expect(isShootingStarSpecialDay(new Date(2026, 5, 19, 0, 0))).toBe(true);
    expect(isShootingStarSpecialDay(new Date(2026, 5, 19, 5, 59))).toBe(true);
  });

  it('ends at 6 AM on 19 Jun 2026', () => {
    expect(isShootingStarSpecialDay(new Date(2026, 5, 19, 6, 0))).toBe(false);
    expect(isShootingStarSpecialDay(new Date(2026, 5, 19, 9, 0))).toBe(false);
  });

  it('is not active on neighbouring days', () => {
    expect(isShootingStarSpecialDay(new Date(2026, 5, 17, 23, 0))).toBe(false);
    expect(isShootingStarSpecialDay(new Date(2026, 5, 20, 1, 0))).toBe(false);
  });
});
