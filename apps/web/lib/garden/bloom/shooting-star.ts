/**
 * Shooting-star scheduling for the live garden. Normal days show no shooting stars; on "special"
 * days a star appears ~30s after the app opens (high chance) plus occasional repeats through the
 * night. The hardcoded special dates live in `special-events.config.ts` (one-offs + the annual day);
 * a birthday set in settings with the override toggle replaces the annual day with the birthday.
 */

import { SHOOTING_STAR_ONE_OFFS, SHOOTING_STAR_ANNUAL } from './special-events.config';

/** True when `now` falls on a special shooting-star day. */
export function isShootingStarSpecialDay(
  now: Date,
  cfg: { birthday?: string | null; useBirthday?: boolean } = {}
): boolean {
  const m = now.getMonth();
  const d = now.getDate();
  const y = now.getFullYear();

  if (SHOOTING_STAR_ONE_OFFS.some((e) => e.year === y && e.month === m && e.day === d)) return true;

  if (cfg.useBirthday && cfg.birthday) {
    // Birthday replaces the annual day.
    const b = new Date(cfg.birthday);
    return b.getMonth() === m && b.getDate() === d;
  }

  return m === SHOOTING_STAR_ANNUAL.month && d === SHOOTING_STAR_ANNUAL.day; // annual
}

/** Tunable timing/probability for the special-day shooting stars. */
export const SPECIAL_STAR = {
  initialDelayMs: 30_000, // ~30s after the app opens
  initialChance: 0.9, // 90% on the initial attempt
  repeatEveryMs: [150_000, 300_000] as const, // 2.5–5 min re-roll
  repeatChance: 0.4, // each re-roll, night/dusk only
};
