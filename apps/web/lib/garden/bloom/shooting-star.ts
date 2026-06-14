/**
 * Shooting-star scheduling for the live garden. Normal days show no shooting stars; on "special"
 * days a star appears ~30s after the app opens (high chance) plus occasional repeats through the
 * night. Special days: 18 Jun 2026 (one-off) and 1 Dec every year — a birthday set in settings with
 * the override toggle replaces Dec 1 with the birthday.
 */

/** True when `now` falls on a special shooting-star day. */
export function isShootingStarSpecialDay(
  now: Date,
  cfg: { birthday?: string | null; useBirthday?: boolean } = {}
): boolean {
  const m = now.getMonth();
  const d = now.getDate();
  const y = now.getFullYear();

  if (y === 2026 && m === 5 && d === 18) return true; // 18 Jun 2026, one-off

  if (cfg.useBirthday && cfg.birthday) {
    // Birthday replaces the annual Dec 1.
    const b = new Date(cfg.birthday);
    return b.getMonth() === m && b.getDate() === d;
  }

  return m === 11 && d === 1; // 1 Dec, annual
}

/** Tunable timing/probability for the special-day shooting stars. */
export const SPECIAL_STAR = {
  initialDelayMs: 30_000, // ~30s after the app opens
  initialChance: 0.9, // 90% on the initial attempt
  repeatEveryMs: [150_000, 300_000] as const, // 2.5–5 min re-roll
  repeatChance: 0.4, // each re-roll, night/dusk only
};
