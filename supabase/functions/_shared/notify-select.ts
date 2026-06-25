/**
 * Pure notification-selection logic.
 *
 * Given the events that land on a user's *local* date, the user's local clock,
 * and their group toggles, decide which notifications are "due" right now and at
 * what hour each kind fires. No DB, no network, no Deno/Node APIs — so it runs
 * unchanged inside the Deno edge function and under vitest.
 *
 * Mirrors the sky-phase classification in
 * `apps/web/lib/garden/bloom/event-catalog.ts` (`phaseForEvent`) and the
 * celestial/festivity groupings in its `EVENT_GROUPS`.
 */

import {
  anniversaryMessage,
  birthdayMessage,
  celestialMessage,
  festivityMessage,
  memoryMessage,
  type NotifyEvent,
} from './messages.ts';

export interface NotifyGroups {
  celestial: boolean;
  festivities: boolean;
  memory: boolean;
}

export interface SelectInput {
  /** Events whose *local* date equals `localDate` (already timezone-bucketed). */
  events: NotifyEvent[];
  /** The user's current local hour, 0–23. */
  localHour: number;
  /** The user's current local date, `YYYY-MM-DD` (used for dedupe keys). */
  localDate: string;
  groups: NotifyGroups;
  /** The user's birthday `YYYY-MM-DD`, or null. */
  birthday: string | null;
  /** Local date of the user's first entry `YYYY-MM-DD`, or null. */
  firstEntryDate: string | null;
  /** Years since a prior-year entry on this MM-DD (≥1), or null when none. */
  memoryYearsAgo: number | null;
}

export interface NotifyItem {
  key: string;
  title: string;
  body: string;
  tag: string;
  url: string;
}

const CELESTIAL_TYPES = new Set<string>([
  'fullMoon', 'newMoon', 'supermoon', 'micromoon', 'blueMoon', 'blackMoon',
  'lunarEclipse', 'solarEclipse',
  'solstice', 'equinox', 'seasonTransition', 'crossQuarter', 'solarTerm',
  'earthApsis', 'planetOpposition',
  'meteorShower', 'comet',
]);
const FESTIVITY_TYPES = new Set<string>([
  'newYear', 'chineseNewYear', 'diwali', 'holi', 'christmas', 'fireworks',
]);
const DAY_TYPES = new Set<string>(['solarEclipse', 'earthApsis']);
const GOLDEN_TYPES = new Set<string>([
  'solstice', 'equinox', 'seasonTransition', 'crossQuarter', 'solarTerm',
]);

/** Local hour each kind of notification fires at. */
const HOUR = { night: 20, day: 9, golden: 17, festivity: 9, milestone: 9, memory: 11 };

function celestialHour(type: string): number {
  if (DAY_TYPES.has(type)) return HOUR.day;
  if (GOLDEN_TYPES.has(type)) return HOUR.golden;
  return HOUR.night;
}

/** MM-DD slice of a `YYYY-MM-DD` string. */
const mmdd = (iso: string) => iso.slice(5, 10);
const year = (iso: string) => Number(iso.slice(0, 4));

export function selectNotifications(input: SelectInput): NotifyItem[] {
  const { events, localHour, localDate, groups, birthday, firstEntryDate, memoryYearsAgo } = input;
  const out: NotifyItem[] = [];
  const push = (key: string, msg: { title: string; body: string }, url = '/garden') =>
    out.push({ key, tag: key, url, ...msg });

  for (const ev of events) {
    if (groups.celestial && CELESTIAL_TYPES.has(ev.type) && localHour === celestialHour(ev.type)) {
      push(`celestial:${ev.id}`, celestialMessage(ev));
    }
    if (groups.festivities && FESTIVITY_TYPES.has(ev.type) && localHour === HOUR.festivity) {
      push(`festivity:${ev.id}`, festivityMessage(ev));
    }
  }

  if (groups.festivities && localHour === HOUR.milestone) {
    const today = mmdd(localDate);
    if (birthday && mmdd(birthday) === today) {
      push(`milestone:birthday:${year(localDate)}`, birthdayMessage());
    }
    if (firstEntryDate && mmdd(firstEntryDate) === today) {
      const years = year(localDate) - year(firstEntryDate);
      if (years >= 1) push(`milestone:anniversary:${year(localDate)}`, anniversaryMessage(years));
    }
  }

  if (groups.memory && memoryYearsAgo != null && memoryYearsAgo >= 1 && localHour === HOUR.memory) {
    push(`memory:${localDate}`, memoryMessage(memoryYearsAgo));
  }

  return out;
}
