/**
 * World-events catalog helpers for the /preview browser.
 *
 * Pure data/navigation glue over `@bloom/core/events`: flattens the precomputed
 * `events.json` into a sorted list, groups event types into friendly filter
 * buckets, and decides which sky phase / moon shape best shows each event so the
 * meadow can render its `SceneEffect`. No React, no rendering.
 */

import {
  eventsFileMeta,
  SCENE_EFFECT,
  type EventType,
  type Rarity,
  type SceneEffect,
  type WorldEvent,
} from '@bloom/core/events';

import type { PhaseKey } from './phases';

/** Every world event from events.json, sorted by date (then id for stability). */
export const ALL_WORLD_EVENTS: WorldEvent[] = Object.values(eventsFileMeta.byDate)
  .flat()
  .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id < b.id ? -1 : 1));

/** Friendly filter buckets over the raw `EventType` union. */
export const EVENT_GROUPS = {
  Moon: ['fullMoon', 'newMoon', 'supermoon', 'micromoon', 'blueMoon', 'blackMoon'],
  Eclipse: ['solarEclipse', 'lunarEclipse'],
  Meteors: ['meteorShower'],
  Comets: ['comet'],
  Seasons: ['solstice', 'equinox', 'seasonTransition', 'crossQuarter', 'solarTerm'],
  Planets: ['planetOpposition', 'earthApsis'],
  Calendar: ['fridayThe13th', 'leapDay'],
} as const satisfies Record<string, readonly EventType[]>;

export type EventGroup = keyof typeof EVENT_GROUPS;
export const EVENT_GROUP_NAMES = Object.keys(EVENT_GROUPS) as EventGroup[];

export const RARITIES: Rarity[] = ['common', 'uncommon', 'rare', 'epic'];

/** `null` group / rarity means "All". */
export function filterEvents(group: EventGroup | null, rarity: Rarity | null): WorldEvent[] {
  const types = group ? new Set<string>(EVENT_GROUPS[group]) : null;
  return ALL_WORLD_EVENTS.filter(
    (e) => (!types || types.has(e.type)) && (!rarity || e.rarity === rarity),
  );
}

/** Index of the first event on/after `isoDate`, else the last (events are date-sorted). */
export function nearestEventIndex(events: WorldEvent[], isoDate: string): number {
  if (events.length === 0) return 0;
  const i = events.findIndex((e) => e.date >= isoDate);
  return i === -1 ? events.length - 1 : i;
}

const TYPE_LABELS: Record<EventType, string> = {
  fullMoon: 'Full moon',
  newMoon: 'New moon',
  supermoon: 'Supermoon',
  micromoon: 'Micromoon',
  blueMoon: 'Blue moon',
  blackMoon: 'Black moon',
  lunarEclipse: 'Lunar eclipse',
  solarEclipse: 'Solar eclipse',
  solstice: 'Solstice',
  equinox: 'Equinox',
  seasonTransition: 'Season',
  crossQuarter: 'Cross-quarter',
  solarTerm: 'Solar term',
  earthApsis: 'Earth apsis',
  planetOpposition: 'Planet opposition',
  meteorShower: 'Meteor shower',
  comet: 'Comet',
  fridayThe13th: 'Friday the 13th',
  leapDay: 'Leap day',
  birthday: 'Birthday',
  appAnniversary: 'Anniversary',
};

export const eventTypeLabel = (type: EventType): string => TYPE_LABELS[type];

/** The renderable scene-effect token(s) for a single event (0 or 1). */
export function effectsForEvent(event: WorldEvent): SceneEffect[] {
  const token = SCENE_EFFECT[event.type];
  return token ? [token] : [];
}

const DAY_TYPES = new Set<EventType>(['solarEclipse', 'earthApsis']);
const GOLDEN_TYPES = new Set<EventType>([
  'solstice',
  'equinox',
  'seasonTransition',
  'crossQuarter',
  'solarTerm',
]);

/** The sky phase that best shows an event's effect. Defaults to night. */
export function phaseForEvent(event: WorldEvent): PhaseKey {
  if (DAY_TYPES.has(event.type)) return 'day';
  if (GOLDEN_TYPES.has(event.type)) return 'golden';
  return 'night';
}

const FULL_MOON_TYPES = new Set<EventType>([
  'fullMoon',
  'supermoon',
  'micromoon',
  'blueMoon',
  'lunarEclipse',
]);
const NEW_MOON_TYPES = new Set<EventType>(['newMoon', 'blackMoon']);

/** Moon-preset key (matching BloomMeadow's `MOON_PRESETS`) to match the event, or `null` to leave as-is. */
export function moonPresetForEvent(event: WorldEvent): 'full' | 'new' | null {
  if (FULL_MOON_TYPES.has(event.type)) return 'full';
  if (NEW_MOON_TYPES.has(event.type)) return 'new';
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Per-event visual detail. The base `effectsForEvent` token is the same for a
 * whole event type (every planetOpposition → brightStar, etc.); these helpers
 * read the richer `meta`/`title` so the meadow can tell otherwise-identical
 * events apart (which planet, near vs far apsis, how big the moon, its colour).
 * ──────────────────────────────────────────────────────────────────────────── */

export type Planet = 'Saturn' | 'Jupiter' | 'Mars';

/** The planet behind a `planetOpposition`, used to pick a distinct bright-star look. */
export function planetForEvent(event: WorldEvent): Planet | null {
  if (event.type !== 'planetOpposition') return null;
  const body = event.meta?.body;
  return body === 'Saturn' || body === 'Jupiter' || body === 'Mars' ? body : null;
}

/** Whether an `earthApsis` is the near (perihelion) or far (aphelion) point. */
export function apsisForEvent(event: WorldEvent): 'perihelion' | 'aphelion' | null {
  if (event.type !== 'earthApsis') return null;
  const au = event.meta?.distanceAu;
  return typeof au === 'number' ? (au < 1 ? 'perihelion' : 'aphelion') : null;
}

// events.json moon distances span perigee → apogee; the mean is the "normal" size.
const MOON_NEAR_KM = 356436; // closest (supermoon) → reads slightly larger
const MOON_AVG_KM = 384400; // mean lunar distance → normal size
const MOON_FAR_KM = 406514; // farthest (micromoon) → reads noticeably smaller

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Apparent moon size for an event, from `meta.distanceKm`. Normal-centred so a
 * typical full moon ≈ 1.0; perigee reads ~1% larger, apogee ~10% smaller — a
 * gentle exaggeration of the real perigee/apogee swing. Returns 1 when unknown.
 */
export function moonScaleForEvent(event: WorldEvent): number {
  const km = event.meta?.distanceKm;
  if (typeof km !== 'number') return 1;
  if (km <= MOON_AVG_KM) {
    return 1 + 0.01 * clamp01((MOON_AVG_KM - km) / (MOON_AVG_KM - MOON_NEAR_KM));
  }
  return 1 - 0.1 * clamp01((km - MOON_AVG_KM) / (MOON_FAR_KM - MOON_AVG_KM));
}

/** Apparent sun size for an `earthApsis` (perihelion bigger, aphelion smaller). 1 otherwise. */
export function sunScaleForEvent(event: WorldEvent): number {
  if (event.type !== 'earthApsis') return 1;
  const au = event.meta?.distanceAu;
  if (typeof au !== 'number') return 1;
  return Math.min(1.06, Math.max(0.94, 1 + (1 - au) * 3.5));
}

export interface MoonTint {
  light: string; // disc gradient — lit highlight
  mid: string; // disc gradient — body
  limb: string; // disc gradient — darkened edge
  crater: string; // crater/maria fill
  glow: string; // halo colour as "r,g,b"
}

/** Folk-name → characteristic tint. Only named full moons reach this; extend freely. */
const MOON_TINTS: Record<string, MoonTint> = {
  'Strawberry Moon': {
    light: '#f1dac9',
    mid: '#e3c1b0',
    limb: '#ccb1a9',
    crater: 'rgba(150,116,114,.34)',
    glow: '247,210,196',
  },
  'Harvest Moon': {
    light: '#f6e2bd',
    mid: '#eccb92',
    limb: '#d6ad72',
    crater: 'rgba(150,120,78,.34)',
    glow: '250,214,150',
  },
  "Hunter's Moon": {
    light: '#f6ddb2',
    mid: '#edc486',
    limb: '#d4a568',
    crater: 'rgba(150,112,70,.34)',
    glow: '250,206,140',
  },
};

/** The moon disc/halo tint for a named full moon (e.g. Strawberry Moon), or `null`. */
export function moonTintForEvent(event: WorldEvent): MoonTint | null {
  const name = event.meta?.name;
  return typeof name === 'string' ? MOON_TINTS[name] ?? null : null;
}
