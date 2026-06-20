/**
 * Bloom Journal — World Events Precompute (v2, location-agnostic)
 * --------------------------------------------------------------
 * Generates a static, GLOBAL `events.json`. No coordinates are baked in.
 * Location-dependent detail (solar-eclipse visibility, hemisphere-correct
 * season names) is added at runtime, only when the user grants location —
 * see `enrich-location.ts`.
 *
 *   Deps:  npm i astronomy-engine
 *   Run:   npx tsx precompute-events.ts
 */

// Default import (not `* as`): astronomy-engine ships as CJS, and under this repo's
// Node-ESM/tsx + webpack toolchain `import * as` collapses to `{ default }`, leaving
// Astronomy.MakeTime undefined. The default import (esModuleInterop) exposes all members.
import Astronomy from "astronomy-engine";
import { writeFileSync, readFileSync } from "node:fs";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export type EventType =
  | "fullMoon" | "newMoon" | "supermoon" | "micromoon" | "blueMoon" | "blackMoon"
  | "lunarEclipse" | "solarEclipse"
  | "solstice" | "equinox" | "seasonTransition" | "crossQuarter" | "solarTerm"
  | "earthApsis"
  | "planetOpposition"
  | "meteorShower" | "comet"
  | "fridayThe13th" | "leapDay"
  | "newYear" | "chineseNewYear" | "diwali" | "holi" | "christmas"
  | "fireworks"
  // runtime-only (never in this file):
  | "birthday" | "appAnniversary";

export type Rarity = "common" | "uncommon" | "rare" | "epic";

export interface WorldEvent {
  id: string;
  type: EventType;
  date: string;                                 // ISO date (UTC), YYYY-MM-DD
  instantUTC?: string;
  title: string;
  subtitle?: string;
  rarity: Rarity;
  activeRange?: { start: string; end: string };
  meta?: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const DAY_MS = 86_400_000;
const iso = (d: Date): string => d.toISOString().slice(0, 10);
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const ttOf = (d: Date) => Astronomy.MakeTime(d).tt;
const moonDistKm = (t: Astronomy.AstroTime): number => {
  const v = Astronomy.GeoMoon(t);
  return Math.hypot(v.x, v.y, v.z) * Astronomy.KM_PER_AU;
};

// ----------------------------------------------------------------------------
// Moon phases: full + new, with super/micro/blue/black + traditional names
// ----------------------------------------------------------------------------

interface PhaseHit { t: Astronomy.AstroTime; date: string; }

function collectPhase(phase: 0 | 180, startYear: number, endYear: number): PhaseHit[] {
  const hits: PhaseHit[] = [];
  let cursor: Astronomy.FlexibleDateTime = utc(startYear, 0, 1);
  const endTT = ttOf(utc(endYear + 1, 0, 1));
  for (;;) {
    const t = Astronomy.SearchMoonPhase(phase, cursor, 40);
    if (!t || t.tt >= endTT) break;
    hits.push({ t, date: iso(t.date) });
    cursor = new Date(t.date.getTime() + 10 * DAY_MS);
  }
  return hits;
}

const FULL_MOON_NAMES: Record<number, string> = {
  0: "Wolf Moon", 1: "Snow Moon", 2: "Worm Moon", 3: "Pink Moon",
  4: "Flower Moon", 5: "Strawberry Moon", 6: "Buck Moon", 7: "Sturgeon Moon",
  8: "Corn Moon", 9: "Hunter's Moon", 10: "Beaver Moon", 11: "Cold Moon",
};

function generateMoonEvents(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];

  // ---- Full moons ----
  const fulls = collectPhase(180, startYear, endYear);

  // Base traditional name by month; Harvest = full moon nearest Sept equinox.
  const names = fulls.map((f) => FULL_MOON_NAMES[f.t.date.getUTCMonth()]);
  for (let y = startYear; y <= endYear; y++) {
    const sep = Astronomy.Seasons(y).sep_equinox.tt;
    let bestIdx = -1, bestDelta = Infinity;
    fulls.forEach((f, i) => {
      const d = Math.abs(f.t.tt - sep);
      if (f.t.date.getUTCFullYear() === y && d < bestDelta) { bestDelta = d; bestIdx = i; }
    });
    if (bestIdx >= 0) {
      names[bestIdx] = "Harvest Moon";
      if (bestIdx + 1 < fulls.length) names[bestIdx + 1] = "Hunter's Moon";
    }
  }

  // Blue moon = 2nd full moon in the same calendar month.
  const fullByMonth: Record<string, number> = {};
  fulls.forEach((f, i) => {
    const key = f.date.slice(0, 7);
    fullByMonth[key] = (fullByMonth[key] ?? 0) + 1;
    const distKm = moonDistKm(f.t);
    const name = names[i] ?? "Full Moon"; // names is parallel to fulls; fallback satisfies noUncheckedIndexedAccess

    events.push({
      id: `fullMoon-${f.date}`, type: "fullMoon", date: f.date,
      instantUTC: f.t.date.toISOString(), title: name,
      subtitle: `Full moon · ${Math.round(distKm).toLocaleString()} km`,
      rarity: "common", meta: { name, distanceKm: Math.round(distKm) },
    });

    if (distKm <= 360_000) {
      events.push({
        id: `supermoon-${f.date}`, type: "supermoon", date: f.date,
        instantUTC: f.t.date.toISOString(), title: "Supermoon",
        subtitle: `${name} at perigee`, rarity: "rare",
        meta: { distanceKm: Math.round(distKm) },
      });
    } else if (distKm >= 405_000) {
      events.push({
        id: `micromoon-${f.date}`, type: "micromoon", date: f.date,
        instantUTC: f.t.date.toISOString(), title: "Micromoon",
        subtitle: `${name} at apogee`, rarity: "uncommon",
        meta: { distanceKm: Math.round(distKm) },
      });
    }
    if (fullByMonth[key] === 2) {
      events.push({
        id: `blueMoon-${f.date}`, type: "blueMoon", date: f.date,
        instantUTC: f.t.date.toISOString(), title: "Blue Moon",
        subtitle: "Second full moon this month", rarity: "rare",
      });
    }
  });

  // ---- New moons (dark-sky nights) + black moon ----
  const news = collectPhase(0, startYear, endYear);
  const newByMonth: Record<string, number> = {};
  news.forEach((n) => {
    const key = n.date.slice(0, 7);
    newByMonth[key] = (newByMonth[key] ?? 0) + 1;
    events.push({
      id: `newMoon-${n.date}`, type: "newMoon", date: n.date,
      instantUTC: n.t.date.toISOString(), title: "New Moon",
      subtitle: "Darkest skies", rarity: "common",
    });
    if (newByMonth[key] === 2) {
      events.push({
        id: `blackMoon-${n.date}`, type: "blackMoon", date: n.date,
        instantUTC: n.t.date.toISOString(), title: "Black Moon",
        subtitle: "Second new moon this month", rarity: "rare",
      });
    }
  });

  return events;
}

// ----------------------------------------------------------------------------
// Solstices & equinoxes (global instants)
// ----------------------------------------------------------------------------

function generateSeasonsAstro(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const s = Astronomy.Seasons(y);
    const rows: Array<[Astronomy.AstroTime, EventType, string]> = [
      [s.mar_equinox, "equinox", "March Equinox"],
      [s.jun_solstice, "solstice", "June Solstice"],
      [s.sep_equinox, "equinox", "September Equinox"],
      [s.dec_solstice, "solstice", "December Solstice"],
    ];
    for (const [t, type, title] of rows) {
      events.push({
        id: `${type}-${iso(t.date)}`, type, date: iso(t.date),
        instantUTC: t.date.toISOString(), title, rarity: "uncommon",
      });
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// Season transitions — HEMISPHERE-NEUTRAL. Both labels live in meta; the
// correct one is chosen at runtime from latitude (see enrich-location.ts).
// ----------------------------------------------------------------------------

function generateSeasonTransitions(startYear: number, endYear: number): WorldEvent[] {
  // [monthIndex, northernSeason, southernSeason]
  const defs: Array<[number, string, string]> = [
    [2, "Spring", "Autumn"],
    [5, "Summer", "Winter"],
    [8, "Autumn", "Spring"],
    [11, "Winter", "Summer"],
  ];
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (const [month, north, south] of defs) {
      const d = utc(y, month, 1);
      events.push({
        id: `seasonTransition-${north}-${y}`, type: "seasonTransition", date: iso(d),
        title: `First day of ${north}`,           // default display (Northern)
        subtitle: "Meteorological season start", rarity: "uncommon",
        meta: { convention: "meteorological", northern: north, southern: south },
      });
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// Cross-quarter days (Imbolc / Beltane / Lughnasadh / Samhain) at λ☉ 315/45/135/225
// ----------------------------------------------------------------------------

function generateCrossQuarters(startYear: number, endYear: number): WorldEvent[] {
  const defs: Array<[number, string, string, string]> = [
    [315, "Imbolc", "Spring", "Autumn"],
    [45, "Beltane", "Summer", "Winter"],
    [135, "Lughnasadh", "Autumn", "Spring"],
    [225, "Samhain", "Winter", "Summer"],
  ];
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const yearStart = utc(y, 0, 1);
    for (const [lon, name, north, south] of defs) {
      const t = Astronomy.SearchSunLongitude(lon, yearStart, 366);
      if (!t) continue;
      events.push({
        id: `crossQuarter-${name}-${y}`, type: "crossQuarter", date: iso(t.date),
        instantUTC: t.date.toISOString(), title: name,
        subtitle: "Cross-quarter day", rarity: "uncommon",
        meta: { lambdaSun: lon, northern: north, southern: south },
      });
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// 24 solar terms (opt-in). λ☉ every 15°, starting at 315 (Start of Spring).
// Note: λ☉ 0/90/180/270 coincide with the equinoxes/solstices already emitted.
// ----------------------------------------------------------------------------

const SOLAR_TERMS: Array<[number, string]> = [
  [315, "Start of Spring"], [330, "Rain Water"], [345, "Awakening of Insects"],
  [0, "Spring Equinox"], [15, "Pure Brightness"], [30, "Grain Rain"],
  [45, "Start of Summer"], [60, "Grain Buds"], [75, "Grain in Ear"],
  [90, "Summer Solstice"], [105, "Minor Heat"], [120, "Major Heat"],
  [135, "Start of Autumn"], [150, "End of Heat"], [165, "White Dew"],
  [180, "Autumn Equinox"], [195, "Cold Dew"], [210, "Frost's Descent"],
  [225, "Start of Winter"], [240, "Minor Snow"], [255, "Major Snow"],
  [270, "Winter Solstice"], [285, "Minor Cold"], [300, "Major Cold"],
];

function generateSolarTerms(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const yearStart = utc(y, 0, 1);
    for (const [lon, name] of SOLAR_TERMS) {
      const t = Astronomy.SearchSunLongitude(lon, yearStart, 366);
      if (!t) continue;
      events.push({
        id: `solarTerm-${lon}-${y}`, type: "solarTerm", date: iso(t.date),
        instantUTC: t.date.toISOString(), title: name,
        subtitle: "Solar term", rarity: "common",
        meta: { lambdaSun: lon },
      });
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// Earth perihelion / aphelion
// ----------------------------------------------------------------------------

function generateEarthApsides(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  const endTT = ttOf(utc(endYear + 1, 0, 1));
  let ap = Astronomy.SearchPlanetApsis(Astronomy.Body.Earth, Astronomy.MakeTime(utc(startYear, 0, 1)));
  while (ap.time.tt < endTT) {
    const peri = ap.kind === Astronomy.ApsisKind.Pericenter;
    events.push({
      id: `earthApsis-${iso(ap.time.date)}`, type: "earthApsis", date: iso(ap.time.date),
      instantUTC: ap.time.date.toISOString(),
      title: peri ? "Earth at Perihelion" : "Earth at Aphelion",
      subtitle: peri ? "Closest to the Sun" : "Farthest from the Sun",
      rarity: "common", meta: { distanceAu: +ap.dist_au.toFixed(5) },
    });
    ap = Astronomy.NextPlanetApsis(Astronomy.Body.Earth, ap);
  }
  return events;
}

// ----------------------------------------------------------------------------
// Planetary oppositions (Mars, Jupiter, Saturn). Opposition => relLon 0.
// ----------------------------------------------------------------------------

function generatePlanetOppositions(startYear: number, endYear: number): WorldEvent[] {
  const planets: Array<[Astronomy.Body, string, Rarity]> = [
    [Astronomy.Body.Mars, "Mars", "rare"],
    [Astronomy.Body.Jupiter, "Jupiter", "uncommon"],
    [Astronomy.Body.Saturn, "Saturn", "uncommon"],
  ];
  const events: WorldEvent[] = [];
  const endTT = ttOf(utc(endYear + 1, 0, 1));
  for (const [body, name, rarity] of planets) {
    let cursor: Astronomy.FlexibleDateTime = utc(startYear, 0, 1);
    for (;;) {
      const t = Astronomy.SearchRelativeLongitude(body, 0, cursor);
      if (!t || t.tt >= endTT) break;
      events.push({
        id: `opposition-${name}-${iso(t.date)}`, type: "planetOpposition", date: iso(t.date),
        instantUTC: t.date.toISOString(), title: `${name} at Opposition`,
        subtitle: "Brightest, visible all night", rarity,
        meta: { body: name },
      });
      cursor = new Date(t.date.getTime() + 30 * DAY_MS);
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// Lunar eclipses (visible from the entire night side — no location needed)
// ----------------------------------------------------------------------------

function generateLunarEclipses(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  const endTT = ttOf(utc(endYear + 1, 0, 1));
  let e = Astronomy.SearchLunarEclipse(utc(startYear, 0, 1));
  while (e.peak.tt < endTT) {
    const d = e.peak.date;
    events.push({
      id: `lunarEclipse-${iso(d)}`, type: "lunarEclipse", date: iso(d),
      instantUTC: d.toISOString(), title: "Lunar Eclipse",
      subtitle: `${cap(e.kind)} lunar eclipse`,
      rarity: e.kind === "total" ? "epic" : e.kind === "partial" ? "rare" : "uncommon",
      meta: { kind: e.kind, obscuration: e.obscuration },
    });
    e = Astronomy.NextLunarEclipse(e.peak);
  }
  return events;
}

// ----------------------------------------------------------------------------
// Solar eclipses — GLOBAL circumstances only. Local visibility is computed at
// runtime from the user's coords IF available (see enrich-location.ts).
// `greatestAt` is a property of the eclipse itself, not of any user.
// ----------------------------------------------------------------------------

function generateSolarEclipses(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  const endTT = ttOf(utc(endYear + 1, 0, 1));
  let g = Astronomy.SearchGlobalSolarEclipse(utc(startYear, 0, 1));
  while (g.peak.tt < endTT) {
    const d = g.peak.date;
    events.push({
      id: `solarEclipse-${iso(d)}`, type: "solarEclipse", date: iso(d),
      instantUTC: d.toISOString(), title: "Solar Eclipse",
      subtitle: `${cap(g.kind)} solar eclipse`,
      rarity: g.kind === "total" ? "epic" : "rare",
      meta: { globalKind: g.kind, greatestAt: { lat: g.latitude, lon: g.longitude } },
    });
    g = Astronomy.NextGlobalSolarEclipse(g.peak);
  }
  return events;
}

// ----------------------------------------------------------------------------
// Meteor showers — peak from solar longitude (λ☉). Global.
// ----------------------------------------------------------------------------

interface ShowerDef {
  code: string; name: string; lambdaSun: number; zhr: number;
  before: number; after: number; rarity: Rarity;
}
const METEOR_SHOWERS: ShowerDef[] = [
  { code: "QUA", name: "Quadrantids", lambdaSun: 283.15, zhr: 110, before: 2, after: 2, rarity: "rare" },
  { code: "LYR", name: "Lyrids", lambdaSun: 32.32, zhr: 18, before: 4, after: 4, rarity: "uncommon" },
  { code: "ETA", name: "Eta Aquariids", lambdaSun: 45.5, zhr: 50, before: 7, after: 7, rarity: "uncommon" },
  { code: "SDA", name: "Southern Delta Aquariids", lambdaSun: 127.0, zhr: 25, before: 7, after: 7, rarity: "common" },
  { code: "PER", name: "Perseids", lambdaSun: 140.0, zhr: 100, before: 7, after: 7, rarity: "rare" },
  { code: "ORI", name: "Orionids", lambdaSun: 208.0, zhr: 20, before: 6, after: 6, rarity: "uncommon" },
  { code: "LEO", name: "Leonids", lambdaSun: 235.27, zhr: 15, before: 4, after: 4, rarity: "uncommon" },
  { code: "GEM", name: "Geminids", lambdaSun: 262.2, zhr: 150, before: 4, after: 4, rarity: "rare" },
  { code: "URS", name: "Ursids", lambdaSun: 270.7, zhr: 10, before: 3, after: 3, rarity: "common" },
];

function generateMeteorShowers(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const yearStart = utc(y, 0, 1);
    for (const s of METEOR_SHOWERS) {
      const t = Astronomy.SearchSunLongitude(s.lambdaSun, yearStart, 366);
      if (!t) continue;
      const d = t.date;
      events.push({
        id: `meteor-${s.code}-${y}`, type: "meteorShower", date: iso(d),
        instantUTC: d.toISOString(), title: `${s.name} peak`,
        subtitle: `~${s.zhr}/hr at peak`, rarity: s.rarity,
        activeRange: { start: iso(new Date(d.getTime() - s.before * DAY_MS)),
                       end: iso(new Date(d.getTime() + s.after * DAY_MS)) },
        meta: { code: s.code, zhr: s.zhr, lambdaSun: s.lambdaSun },
      });
    }
  }
  return events;
}

// ----------------------------------------------------------------------------
// Friday the 13th, leap days
// ----------------------------------------------------------------------------

function generateFridayThe13ths(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++)
    for (let m = 0; m < 12; m++) {
      const d = utc(y, m, 13);
      if (d.getUTCDay() === 5)
        events.push({ id: `friday13-${iso(d)}`, type: "fridayThe13th", date: iso(d),
          title: "Friday the 13th", rarity: "uncommon" });
    }
  return events;
}

function generateLeapDays(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  for (let y = startYear; y <= endYear; y++)
    if (isLeap(y))
      events.push({ id: `leapDay-${y}`, type: "leapDay", date: iso(utc(y, 1, 29)),
        title: "Leap Day", rarity: "rare" });
  return events;
}

// ----------------------------------------------------------------------------
// Comets (curated; refresh periodically). Global.
// ----------------------------------------------------------------------------

interface CometSeed {
  designation: string; name: string; perihelion: string;
  peakDate?: string; peakMagnitude?: number; hemisphere?: string; note?: string;
}

function generateComets(seed: CometSeed[], startYear: number, endYear: number): WorldEvent[] {
  return seed
    .filter((c) => {
      const y = new Date(c.peakDate ?? c.perihelion).getUTCFullYear();
      return y >= startYear && y <= endYear;
    })
    .map((c) => {
      const date = (c.peakDate ?? c.perihelion).slice(0, 10);
      const mag = c.peakMagnitude ?? 99;
      const rarity: Rarity = mag <= 3 ? "epic" : mag <= 6 ? "rare" : "uncommon";
      return {
        id: `comet-${c.designation.replace(/[^\w]+/g, "-")}`, type: "comet" as const,
        date, title: c.name,
        subtitle: c.peakMagnitude != null ? `~mag ${c.peakMagnitude}` : "Comet apparition",
        rarity, meta: { designation: c.designation, peakMagnitude: c.peakMagnitude,
          hemisphere: c.hemisphere, note: c.note },
      };
    });
}

// ----------------------------------------------------------------------------
// Festive holidays
//   - New Year (Jan 1) and Christmas (Dec 25) are fixed Gregorian dates.
//   - Chinese New Year, Diwali, Holi follow lunisolar calendars with no compact
//     closed-form, so their dates are curated in holidays.seed.json (refresh
//     periodically), mirroring comets.seed.json. All pure-calendar (no instant).
// ----------------------------------------------------------------------------

function generateNewYear(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const d = utc(y, 0, 1);
    events.push({
      id: `newYear-${y}`, type: "newYear", date: iso(d),
      title: "New Year", subtitle: "Festive fireworks", rarity: "epic",
    });
  }
  return events;
}

function generateChristmas(startYear: number, endYear: number): WorldEvent[] {
  const events: WorldEvent[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const d = utc(y, 11, 25);
    events.push({
      id: `christmas-${y}`, type: "christmas", date: iso(d),
      title: "Christmas", subtitle: "Star of Bethlehem", rarity: "common",
    });
  }
  return events;
}

interface HolidaySeed {
  type: "chineseNewYear" | "diwali" | "holi";
  date: string; // YYYY-MM-DD
}

const HOLIDAY_TITLE: Record<HolidaySeed["type"], string> = {
  chineseNewYear: "Chinese New Year",
  diwali: "Diwali",
  holi: "Holi",
};
const HOLIDAY_RARITY: Record<HolidaySeed["type"], Rarity> = {
  chineseNewYear: "epic",
  diwali: "epic",
  holi: "rare",
};

function generateLunisolarHolidays(seed: HolidaySeed[], startYear: number, endYear: number): WorldEvent[] {
  return seed
    .filter((h) => {
      const y = +h.date.slice(0, 4);
      return y >= startYear && y <= endYear;
    })
    .map((h) => ({
      id: `${h.type}-${h.date}`, type: h.type as EventType, date: h.date,
      title: HOLIDAY_TITLE[h.type], subtitle: "Festive fireworks",
      rarity: HOLIDAY_RARITY[h.type],
    }));
}

interface FireworksOneOffSeed {
  date: string;   // YYYY-MM-DD — year-scoped so it fires only in that year
  title: string;
}

function generateOneOffFireworks(seed: FireworksOneOffSeed[], startYear: number, endYear: number): WorldEvent[] {
  return seed
    .filter((f) => {
      const y = +f.date.slice(0, 4);
      return y >= startYear && y <= endYear;
    })
    .map((f) => ({
      id: `fireworks-${f.date}`, type: "fireworks" as EventType, date: f.date,
      title: f.title, subtitle: "Festive fireworks", rarity: "rare",
    }));
}

// ----------------------------------------------------------------------------
// Orchestration
// ----------------------------------------------------------------------------

interface GeneratorOptions {
  startYear: number;
  endYear: number;
  includeSolarTerms?: boolean; // opt-in: 24 terms/year, on-theme but verbose
}

function generateAll(
  opts: GeneratorOptions,
  comets: CometSeed[],
  holidays: HolidaySeed[],
  fireworksOneOffs: FireworksOneOffSeed[],
): WorldEvent[] {
  const { startYear: s, endYear: e, includeSolarTerms } = opts;
  const out: WorldEvent[] = [
    ...generateMoonEvents(s, e),
    ...generateLunarEclipses(s, e),
    ...generateSolarEclipses(s, e),
    ...generateSeasonsAstro(s, e),
    ...generateSeasonTransitions(s, e),
    ...generateCrossQuarters(s, e),
    ...generateEarthApsides(s, e),
    ...generatePlanetOppositions(s, e),
    ...generateMeteorShowers(s, e),
    ...generateFridayThe13ths(s, e),
    ...generateLeapDays(s, e),
    ...generateComets(comets, s, e),
    ...generateNewYear(s, e),
    ...generateChristmas(s, e),
    ...generateLunisolarHolidays(holidays, s, e),
    ...generateOneOffFireworks(fireworksOneOffs, s, e),
  ];
  if (includeSolarTerms) out.push(...generateSolarTerms(s, e));
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}

function indexByDate(events: WorldEvent[]): Record<string, WorldEvent[]> {
  const map: Record<string, WorldEvent[]> = {};
  for (const ev of events) (map[ev.date] ??= []).push(ev);
  return map;
}

function main() {
  const START_YEAR = 2024;
  const END_YEAR = 2050;

  const comets: CometSeed[] = JSON.parse(
    readFileSync(new URL("./comets.seed.json", import.meta.url), "utf8"));
  const holidays: HolidaySeed[] = JSON.parse(
    readFileSync(new URL("./holidays.seed.json", import.meta.url), "utf8"));
  const fireworksOneOffs: FireworksOneOffSeed[] = JSON.parse(
    readFileSync(new URL("./fireworks-oneoffs.seed.json", import.meta.url), "utf8"));

  const events = generateAll(
    { startYear: START_YEAR, endYear: END_YEAR, includeSolarTerms: false },
    comets, holidays, fireworksOneOffs);

  writeFileSync(new URL("./events.json", import.meta.url), JSON.stringify({
    generatedAt: new Date().toISOString(),
    range: { startYear: START_YEAR, endYear: END_YEAR },
    scope: "global",                       // no coordinates baked in
    byDate: indexByDate(events),
  }, null, 2));

  console.log(`Wrote ${events.length} global events to events.json (${START_YEAR}–${END_YEAR}).`);
}

main();
