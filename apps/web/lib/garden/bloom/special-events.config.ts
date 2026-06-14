/**
 * Hardcoded "special sky day" dates for the live garden — centralized for traceability.
 *
 * This is the single source of truth for dated shooting-star specials. Add or edit
 * entries here; the scheduler in `shooting-star.ts` reads from this file. Months are
 * 0-indexed (0 = Jan, 5 = Jun, 11 = Dec) to match `Date.getMonth()`.
 *
 * Note: the user's birthday is NOT listed here — it's a per-user setting (see settings)
 * that, when enabled, replaces the annual Dec 1 day at runtime.
 */

/** A one-time special day, e.g. a notable comet or alignment on a specific date. */
export interface OneOffSpecialDay {
  year: number;
  month: number; // 0-indexed
  day: number;
  label: string;
}

/** A day that recurs every year (same month/day). */
export interface AnnualSpecialDay {
  month: number; // 0-indexed
  day: number;
  label: string;
}

/** One-off shooting-star days (each fires only in its given year). */
export const SHOOTING_STAR_ONE_OFFS: OneOffSpecialDay[] = [
  { year: 2026, month: 5, day: 18, label: '18 Jun 2026 — one-off' },
];

/** The annual shooting-star day (replaced by the user's birthday when that setting is on). */
export const SHOOTING_STAR_ANNUAL: AnnualSpecialDay = {
  month: 11,
  day: 1,
  label: '1 Dec — annual',
};
