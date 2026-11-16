/**
 * Hardcoded "special sky day" dates for the live garden — centralized for traceability.
 *
 * This is the single source of truth for dated shooting-star specials. Add or edit
 * entries here; the scheduler in `shooting-star.ts` reads from this file. Months are
 * 0-indexed (0 = Jan, 5 = Jun, 11 = Dec) to match `Date.getMonth()`.
 *
 * A saved birthday overrides the garden's default birthday. The separate setting
 * controls whether the ordinary annual shooting-star day is also observed.
 */

/** A one-time special day, e.g. a notable comet or alignment on a specific date. */
export interface OneOffSpecialDay {
  year: number;
  month: number; // 0-indexed
  day: number;
  label: string;
  /**
   * Keep the special active past midnight, into the following day until this local hour (0–23).
   * e.g. `6` → still active the next morning until 06:00, so an overnight session keeps its star.
   */
  untilNextDayHour?: number;
}

/** A day that recurs every year (same month/day). */
export interface AnnualSpecialDay {
  month: number; // 0-indexed
  day: number;
  label: string;
}

/** One-off shooting-star days (each fires only in its given year). */
export const SHOOTING_STAR_ONE_OFFS: OneOffSpecialDay[] = [
  { year: 2026, month: 5, day: 18, label: '18 Jun 2026 — one-off (through 19 Jun 06:00)', untilNextDayHour: 6 },
];

/** The annual shooting-star day (replaced by the user's birthday when that setting is on). */
export const SHOOTING_STAR_ANNUAL: AnnualSpecialDay = {
  month: 11,
  day: 1,
  label: '1 Dec — annual',
};

/** Birthday celebration date when Settings has no date of birth. */
export const DEFAULT_BIRTHDAY = '12-01';
