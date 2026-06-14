/**
 * Bloom Journal — Events runtime (pure TS, framework-agnostic)
 * ------------------------------------------------------------
 * Looks up the world events for a given day and merges in per-user events.
 * Location is optional and purely additive (see enrich-location.ts).
 *
 * Shared by the web app and the Expo/RN app — no React, no Node, no network.
 */

import eventsData from "./events.json";
import { enrichWithLocation } from "./enrich-location";
import type {
  WorldEvent, Coords, EventsUserContext, EventsFile,
} from "./types";

const FILE = eventsData as unknown as EventsFile;
const BY_DATE = FILE.byDate;

// Flatten shower windows once so per-day active-shower checks stay cheap.
const SHOWER_WINDOWS: WorldEvent[] = Object.values(BY_DATE)
  .flat()
  .filter((e) => e.type === "meteorShower" && !!e.activeRange);

// Cache local-date indexes per timezone offset (built lazily, once each).
const localIndexCache = new Map<number, Record<string, WorldEvent[]>>();

function indexForOffset(tzOffsetMinutes?: number): Record<string, WorldEvent[]> {
  if (tzOffsetMinutes == null) return BY_DATE; // default: match by UTC date
  const hit = localIndexCache.get(tzOffsetMinutes);
  if (hit) return hit;

  const map: Record<string, WorldEvent[]> = {};
  for (const ev of Object.values(BY_DATE).flat()) {
    // Instant-based events shift with the user's timezone; pure calendar
    // events (Friday 13th, leap day, season transition, comet) do not.
    const key = ev.instantUTC
      ? new Date(new Date(ev.instantUTC).getTime() + tzOffsetMinutes * 60_000)
          .toISOString().slice(0, 10)
      : ev.date;
    (map[key] ??= []).push(ev);
  }
  localIndexCache.set(tzOffsetMinutes, map);
  return map;
}

export interface DayEventsOptions {
  /** Only pass when the user has granted location permission. */
  coords?: Coords | null;
  /**
   * Minutes to add to UTC to get the user's local day (e.g. +330 for IST).
   * When set, instant-based events are bucketed by the user's local date so
   * a late-night full moon lands on the right journal day. Omit for UTC.
   */
  timeZoneOffsetMinutes?: number;
}

/**
 * All events for a given calendar day, in the user's frame.
 * @param date A local calendar day (Date or "YYYY-MM-DD").
 */
export function getEventsForDate(
  date: Date | string,
  user: EventsUserContext,
  opts: DayEventsOptions = {},
): WorldEvent[] {
  const isoDate = toLocalISODate(date);
  const index = indexForOffset(opts.timeZoneOffsetMinutes);

  const world = index[isoDate] ?? [];
  const showers = SHOWER_WINDOWS.filter(
    (e) =>
      isoDate >= e.activeRange!.start &&
      isoDate <= e.activeRange!.end &&
      isoDate !== e.date, // peak day is already in `world`
  );
  const personal = personalEvents(isoDate, user);

  return enrichWithLocation([...world, ...showers, ...personal], opts.coords);
}

/** Birthday + app anniversary for the day, computed from user data. */
export function personalEvents(
  isoDate: string,
  user: EventsUserContext,
): WorldEvent[] {
  const y = isoDate.slice(0, 4);
  const out: WorldEvent[] = [];

  if (matchesAnnual(isoDate, user.birthday)) {
    const age = +y - +user.birthday.slice(0, 4);
    out.push({
      id: `birthday-${isoDate}`, type: "birthday", date: isoDate,
      title: "Your Birthday", subtitle: age > 0 ? `Turning ${age}` : undefined,
      rarity: "epic",
    });
  }

  const installed = user.appInstallDate.slice(0, 10);
  if (matchesAnnual(isoDate, installed) && isoDate !== installed) {
    const years = +y - +installed.slice(0, 4);
    out.push({
      id: `anniversary-${isoDate}`, type: "appAnniversary", date: isoDate,
      title: "Bloom Journal Anniversary",
      subtitle: `${years} year${years > 1 ? "s" : ""}`, rarity: "rare",
    });
  }

  return out;
}

/**
 * Annual MM-DD match with a leap-day fallback: a Feb-29 birthday/anniversary
 * is observed on Feb 28 in non-leap years. (Switch to Mar 1 if you prefer.)
 */
function matchesAnnual(isoDate: string, sourceISO: string): boolean {
  const md = isoDate.slice(5);   // MM-DD of the day being checked
  const src = sourceISO.slice(5); // MM-DD of the source date
  if (md === src) return true;
  if (src === "02-29" && md === "02-28") {
    const year = +isoDate.slice(0, 4);
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return !isLeap; // only observe on Feb 28 when there's no Feb 29
  }
  return false;
}

function toLocalISODate(d: Date | string): string {
  if (typeof d === "string") return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export { FILE as eventsFileMeta };
