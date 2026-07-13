'use client';

/**
 * Bloom Meadow — a faithful port of the reference artifact
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`, spec `bloom-meadow-spec.md`),
 * wired to the user's real journal entries. Differences from the reference, per product
 * decisions on branch feature/ui-2:
 *   · `live` mode (the real /garden) drives the sky phase from the local clock and the
 *     weather from the Open-Meteo API, with the manual controls hidden. Otherwise (the
 *     /preview playground) manual phase pills + a weather selector are shown.
 *   · Ambient creatures (butterflies, fox, shooting stars, cloud shadow) are omitted.
 *   · The memory-card modal is extended with Open / Favourite / Revisit / Delete actions.
 */
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EntryRecord } from '@bloom/core';
import { findMemoryReplay, formatMemoryReplayDismissKey, isMemoryReplayDismissed } from '@bloom/core';
import {
  bucketPhaseName,
  getLightningIntervalMs,
  getMoonPhase,
  getMoonPhaseShadowSvgPath,
  getRainDropDurationSec,
  getRainLayerOpacity,
  getRainWindSlantDeg,
  isPrecipitatingCategory,
  shouldShowLightning,
  type MoonPhaseState,
  type WeatherCategory,
  type WeatherState,
} from '@bloom/core/scene';

import { Flower } from '@/components/flower/Flower';
import { GrassTuft, makeHill, Ram, Sheep, Tree } from '@/components/garden/bloom/scenery';
import {
  Butterfly,
  CREATURE_KEYFRAMES,
  Duck,
  Fox,
  SoloBird,
  WINGS,
  type DuckFlightState,
  type FlockState,
  type FoxState,
  type ShootState,
  type SoloBirdState,
} from '@/components/garden/bloom/creatures';
import { ShootingStar, CometVisual, SHOOTING_STAR_KEYFRAMES, COMET_KEYFRAMES, SHOOTING_STAR_ANGLE, COMET_ANGLE, cometSpawnGeom } from '@/components/garden/bloom/shooting-star-visual';
import { buildMeadowLayout, type PlacedEntry } from '@/lib/garden/bloom/layout';
import { MOODS } from '@/lib/garden/bloom/moods';
import {
  agoLabel,
  fmtFull,
  fmtShort,
  isAnniv,
  MONTH_ABBR,
  MONTH_NAMES,
  celestialAt,
  PHASE_ORDER,
  PHASE_PRETTY,
  PHASES,
  phaseFromHour,
  type PhaseKey,
} from '@/lib/garden/bloom/phases';
import { isDifficultMood, ramAppearanceChance, ramDayRoll, ramX } from '@/lib/garden/bloom/ram';
import { mulberry32 } from '@/lib/garden/bloom/rng';
import { seasonGrass, seasonHill, seasonLookForDate } from '@/lib/garden/bloom/season';
import { readMemoryReplayDismiss, writeMemoryReplayDismiss } from '@/lib/memory-replay/dismiss';
import { DUCK_FLIGHT, duckSessionChance, SOLO_BIRDS, soloBirdChance } from '@/lib/garden/bloom/ducks';
import { SPECIAL_STAR } from '@/lib/garden/bloom/shooting-star';
import {
  apsisForEvent,
  effectsForEvent,
  filterEvents,
  moonPresetForEvent,
  moonScaleForEvent,
  moonTintForEvent,
  nearestEventIndex,
  nextWorldEvent,
  phaseForEvent,
  planetForEvent,
  sunScaleForEvent,
  type EventGroup,
  type Planet,
} from '@/lib/garden/bloom/event-catalog';
import { EventEffectsLayer } from '@/components/garden/bloom/EventEffectsLayer';
import { EventStepper } from '@/components/garden/bloom/EventStepper';
import { PreviewRail } from '@/components/garden/bloom/PreviewRail';
import { WeatherChip } from '@/components/garden/bloom/WeatherChip';
import { SeasonalParticles, SEASON_PARTICLE_KEYFRAMES } from '@/components/garden/bloom/SeasonalParticles';
import type { Rarity, SceneEffect, WorldEvent } from '@bloom/core/events';
import { softDelete, toggleFavourite } from '@/lib/db/repositories/entries';
import { useBloomStore } from '@/stores/useBloomStore';

import { glass, sans, serif } from '@/components/garden/bloom/chrome';

/** Glow-dot colour for the live event label, by rarity (mirrors EventStepper's fg tones). */
const RARITY_DOT: Record<Rarity, string> = {
  common: '#e7e4d6',
  uncommon: '#bfe6b0',
  rare: '#bcd2ff',
  epic: '#ffd98a',
};

/** "2026-08-12" → "12 Aug" (year-less, timezone-safe — no Date parsing). */
const fmtEventDate = (iso: string): string => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${MONTH_ABBR[Number(m) - 1] ?? m}`;
};

const G = 150; // ground strip height
// Snow-covered parallax hills (back → front). Hazy blue in the distance,
// fading to near-white up close, so the back range reads as snowy peaks.
const SNOW_HILLS: [string, string, string] = ['#b6cde7', '#d3e2f3', '#edf4fc'];
// Sheep coats: fleece + matching belly shade + point (face/leg) colour. Most sheep are cream with
// charcoal points; the rarer grey (Gotland-style silver fleece, near-black points) and
// chestnut-brown (warm tan-brown points) breeds mix in at about one in six each.
type SheepCoat = { wool: string; shade: string; dark: string };
const CREAM_COATS: SheepCoat[] = [
  { wool: '#f4f0e8', shade: '#dcd5c6', dark: '#43444b' },
  { wool: '#efe8d9', shade: '#dcd5c6', dark: '#43444b' },
  { wool: '#f7f3ea', shade: '#dcd5c6', dark: '#43444b' },
  { wool: '#e9e2d3', shade: '#dcd5c6', dark: '#43444b' },
];
const GREY_COATS: SheepCoat[] = [
  { wool: '#c9cdd4', shade: '#a9aeb8', dark: '#33363d' },
  { wool: '#b6bbc4', shade: '#979da8', dark: '#2d3037' },
];
const BROWN_COATS: SheepCoat[] = [
  { wool: '#b5824c', shade: '#96683a', dark: '#5a4030' },
  { wool: '#a06d3f', shade: '#845933', dark: '#4f3629' },
];
// Rendered size of each meadow bloom. The `Flower` SVG is square with the
// plant bottom-aligned + horizontally centered, so centering it on the 120×170
// flower button seats the stem at the button's bottom-center (60,170) — the
// same point the sway wrapper rotates around. Tuned visually.
const FLOWER_SIZE = 168;
// Bloom-head center (from the flower button's top) + the diameter of the round
// click target placed over it. Only this circle is interactive, so dense flowers
// no longer overlap via big empty rectangles — you click the bloom, not the stem.
const HEAD_Y = 60;
const HIT = 92;

// Default moon-disc palette (sphere-shaded). Named full moons (e.g. Strawberry)
// override this via `moonTintForEvent`; everything else uses this neutral set.
const NEUTRAL_MOON = {
  light: '#fbf7e6',
  mid: '#ece4c8',
  limb: '#d4ccae',
  crater: 'rgba(150,146,118,.42)',
};

/**
 * Fixed moon-phase presets for the preview controls. `phase: null` follows the real current moon;
 * the others pin a synodic fraction (0 = new, 0.5 = full) so each lit shape can be inspected.
 */
const MOON_PRESETS: { key: string; label: string; phase: number | null }[] = [
  { key: 'live', label: 'Live moon', phase: null },
  { key: 'new', label: 'New', phase: 0 },
  { key: 'crescent', label: 'Crescent', phase: 0.12 },
  { key: 'quarter', label: 'Quarter', phase: 0.25 },
  { key: 'gibbous', label: 'Gibbous', phase: 0.4 },
  { key: 'full', label: 'Full', phase: 0.5 },
];

/** Build a `MoonPhaseState` from a synodic fraction, mirroring `getMoonPhase`'s derivation. */
const moonStateFromPhase = (phase: number): MoonPhaseState => ({
  phase,
  illumination: 0.5 * (1 - Math.cos(2 * Math.PI * phase)),
  name: bucketPhaseName(phase),
  waxing: phase < 0.5,
});

/** Join time/weather/place into the reference's ` · `-separated snapshot line. */
const snapshotLine = (timePhase: PhaseKey, weather: string, place: string | null) =>
  [PHASE_PRETTY[timePhase], weather, place].filter(Boolean).join(' · ');

/** Collapse whitespace + truncate, for compact labels when an entry has no title. */
const snippet = (s: string, n = 60) => {
  const t = (s ?? '').trim().replace(/\s+/g, ' ');
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

export function BloomMeadow({
  entries,
  preview = false,
  creatures = false,
  live = false,
  canExplore = false,
  liveWeather = null,
  latitude = 0,
  specialStar = false,
  liveSceneEffects = [],
  livePlanet = null,
  liveEvent = null,
}: {
  entries: EntryRecord[];
  preview?: boolean;
  /** Enable the ambient creatures + "Scenes" control (preview playground only). */
  creatures?: boolean;
  /** Realtime mode (/garden): clock-driven phase + real weather, manual controls hidden. */
  live?: boolean;
  /** Show the 3D "Explore" entry pill (admin-only surface — gated by the caller). */
  canExplore?: boolean;
  /** Live weather from `useWeather()`, used only when `live`. */
  liveWeather?: WeatherState | null;
  /** Viewer latitude — orients the moon-phase shadow (S. hemisphere flips it). */
  latitude?: number;
  /** Today is a special day: send a shooting star ~30s after open + occasional repeats (live only). */
  specialStar?: boolean;
  /** Scene effects for today's world events (live /garden only). */
  liveSceneEffects?: SceneEffect[];
  /** Which planet (if any) is at opposition today, for the live bright-star look. */
  livePlanet?: Planet | null;
  /** Today's headline world event (live /garden only), surfaced as a subtle named label. */
  liveEvent?: WorldEvent | null;
}) {
  const router = useRouter();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const setMemoryCardOpen = useBloomStore((s) => s.setMemoryCardOpen);

  const [phaseKey, setPhaseKey] = useState<PhaseKey>(() => phaseFromHour(new Date().getHours()));
  const [liveNow, setLiveNow] = useState(() => new Date());
  const [moonPreset, setMoonPreset] = useState('live'); // fixed moon-phase override (preview only)
  const [weatherCat, setWeatherCat] = useState<WeatherCategory>('clear');
  // Sheep tuning: `arrangement` scatters (default) or forces a flock; `sheepSeed` re-rolls the
  // random count + positions; `sheepRainHide` toggles the hide-in-precip behaviour. Only the
  // preview playground surfaces controls for these — the live garden uses the defaults.
  const [arrangement, setArrangement] = useState<'scattered' | 'flock'>('scattered');
  const [sheepSeed, setSheepSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const [sheepRainHide, setSheepRainHide] = useState(true);
  const [flash, setFlash] = useState(0); // lightning trigger (re-keys the flash overlay)
  const [active, setActive] = useState<PlacedEntry | null>(null);
  const [activeFav, setActiveFav] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(0);
  const [replay, setReplay] = useState<PlacedEntry | null>(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [vh, setVh] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [grabbing, setGrabbing] = useState(false);
  const [eventDetail, setEventDetail] = useState(false); // live event label: reveal its subtitle on tap

  /* ambient creatures (preview playground only) */
  const [bflies, setBflies] = useState<FlockState | null>(null);
  const [fox, setFox] = useState<FoxState | null>(null);
  const [cshadow, setCshadow] = useState<{ run: number } | null>(null);
  const [shoot, setShoot] = useState<ShootState | null>(null);
  const [ducks, setDucks] = useState<DuckFlightState | null>(null);
  const [birds, setBirds] = useState<SoloBirdState | null>(null);

  /* world-events browser (sky playground only) */
  const [eventMode, setEventMode] = useState(false);
  const [evGroup, setEvGroup] = useState<EventGroup | null>(null);
  const [evRarity, setEvRarity] = useState<Rarity | null>(null);
  const [evIndex, setEvIndex] = useState(0);
  const [cometLaunch, setCometLaunch] = useState(0);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const hillRefs = [useRef<SVGSVGElement>(null), useRef<SVGSVGElement>(null), useRef<SVGSVGElement>(null)];
  const drag = useRef({ down: false, x: 0, sl: 0, moved: 0 });
  const ticking = useRef(false);

  // Ambient-scene spawn functions (below) each schedule their own setTimeouts independent of
  // the ambient-loop effects that trigger them; safeTimeout tracks every one so an unmount
  // mid-flight (or mid manual-trigger) doesn't set state on an unmounted component.
  const pendingTimers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const safeTimeout = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      pendingTimers.current.delete(id);
      fn();
    }, ms);
    pendingTimers.current.add(id);
    return id;
  }, []);
  useEffect(() => {
    const timers = pendingTimers.current;
    return () => {
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, []);

  const phase = PHASES[phaseKey];
  /* month-aware seasonal look — composes over the phase palettes at render time
     (PHASES stays untouched); winter is a no-op and storm snow always wins */
  const seasonLook = useMemo(() => seasonLookForDate(liveNow), [liveNow]);

  /* live mode: sun/moon positions drift continuously with the clock; preview snaps to keyframes */
  const cel = live ? celestialAt(liveNow) : null;
  const sunPos = cel?.sun ?? phase.sun;
  const moonPos = cel?.moon ?? phase.moon;
  /* lunar phase shadow: a fixed preview override, else the real current phase (nudged each minute) */
  const moonState = useMemo(() => {
    const preset = MOON_PRESETS.find((p) => p.key === moonPreset);
    if (preset && preset.phase !== null) return moonStateFromPhase(preset.phase);
    return getMoonPhase(live ? liveNow : new Date());
  }, [moonPreset, live, liveNow]);
  const moonShadow = getMoonPhaseShadowSvgPath(48, moonState, latitude);

  /* effective weather: live → real API category; otherwise the manual selection */
  const cat: WeatherCategory = live ? liveWeather?.category ?? 'clear' : weatherCat;
  const windSpeed = live ? liveWeather?.windSpeed ?? 0 : 0;
  const precip = isPrecipitatingCategory(cat); // drizzle | rain | heavy_rain | thunderstorm
  const heavyRain = cat === 'heavy_rain'; // gates the lone ram's night-only 20% chance
  const isSnow = cat === 'snow';
  const sheepHidden = precip || isSnow; // the flock shelters out of sight in wet/snowy weather
  const isStormy = shouldShowLightning(cat); // thunderstorm | heavy_rain
  const rainFx = getRainLayerOpacity(cat); // { sheet, drop }
  const rainDur = getRainDropDurationSec(cat, 'near'); // { min, max } seconds
  const rainSlant = getRainWindSlantDeg(windSpeed); // degrees
  // Cloud-cover veil: fog reads as a pale haze; overcast/rain a grey wash; storms a dark gloom.
  const hazeOpacity =
    cat === 'fog' ? 0.5
    : cat === 'overcast' ? 0.34
    : cat === 'heavy_rain' || cat === 'thunderstorm' ? 0.42
    : cat === 'rain' || cat === 'drizzle' ? 0.22
    : cat === 'partly_cloudy' ? 0.16
    : 0;
  // Thicken (and, in storms, multiply) the drifting clouds as the sky closes in.
  const cloudBoost = isStormy ? 1.75 : cat === 'overcast' || precip ? 1.45 : cat === 'partly_cloudy' || cat === 'fog' ? 1.2 : 1;
  // Heavier skies show more clouds; storms the most.
  const visibleClouds = isStormy ? 9 : cat === 'overcast' || precip || isSnow ? 7 : 5;

  const layout = useMemo(() => buildMeadowLayout(entries), [entries]);
  // The meadow world is at least as wide as the viewport so the ground/grass span
  // the full screen even when there are only a few months of entries.
  const worldW = Math.max(layout.W, vw);

  /* world-events browser: available only in the flowerless sky playground (/preview) */
  const eventsBrowser = preview && !live && layout.entries.length === 0;
  // Track the live clock so the "next event" hint and comet session key roll over at midnight on a
  // long-open garden (liveNow ticks each minute in live mode; in preview it's set once at mount).
  const todayIso = useMemo(() => liveNow.toISOString().slice(0, 10), [liveNow]);
  // Subtle "what's coming" hint for the live garden: the next world event strictly after today
  // (today's event, if any, is already painted in the sky). Date only — no name, not interactive.
  const nextEvent = useMemo(() => (live ? nextWorldEvent(todayIso) : null), [live, todayIso]);
  const filteredEvents = useMemo(() => filterEvents(evGroup, evRarity), [evGroup, evRarity]);
  const selectedEvent =
    filteredEvents.length > 0 ? filteredEvents[Math.min(evIndex, filteredEvents.length - 1)] ?? null : null;
  const eventEffects = useMemo(
    () => (eventMode && selectedEvent ? effectsForEvent(selectedEvent) : []),
    [eventMode, selectedEvent],
  );
  // Live garden: render today's effects, but only the night-sky ones (fireworks, Christmas
  // star, planet, comet) when the app is actually at dusk/night — those visuals read only
  // after dark. Moon/sun/etc. tokens stay preview-only to keep their tuning unchanged in live
  // mode. `phaseKey` itself always tracks the real clock (see the live-clock effect below) —
  // a comet event only widens the sky's canvas, it never overrides what time it actually is.
  const atNight = phaseKey === 'night' || phaseKey === 'dusk';
  const liveRenderedEffects = useMemo(() => {
    if (!live) return [];
    const NIGHT_ONLY: SceneEffect[] = ['fireworks', 'christmasStar', 'brightStar'];
    return liveSceneEffects.filter((e) => (NIGHT_ONLY.includes(e) ? atNight : false));
  }, [live, liveSceneEffects, atNight]);
  const showComet =
    (eventsBrowser && eventMode && eventEffects.includes('cometArc')) ||
    (live && liveSceneEffects.includes('cometArc') && atNight);
  const cometSessionKey =
    eventsBrowser && eventMode && eventEffects.includes('cometArc') && selectedEvent
      ? selectedEvent.id
      : live && liveSceneEffects.includes('cometArc')
        ? todayIso
        : null;
  const cometGeom = useMemo(() => {
    const spawn = cometSpawnGeom(vw, vh);
    return {
      x: spawn.x,
      y: spawn.y,
      ang: COMET_ANGLE,
      len: 920,
      dist: spawn.dist,
      dur: 900,
      delay: 0,
    };
  }, [vw, vh]);
  /* per-event sun/moon detail — only in the preview events browser; neutral everywhere else */
  const evActive = eventsBrowser && eventMode && selectedEvent ? selectedEvent : null;
  const evMoonScale = evActive ? moonScaleForEvent(evActive) : 1;
  const evSunScale = evActive ? sunScaleForEvent(evActive) : 1;
  const evMoonTint = evActive ? moonTintForEvent(evActive) : null;
  const evPlanet = evActive ? planetForEvent(evActive) : null;
  const evApsis = evActive ? apsisForEvent(evActive) : null;
  const moonBody = evMoonTint ?? NEUTRAL_MOON;
  /** Re-seat the stepper near today whenever the filter set changes. */
  const pickGroup = (g: EventGroup | null) => {
    setEvGroup(g);
    setEvIndex(nearestEventIndex(filterEvents(g, evRarity), todayIso));
  };
  const pickRarity = (r: Rarity | null) => {
    setEvRarity(r);
    setEvIndex(nearestEventIndex(filterEvents(evGroup, r), todayIso));
  };
  const toggleEvents = () => {
    setEventMode((on) => {
      if (!on) {
        const idx = nearestEventIndex(filteredEvents, todayIso);
        setEvIndex(idx);
        const ev = filteredEvents[idx] ?? null;
        if (ev) {
          setPhaseKey(phaseForEvent(ev));
          const mp = moonPresetForEvent(ev);
          if (mp) setMoonPreset(mp);
          if (effectsForEvent(ev).includes('cometArc')) setCometLaunch((n) => n + 1);
        }
      }
      return !on;
    });
  };

  /* ambient particle fields (deterministic) */
  const stars = useMemo(() => {
    const r = mulberry32(777);
    return [...Array(90)].map((_, i) => ({ id: i, x: r() * 100, y: r() * 62, s: 1 + r() * 1.6, d: 2.2 + r() * 3.4, dl: -r() * 5 }));
  }, []);
  const fireflies = useMemo(() => {
    const r = mulberry32(424);
    return [...Array(12)].map((_, i) => ({ id: i, x: 6 + r() * 88, y: 48 + r() * 38, d: 5 + r() * 6, dl: -r() * 8 }));
  }, []);
  const pollen = useMemo(() => {
    const r = mulberry32(909);
    return [...Array(14)].map((_, i) => ({ id: i, x: r() * 100, y: 35 + r() * 50, s: 2.4 + r() * 2.6, d: 9 + r() * 8, dl: -r() * 12 }));
  }, []);
  const drops = useMemo(() => {
    const r = mulberry32(313);
    return [...Array(70)].map((_, i) => ({ id: i, x: r() * 100, h: 22 + r() * 26, t: r(), dl: -r() * 2 }));
  }, []);
  const flakes = useMemo(() => {
    const r = mulberry32(818);
    return [...Array(60)].map((_, i) => ({ id: i, x: r() * 100, s: 3 + r() * 4, d: 6 + r() * 6, dl: -r() * 9 }));
  }, []);
  const clouds = useMemo(() => {
    const r = mulberry32(551);
    // Pool of 9; the first 5 are identical to before (same seed) so clear skies are unchanged.
    return [...Array(9)].map((_, i) => ({ id: i, top: 4 + r() * 26, w: 180 + r() * 150, d: 90 + r() * 80, dl: -r() * 120, o: 0.55 + r() * 0.3 }));
  }, []);
  const tufts = useMemo(() => {
    const r = mulberry32(212);
    const n = Math.floor(worldW / 46);
    return [...Array(n)].map((_, i) => {
      const bottom = r() * 26;
      return { id: i, left: i * 46 + r() * 30, bottom, sc: 0.7 + r() * 0.75, dur: 2.6 + r() * 2.4, dl: -r() * 4, z: 100 + Math.round((26 - bottom) * 1.8) };
    });
  }, [worldW]);

  /* hills (sized to viewport + parallax factor) */
  const hills = useMemo(() => {
    const defs = [
      { f: 0.16, base: 168, amp: 50, seed: 11 },
      { f: 0.32, base: 116, amp: 64, seed: 23 },
      { f: 0.55, base: 64, amp: 72, seed: 37 },
    ];
    // Flock size derived from `sheepSeed` so a re-roll changes the count too: 4–6 base plus a
    // gentle bonus as the garden grows (~+1 per 4 months of entries), capped at 9. Split across
    // the two populated hills (near hill weighted); the far hill (f<=0.2) stays empty.
    const flockRng = mulberry32(sheepSeed || 1);
    const flockSize = Math.min(9, 4 + Math.floor(flockRng() * 3) + Math.floor(layout.W / 2400));
    const frontCount = Math.max(1, Math.round(flockSize * 0.6));
    const sheepByHill = [0, flockSize - frontCount, frontCount]; // by def index
    return defs.map((h, idx) => {
      const Wl = layout.W * h.f + vw + 500;
      const built = makeHill(h.seed, Wl, 340, h.base, h.amp);
      const tr = mulberry32(h.seed * 7);
      const trees =
        h.f > 0.2
          ? [...Array(h.f > 0.4 ? 6 : 4)].map((_, i) => {
              const x = 140 + tr() * (Wl - 280);
              return { id: i, x, y: built.yAt(x) + 4, sc: h.f > 0.4 ? 0.85 + tr() * 0.5 : 0.5 + tr() * 0.3 };
            })
          : [];
      const sh = mulberry32(h.seed * 13 + 1 + sheepSeed); // re-roll shifts positions
      const count = sheepByHill[idx]!;
      const anchorX = 160 + sh() * (Wl - 320); // shared anchor, only used in flock mode
      // Scattered mode gathers adults into 1–2 loose grazing knots (plus the odd loner) instead
      // of a uniform sprinkle; two knots get pushed apart so they read as separate groups.
      const knots = [...Array(count >= 4 ? 2 : 1)].map(() => 240 + sh() * (Wl - 480));
      for (let t = 0; knots.length === 2 && Math.abs(knots[1]! - knots[0]!) < 360 && t < 6; t++)
        knots[1] = 240 + sh() * (Wl - 480);
      const xs: number[] = [];
      const adultXs: number[] = [];
      const coats: SheepCoat[] = [];
      let lastEwe = -1; // index of the nearest preceding adult (i=0 is always an adult)
      const eweTaken: boolean[] = []; // eweTaken[i] = true once sheep i already has a lamb beside it
      const sheep = [...Array(count)].map((_, i) => {
        const baseSc = h.f > 0.4 ? 0.55 + sh() * 0.25 : 0.4 + sh() * 0.16;
        // A lamb always hugs a free ewe (a preceding adult with no lamb yet), so lambs never pile
        // on one another. If the nearest ewe already has a lamb, this one becomes an adult instead.
        // Flock: everyone clusters around the one anchor.
        const wantLamb = i > 0 && sh() < 0.4;
        let x: number;
        let isLamb = false;
        if (arrangement === 'flock') {
          x = anchorX + (sh() - 0.5) * 90;
        } else if (wantLamb && lastEwe >= 0 && !eweTaken[lastEwe]) {
          isLamb = true;
          eweTaken[lastEwe] = true;
          x = xs[lastEwe]! + (sh() < 0.5 ? -1 : 1) * (14 + sh() * 10);
        } else {
          // Adult: ~15% wander off alone; the rest joins a knot with centre-weighted jitter.
          // Re-rolled a few times if it lands within 28px of another adult, so nobody overlaps.
          const roll = () =>
            sh() < 0.15
              ? 160 + sh() * (Wl - 320)
              : knots[Math.floor(sh() * knots.length)]! + (sh() + sh() - 1) * 75;
          x = roll();
          for (let t = 0; t < 6 && adultXs.some((px) => Math.abs(px - x) < 28); t++) x = roll();
        }
        // Coat: the rarer grey and chestnut-brown breeds (~1 in 6 each), else a cream tint.
        // A lamb wears its ewe's coat so families match.
        const breed = sh();
        const coat: SheepCoat = isLamb
          ? coats[lastEwe]!
          : breed < 1 / 6
            ? BROWN_COATS[Math.floor(sh() * BROWN_COATS.length)]!
            : breed < 1 / 3
              ? GREY_COATS[Math.floor(sh() * GREY_COATS.length)]!
              : CREAM_COATS[Math.floor(sh() * CREAM_COATS.length)]!;
        if (!isLamb) {
          lastEwe = i; // adults become the next lamb's ewe candidate
          adultXs.push(x);
        }
        xs.push(x);
        coats.push(coat);
        return {
          id: i,
          x,
          y: built.yAt(x) + 2,
          sc: isLamb ? baseSc * 0.6 : baseSc,
          dur: 4.8 + sh() * 3.4,
          delay: -sh() * 7,
          flip: sh() < 0.5, // random left/right facing
          fluff: 0.88 + sh() * 0.24, // subtle fleece-fullness variation
          seed: 1 + Math.floor(sh() * 1e9), // per-sheep micro-anatomy (fleece bumps, stance, ears)
          pose: !isLamb && sh() < 0.2 ? ('resting' as const) : ('grazing' as const), // ~1 in 5 adults lies down
          ...coat,
        };
      });
      return { ...h, Wl, d: built.d, yAt: built.yAt, trees, sheep };
    });
  }, [layout.W, vw, arrangement, sheepSeed]);

  /* a lone black ram. Highest chance wins: a difficult-mood entry always brings him out; otherwise
     a night with heavy rain gives a 20% chance and any night a 10% chance. Rain during the day no
     longer brings him out. The roll is seeded from the date + conditions, so it's stable all day —
     reopening the app during the same heavy-rain night (or the weather fetch landing after first
     paint) never re-rolls him. */
  const isNight = phaseKey === 'night';
  const ramRoll = useMemo(
    () => ramDayRoll(todayIso, heavyRain, isNight),
    [todayIso, heavyRain, isNight],
  );
  const difficultEntry = useMemo(() => {
    const latest = layout.entries.reduce<(typeof layout.entries)[number] | null>(
      (a, e) => (!a || e.createdAt > a.createdAt ? e : a),
      null,
    );
    return isDifficultMood(latest?.mood);
  }, [layout]);
  const ramVisible =
    ramRoll < ramAppearanceChance({ difficult: difficultEntry, heavyRain, night: isNight });
  const ram = useMemo(() => {
    const near = hills[2];
    if (!near) return null;
    const x = ramX(near.seed, near.Wl);
    return { x, y: near.yAt(x) + 1, h: 24 };
  }, [hills]);

  const syncScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sx = el.scrollLeft;
    hills.forEach((h, i) => {
      const node = hillRefs[i]?.current;
      if (node) node.style.transform = `translateX(${-sx * h.f}px)`;
    });
    const mi = Math.round((sx + window.innerWidth / 2 - layout.PL - layout.MW / 2) / layout.MW);
    const clamped = Math.max(0, Math.min(layout.months.length - 1, mi));
    setActiveMonth((p) => (p === clamped ? p : clamped));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hills, layout]);

  /* memory replay: same day, prior year — persisted via localStorage so a dismissal survives
     entries-array identity changes (e.g. a favourite toggle triggering refreshEntries()), and
     naturally re-shows once a still-eligible match exists on a later day. */
  const replayMatch = useMemo(() => findMemoryReplay(entries, liveNow), [entries, liveNow]);
  const replayMatchId = replayMatch?.entry.id ?? null;
  useEffect(() => {
    if (!replayMatch) {
      setReplay(null);
      return;
    }
    if (isMemoryReplayDismissed(readMemoryReplayDismiss(), replayMatch, liveNow)) return;
    const placed = layout.entries.find((e) => e.id === replayMatch.entry.id);
    if (!placed) return;
    const t = setTimeout(() => setReplay(placed), 1100);
    return () => clearTimeout(t);
    // Deliberately keyed on the resolved match's id, not on layout/entries/liveNow: an
    // entries-array identity change (favourite/delete/refresh) that resolves to the *same*
    // match must not re-schedule/re-pop a card the user already saw or dismissed this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayMatchId]);

  /* start at the most recent month + track viewport width */
  const initialised = useRef(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && !initialised.current) {
      initialised.current = true;
      el.scrollLeft = el.scrollWidth;
      syncScroll();
    }
    const onR = () => {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    };
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) setActiveFav(active.isFavourited);
    setConfirmDelete(false);
  }, [active]);

  // Tell the app chrome a memory card is open so the bottom nav steps aside;
  // always release the flag on close or unmount (e.g. leaving the garden).
  useEffect(() => {
    setMemoryCardOpen(!!active);
    return () => setMemoryCardOpen(false);
  }, [active, setMemoryCardOpen]);

  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      syncScroll();
      ticking.current = false;
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollerRef.current;
    if (el && el.scrollWidth > el.clientWidth && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollerRef.current) return;
    if ((e.target as Element).closest('[data-garden-interactive]')) {
      // Capturing a pointer that started on a flower retargets pointerup to the scroller in real
      // browsers, so the button never receives a click. Interactive meadow controls own the
      // gesture; dragging can still begin from the surrounding ground.
      drag.current.moved = 0;
      return;
    }
    // Capture the pointer so drag continues (and pointerup is still delivered here) even if
    // the cursor leaves the scroller during a fast fling — otherwise a release outside the
    // scroller never fires endDrag and the cursor sticks on "grabbing".
    scrollerRef.current.setPointerCapture?.(e.pointerId);
    drag.current = { down: true, x: e.clientX, sl: scrollerRef.current.scrollLeft, moved: 0 };
    setGrabbing(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down || e.pointerType !== 'mouse' || !scrollerRef.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    scrollerRef.current.scrollLeft = drag.current.sl - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
    setGrabbing(false);
  };

  const scrollToX = (x: number) => {
    scrollerRef.current?.scrollTo({ left: Math.max(0, x - window.innerWidth / 2), behavior: 'smooth' });
  };
  const visitEntry = (e: PlacedEntry) => {
    scrollToX(e.x);
    setTimeout(() => setActive(e), 650);
  };
  const dismissReplay = () => {
    if (replay) writeMemoryReplayDismiss({ date: formatMemoryReplayDismissKey(liveNow), entryId: replay.id });
    setReplay(null);
  };

  const parentOf = (e: PlacedEntry | null) =>
    e && e.revisitOf ? layout.entries.find((x) => x.id === e.revisitOf) ?? null : null;
  const childrenOf = (e: PlacedEntry | null) => (e ? layout.entries.filter((x) => x.revisitOf === e.id) : []);

  /* ---------- live scenes (preview playground only) ---------- */
  const spawnButterflies = () => {
    const sx = scrollerRef.current?.scrollLeft || 0;
    const within = layout.entries.filter((e) => e.x > sx + 90 && e.x < sx + vw - 90 && e.bloom !== 'pumpkin');
    const pool = within.length ? within : layout.entries.slice(-6);
    if (!pool.length) return;
    const r = mulberry32(Date.now() % 1000000);
    const picks: PlacedEntry[] = [];
    const used = new Set<string>();
    let guard = 0;
    while (picks.length < Math.min(3, pool.length) && guard++ < 40) {
      const e = pool[Math.floor(r() * pool.length)]!;
      if (used.has(e.id)) continue;
      used.add(e.id);
      picks.push(e);
    }
    const flock = picks.map((e, i) => {
      const sxp = (220 + r() * 420) * (r() < 0.5 ? 1 : -1);
      const syp = -(200 + r() * 240);
      const path = `M ${sxp.toFixed(0)} ${syp.toFixed(0)} C ${(sxp * 0.55 + (r() - 0.5) * 260).toFixed(0)} ${(syp * 0.4 - 70 - r() * 110).toFixed(0)}, ${((r() - 0.5) * 260 + 70).toFixed(0)} ${(-150 - r() * 110).toFixed(0)}, ${((r() - 0.5) * 200).toFixed(0)} ${(-110 - r() * 100).toFixed(0)} S ${((r() - 0.5) * 240).toFixed(0)} ${(-40 - r() * 130).toFixed(0)}, 0 0`;
      return { id: i, x: e.x + (r() - 0.5) * 16, yB: e.yB + 118 * e.scale, path, dur: 7.5 + r() * 5, stay: 15 + r() * 13, delay: i * 1.7, wing: WINGS[Math.floor(r() * WINGS.length)]!, size: 0.78 + r() * 0.5 };
    });
    if (!flock.length) return;
    const run = Date.now();
    setBflies({ run, flock });
    const total = Math.max(...flock.map((f) => f.delay + f.dur + f.stay)) + 1.5;
    safeTimeout(() => setBflies((b) => (b && Date.now() - b.run > total * 900 ? null : b)), total * 1000);
  };

  const spawnFox = (manual: boolean) => {
    const shift = manual && phaseKey !== 'dusk' && phaseKey !== 'night' && phaseKey !== 'golden';
    if (shift) setPhaseKey('dusk');
    const go = () => {
      const h = hills[1];
      if (!h || !h.yAt) return;
      const sx = scrollerRef.current?.scrollLeft || 0;
      const cx = sx * h.f + vw / 2;
      const span = Math.min(vw * 0.8, 940);
      const dir = Math.random() < 0.5 ? 1 : -1;
      const sc = 0.86;
      const xs = [0, 0.25, 0.5, 0.75, 1].map((t) => cx - (dir * span) / 2 + dir * span * t);
      const vars: Record<string, string> = {};
      xs.forEach((x, i) => {
        const xc = Math.max(30, Math.min(h.Wl - 30, x));
        vars[`--fx${i}`] = `${(xc - 48 * sc).toFixed(1)}px`;
        vars[`--fy${i}`] = `${(h.yAt(xc) - 41.5 * sc + 3).toFixed(1)}px`;
      });
      setFox({ run: Date.now(), vars: vars as React.CSSProperties, dir, sc, dur: 13 });
      safeTimeout(() => setFox(null), 13600);
    };
    safeTimeout(go, shift ? 1500 : 150);
  };

  const spawnShadow = () => {
    setCshadow({ run: Date.now() });
    safeTimeout(() => setCshadow(null), 28500);
  };

  const spawnDucks = (manual: boolean) => {
    const shift = manual && phaseKey !== 'golden' && phaseKey !== 'dusk';
    if (shift) setPhaseKey('golden');
    const go = () => {
      const r = mulberry32(Date.now() % 1000000);
      const count = 3 + Math.floor(r() * 5); // 3–7 ducks
      // Each flight has a base wingbeat character, but every duck beats at a distinctly
      // different rate (±20%-ish, like the codepen birds) so they never look in step.
      const flapBase = 0.72 + r() * 0.12;
      // Sideways "<" opening away from travel: leader in front, ranks trailing alternately
      // above/below, spaced wider than a sprite so wings never overlap. The bob delay grows
      // with rank so the undulation ripples back through the formation; per-duck periods
      // differ so the ripple decoheres rather than locking into a wave.
      const flock = Array.from({ length: count }, (_, i) => {
        const rank = Math.ceil(i / 2);
        const side = i % 2 ? -1 : 1;
        return {
          id: i,
          dx: i === 0 ? 0 : -(rank * 42 + (r() - 0.5) * 10),
          dy: i === 0 ? 0 : side * (rank * 16 + (r() - 0.5) * 6),
          size: 0.88 + r() * 0.18,
          flapDur: flapBase * (0.85 + r() * 0.35),
          flapDelay: -r() * 0.8,
          bobDur: 1.9 + r() * 0.9,
          bobDelay: -(rank * 0.33 + r() * 0.12),
          swayDur: 3.4 + r() * 1.8,
          swayDelay: -r() * 3,
        };
      });
      // Distance: far flights are smaller, higher in the sky, and cross a touch slower;
      // near ones bigger and lower. The band stays low enough to read against the bright
      // strip above the hills (a dark silhouette is invisible on the dark upper sky at
      // dusk) and high enough to clear the header chrome.
      const dist = 0.6 + r() * 0.45;
      const distNorm = (dist - 0.6) / 0.45;
      const dur = (24 + r() * 8) * (1.35 - 0.35 * distNorm);
      setDucks({ run: Date.now(), top: 20 + distNorm * 18 + r() * 4, dur, dist, path: r() < 0.5 ? 'a' : 'b', flock });
      safeTimeout(() => setDucks(null), (dur + 2) * 1000);
    };
    safeTimeout(go, shift ? 1500 : 100);
  };

  const spawnBirds = (manual: boolean) => {
    const shift = manual && phaseKey !== 'day';
    if (shift) setPhaseKey('day');
    const go = () => {
      const r = mulberry32(Date.now() % 1000000);
      const dir = r() < 0.5 ? 1 : -1;
      const count = 1 + Math.round(r());
      // Lone birds, not a formation: each rides its own undulating fly-right path with
      // its own speed and wingbeat; a second bird takes off a few seconds after the first.
      const flight = Array.from({ length: count }, (_, i) => ({
        id: i,
        path: (r() < 0.5 ? 'a' : 'b') as 'a' | 'b',
        // 12%+ keeps the highest path-b dip (-4vh) clear of the header chrome
        top: 12 + r() * 20,
        dur: 13 + r() * 4,
        delay: i === 0 ? 0 : 1.5 + r() * 2.5,
        flapDur: 0.9 + r() * 0.35,
        flapDelay: -r(),
      }));
      const total = Math.max(...flight.map((b) => b.delay + b.dur));
      setBirds({ run: Date.now(), dir, birds: flight });
      safeTimeout(() => setBirds(null), (total + 1) * 1000);
    };
    safeTimeout(go, shift ? 1500 : 100);
  };

  const spawnShoot = (manual: boolean) => {
    const shift = manual && phaseKey !== 'night' && phaseKey !== 'dusk';
    if (shift) setPhaseKey('night');
    const go = () => {
      const r = mulberry32(Date.now() % 1000000);
      // Same fixed direction for both streaks, starting above/left of the viewport so they
      // streak in from off-screen rather than appearing mid-sky.
      const streaks = [0, 1].map((i) => ({
        id: i,
        x: -14 + r() * 44,
        y: -26 + r() * 14,
        ang: SHOOTING_STAR_ANGLE,
        len: 160 + r() * 80,
        dist: 820 + r() * 220,
        dur: 1.8 + r() * 0.6,
        delay: i === 0 ? 0.1 : 2.4 + r() * 1.4,
      }));
      setShoot({ run: Date.now(), streaks });
      safeTimeout(() => setShoot(null), 6500);
    };
    safeTimeout(go, shift ? 1500 : 100);
  };

  /* ambient: a creature wanders through on its own every minute or two */
  const triggersRef = useRef({ spawnButterflies, spawnFox, spawnShadow, spawnShoot, spawnDucks, spawnBirds, phaseKey });
  triggersRef.current = { spawnButterflies, spawnFox, spawnShadow, spawnShoot, spawnDucks, spawnBirds, phaseKey };
  useEffect(() => {
    if (!creatures) return;
    let on = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        if (!on) return;
        const { phaseKey: pk, ...fn } = triggersRef.current;
        const opts =
          pk === 'night' ? ['shoot', 'shoot'] :
          pk === 'dusk' ? ['fox', 'bflies', 'shoot', 'ducks'] :
          pk === 'golden' ? ['fox', 'shadow', 'bflies', 'ducks', 'ducks'] :
          pk === 'dawn' ? ['bflies', 'shadow'] :
          ['bflies', 'shadow', 'birds', 'bflies'];
        const pick = opts[Math.floor(Math.random() * opts.length)];
        if (pick === 'bflies') fn.spawnButterflies();
        else if (pick === 'fox') fn.spawnFox(false);
        else if (pick === 'shadow') fn.spawnShadow();
        else if (pick === 'ducks') fn.spawnDucks(false);
        else if (pick === 'birds') fn.spawnBirds(false);
        else fn.spawnShoot(false);
        loop();
      }, 42000 + Math.random() * 72000);
    };
    loop();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [creatures]);

  /* live mode: the sky phase follows the local clock and the bodies drift through the day */
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => {
      const n = new Date();
      setPhaseKey(phaseFromHour(n.getHours()));
      setLiveNow(n);
    }, 60_000);
    return () => clearInterval(id);
  }, [live]);

  /* special days: a shooting star ~30s after open (90%) + occasional repeats at night (live only) */
  useEffect(() => {
    if (!live || !specialStar) return;
    let on = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(
      setTimeout(() => {
        if (on && Math.random() < SPECIAL_STAR.initialChance) triggersRef.current.spawnShoot(false);
      }, SPECIAL_STAR.initialDelayMs)
    );
    const loop = () => {
      const [lo, hi] = SPECIAL_STAR.repeatEveryMs;
      timers.push(
        setTimeout(() => {
          if (!on) return;
          const pk = triggersRef.current.phaseKey;
          if ((pk === 'night' || pk === 'dusk') && Math.random() < SPECIAL_STAR.repeatChance)
            triggersRef.current.spawnShoot(false);
          loop();
        }, lo + Math.random() * (hi - lo))
      );
    };
    loop();
    return () => {
      on = false;
      timers.forEach(clearTimeout);
    };
  }, [live, specialStar]);

  /* live: ducks join 1 in 3 golden hours (1 in 6 dusks); when they do, a V crosses every
     2–3 min. Keyed on phaseKey so the roll happens exactly once per phase entry (mount in
     the phase counts — that's the app-open case); leaving the phase stops the loop. */
  useEffect(() => {
    if (!live) return;
    if (Math.random() >= duckSessionChance(phaseKey)) return; // chance 0 outside golden/dusk
    let on = true;
    let t: ReturnType<typeof setTimeout>;
    const schedule = ([lo, hi]: readonly [number, number]) => {
      t = setTimeout(() => {
        if (!on) return;
        triggersRef.current.spawnDucks(false);
        schedule(DUCK_FLIGHT.repeatEveryMs);
      }, lo + Math.random() * (hi - lo));
    };
    schedule(DUCK_FLIGHT.firstFlightDelayMs);
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [live, phaseKey]);

  /* live: one or two lone birds cross the sky every few minutes during the day */
  useEffect(() => {
    if (!live) return;
    let on = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const [lo, hi] = SOLO_BIRDS.repeatEveryMs;
      t = setTimeout(() => {
        if (!on) return;
        if (Math.random() < soloBirdChance(triggersRef.current.phaseKey)) triggersRef.current.spawnBirds(false);
        loop();
      }, lo + Math.random() * (hi - lo));
    };
    loop();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [live]);

  /* events browser: snap the sky phase + moon shape to best show the selected event */
  useEffect(() => {
    if (!eventsBrowser || !eventMode || !selectedEvent) return;
    setPhaseKey(phaseForEvent(selectedEvent));
    const mp = moonPresetForEvent(selectedEvent);
    if (mp) setMoonPreset(mp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsBrowser, eventMode, selectedEvent]);

  /* lightning: fire a flash at random intervals while the weather is stormy */
  useEffect(() => {
    if (!isStormy) return;
    let on = true;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      const { min, max } = getLightningIntervalMs(cat);
      t = setTimeout(() => {
        if (!on) return;
        setFlash((f) => f + 1);
        loop();
      }, min + Math.random() * (max - min));
    };
    loop();
    return () => {
      on = false;
      clearTimeout(t);
    };
  }, [isStormy, cat]);

  /* ---------- card actions ---------- */
  const handleFavourite = async () => {
    if (!active) return;
    setActiveFav((v) => !v);
    await toggleFavourite(active.id);
    await refreshEntries();
  };
  const handleDelete = async () => {
    if (!active) return;
    const id = active.id;
    setActive(null);
    await softDelete(id);
    await refreshEntries();
  };

  const moodMeta = active?.mood ? MOODS[active.mood] : null;

  const pill: React.CSSProperties = {
    border: '1px solid #d8c9a4',
    background: '#f0e6cd',
    color: '#5c5236',
    borderRadius: 999,
    padding: '7px 15px',
    fontFamily: sans,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', overflow: 'hidden', fontFamily: sans, background: '#0a0f2a', userSelect: grabbing ? 'none' : 'auto' }}>
      <style>{`
        .bj-scroll::-webkit-scrollbar{display:none}
        @keyframes bj-sway{0%{transform:rotate(-1.7deg)}100%{transform:rotate(1.9deg)}}
        @keyframes bj-grass{0%{transform:rotate(-3deg)}100%{transform:rotate(3deg)}}
        @keyframes bj-nod{0%,22%{transform:translateY(0) rotate(0deg)}48%,72%{transform:translateY(2.2px) rotate(15deg)}92%,100%{transform:translateY(0) rotate(0deg)}}
        @keyframes bj-chew{0%,100%{transform:rotate(0deg)}30%{transform:rotate(2.4deg)}52%{transform:rotate(0.8deg)}74%{transform:rotate(2.8deg)}}
        @keyframes bj-bloom{0%{transform:scale(0);opacity:0}62%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
        @keyframes bj-drift{from{transform:translateX(-360px)}to{transform:translateX(calc(100vw + 360px))}}
        @keyframes bj-twinkle{0%,100%{opacity:.12}50%{opacity:.95}}
        @keyframes bj-pollen{0%{transform:translate(0,0);opacity:0}12%{opacity:.7}85%{opacity:.45}100%{transform:translate(80px,-140px);opacity:0}}
        @keyframes bj-fire{0%,100%{transform:translate(0,0);opacity:.1}28%{opacity:.95}52%{transform:translate(26px,-22px);opacity:.55}76%{opacity:.9}}
        @keyframes bj-rain{from{transform:translateY(-14vh)}to{transform:translateY(112vh)}}
        @keyframes bj-snow{0%{transform:translate(0,-6vh);opacity:0}10%{opacity:.95}90%{opacity:.9}100%{transform:translate(26px,108vh);opacity:0}}
        @keyframes bj-flash{0%{opacity:0}4%{opacity:.85}10%{opacity:.12}15%{opacity:.7}32%{opacity:0}100%{opacity:0}}
        @keyframes bj-card{from{opacity:0;transform:translateY(24px) scale(.97)}to{opacity:1;transform:none}}
        @keyframes bj-spark{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-7px);opacity:1}}
        @keyframes bj-replay{from{opacity:0;transform:translate(-50%,-14px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes bj-confirm{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        ${creatures || live ? CREATURE_KEYFRAMES : ''}
        ${SHOOTING_STAR_KEYFRAMES}
        ${COMET_KEYFRAMES}
        ${SEASON_PARTICLE_KEYFRAMES}
        @media (prefers-reduced-motion: reduce){*{animation-duration:.01s !important;animation-iteration-count:1 !important;transition-duration:.01s !important}}
      `}</style>

      {/* ===== SKY (fixed) ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {PHASE_ORDER.map((k) => (
          <div key={k} style={{ position: 'absolute', inset: 0, background: PHASES[k].sky, opacity: k === phaseKey ? 1 : 0, transition: 'opacity 1.6s ease' }} />
        ))}

        {/* stars */}
        <div style={{ position: 'absolute', inset: 0, opacity: phase.stars, transition: 'opacity 1.6s ease' }}>
          {stars.map((st) => (
            <div key={st.id} style={{ position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: '50%', background: '#fdf6e3', animation: `bj-twinkle ${st.d}s ${st.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* sun */}
        <div
          style={{
            position: 'absolute',
            left: `${sunPos.x}%`,
            top: `${sunPos.y}%`,
            width: sunPos.size,
            height: sunPos.size,
            marginLeft: -sunPos.size / 2,
            marginTop: -sunPos.size / 2,
            borderRadius: '50%',
            background: phase.sun.core,
            boxShadow: `0 0 60px 30px ${phase.sun.glow}, 0 0 140px 80px ${phase.sun.glow}`,
            opacity: phase.sun.o,
            transform: evSunScale !== 1 ? `scale(${evSunScale})` : undefined,
            transition: 'all 1.8s ease',
          }}
        />

        {/* moon — sphere-shaded disc + craters, with the real current lunar-phase shadow */}
        <div
          style={{
            position: 'absolute', left: `${moonPos.x}%`, top: `${moonPos.y}%`, marginLeft: -48, marginTop: -48,
            opacity: phase.moon.o,
            transform: evMoonScale !== 1 ? `scale(${evMoonScale})` : undefined,
            transition: 'all 1.8s ease',
            filter: `drop-shadow(0 0 44px rgba(${evMoonTint ? evMoonTint.glow : '240,238,210'},.4))`,
          }}
        >
          <svg width="96" height="96" viewBox="0 0 96 96">
            <defs>
              <radialGradient id="bj-moon-body" cx="38%" cy="34%" r="72%">
                <stop offset="0%" stopColor={moonBody.light} />
                <stop offset="58%" stopColor={moonBody.mid} />
                <stop offset="100%" stopColor={moonBody.limb} />
              </radialGradient>
              <radialGradient id="bj-moon-edge" cx="50%" cy="50%" r="50%">
                <stop offset="76%" stopColor="#3c3628" stopOpacity="0" />
                <stop offset="100%" stopColor="#3c3628" stopOpacity="0.26" />
              </radialGradient>
              <clipPath id="bj-moon-clip">
                <circle cx="48" cy="48" r="48" />
              </clipPath>
            </defs>
            <circle cx="48" cy="48" r="48" fill="url(#bj-moon-body)" />
            <g clipPath="url(#bj-moon-clip)" fill={moonBody.crater}>
              <ellipse cx="33" cy="38" rx="8" ry="7" />
              <circle cx="58" cy="62" r="5.4" />
              <circle cx="62" cy="33" r="3.6" />
              <circle cx="40" cy="65" r="3" opacity="0.7" />
              <circle cx="71" cy="50" r="2.5" opacity="0.6" />
              <circle cx="26" cy="56" r="2.3" opacity="0.55" />
            </g>
            <circle cx="48" cy="48" r="48" fill="url(#bj-moon-edge)" />
            {moonShadow && <path d={moonShadow} fill="#0a0f2a" clipPath="url(#bj-moon-clip)" />}
          </svg>
        </div>

        {/* clouds */}
        {clouds.slice(0, visibleClouds).map((c) => (
          <div key={c.id} style={{ position: 'absolute', top: `${c.top}%`, left: 0, opacity: Math.min(1, c.o * cloudBoost), animation: `bj-drift ${c.d}s linear infinite`, animationDelay: `${c.dl}s`, pointerEvents: 'none', transition: 'opacity 1.2s ease, filter 1.2s ease', filter: isStormy ? 'brightness(.62) saturate(.85)' : undefined }}>
            <div style={{ position: 'relative', width: c.w, height: 54 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${i * 22}%`,
                    top: i % 2 ? 12 : 0,
                    width: c.w * 0.42,
                    height: 38 + (i % 2) * 10,
                    borderRadius: '50%',
                    background: phase.clouds,
                    filter: 'blur(11px)',
                    transition: 'background 1.6s ease',
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* ducks — a V formation crossing the sky left to right (golden hour / dusk) */}
        {(creatures || live) && ducks && (
          <div key={ducks.run} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <div style={{ position: 'absolute', top: `${ducks.top}%`, left: 0, willChange: 'transform', animation: `bj-duckpath-${ducks.path} ${ducks.dur}s linear both` }}>
              {/* distance scale shrinks duck size and formation spacing together */}
              <div style={{ transform: `scale(${ducks.dist})`, transformOrigin: '0 0' }}>
                {ducks.flock.map((d) => (
                  <Duck key={d.id} d={d} />
                ))}
              </div>
            </div>
          </div>
        )}
        {/* lone birds — one or two cross the day sky individually, never in formation */}
        {(creatures || live) && birds && (
          <div key={birds.run} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', transform: birds.dir === -1 ? 'scaleX(-1)' : undefined }}>
            {birds.birds.map((b) => (
              <SoloBird key={b.id} b={b} />
            ))}
          </div>
        )}

      {/* comet (behind hills — shallow arc to hill crest) */}
        {showComet && (
          <CometVisual
            key={cometSessionKey ? `${cometSessionKey}-${cometLaunch}` : 'comet'}
            geom={cometGeom}
            loop
          />
        )}

        {/* parallax hills */}
        {hills.map((h, i) => (
          <svg key={i} ref={hillRefs[i]} width={h.Wl} height="340" style={{ position: 'absolute', bottom: G - 16, left: 0, display: 'block', willChange: 'transform' }}>
            <path d={h.d} fill={isSnow ? SNOW_HILLS[i] : seasonHill(phase.hills[i]!, i, seasonLook)} style={{ transition: 'fill 1.6s ease' }} />
            {h.trees.map((t) => (
              <Tree key={t.id} x={t.x} y={t.y} sc={t.sc} fill={phase.tree} />
            ))}
            <g style={{ opacity: sheepRainHide && sheepHidden ? 0 : phase.sheep, transition: 'opacity 1.6s ease' }}>
              {h.sheep.map((s) => (
                <Sheep
                  key={s.id}
                  x={s.x}
                  y={s.y}
                  sc={s.sc}
                  dur={s.dur}
                  delay={s.delay}
                  flip={s.flip}
                  wool={s.wool}
                  shade={s.shade}
                  dark={s.dark}
                  fluff={s.fluff}
                  seed={s.seed}
                  pose={s.pose}
                />
              ))}
            </g>
            {/* a lone black ram, near hill only — out on difficult-mood days, in rain, or some nights */}
            {i === 2 && ram && (
              <g style={{ opacity: ramVisible ? 0.8 : 0, transition: 'opacity 1.6s ease' }}>
                <Ram x={ram.x} y={ram.y} h={ram.h} />
              </g>
            )}
            {creatures && i === 1 && fox && (
              <g key={fox.run} style={{ ...fox.vars, animation: `bj-fox ${fox.dur}s linear both` }}>
                <g style={{ animation: `bj-foxlife ${fox.dur}s linear both` }}>
                  <g style={{ animation: 'bj-trot .48s ease-in-out infinite alternate' }}>
                    <g transform={`scale(${fox.sc})${fox.dir < 0 ? ' translate(96,0) scale(-1,1)' : ''}`}>
                      <Fox fill={phase.tree} />
                    </g>
                  </g>
                </g>
              </g>
            )}
          </svg>
        ))}

        {/* pollen + fireflies */}
        <div style={{ position: 'absolute', inset: 0, opacity: phase.pollen, transition: 'opacity 1.6s ease', pointerEvents: 'none' }}>
          {pollen.map((p) => (
            <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: 'rgba(255,250,225,.85)', filter: 'blur(.6px)', animation: `bj-pollen ${p.d}s ${p.dl}s linear infinite` }} />
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: phase.fire, transition: 'opacity 1.6s ease', pointerEvents: 'none' }}>
          {fireflies.map((f) => (
            <div key={f.id} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: 4, height: 4, borderRadius: '50%', background: '#ffe98a', boxShadow: '0 0 10px 3px rgba(255,228,130,.65)', animation: `bj-fire ${f.d}s ${f.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* seasonal particles — autumn leaves / spring petals; day-gated like pollen,
            cleared from the sky while precipitation owns it */}
        {seasonLook.particles && (
          <SeasonalParticles
            kind={seasonLook.particles}
            intensity={phase.pollen}
            hidden={precip || isSnow}
            dayIso={todayIso}
            colors={seasonLook.particleColors}
          />
        )}

        {/* shooting stars */}
        {(creatures || live) &&
          shoot &&
          shoot.streaks.map((s) => <ShootingStar key={`${shoot.run}-${s.id}`} geom={s} loop={false} />)}

        {/* world-event visuals (preview events browser) */}
        {eventsBrowser && eventMode && eventEffects.length > 0 && (
          <EventEffectsLayer
            effects={eventEffects}
            moonPos={moonPos}
            sunPos={sunPos}
            planet={evPlanet}
            apsis={evApsis}
            moonTint={evMoonTint}
          />
        )}

        {/* world-event visuals (live garden) — night-sky effects only, gated to dusk/night */}
        {live && liveRenderedEffects.length > 0 && (
          <EventEffectsLayer
            effects={liveRenderedEffects}
            moonPos={moonPos}
            sunPos={sunPos}
            planet={livePlanet}
          />
        )}

        {/* cloud-cover veil (overcast / fog desaturation) */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: cat === 'fog' ? '#dde2e7' : isStormy ? '#5b6470' : '#9aa3ad',
            mixBlendMode: cat === 'fog' ? 'normal' : 'multiply',
            opacity: hazeOpacity,
            transition: 'opacity 1.4s ease',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ===== MEADOW (scrolls) ===== */}
      <div
        ref={scrollerRef}
        className="bj-scroll"
        onScroll={onScroll}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        style={{ position: 'absolute', inset: 0, zIndex: 10, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', cursor: grabbing ? 'grabbing' : 'grab' }}
      >
        <div style={{ position: 'relative', width: worldW, height: '100%', filter: phase.filter, transition: 'filter 1.4s ease' }}>
          {/* ground */}
          {PHASE_ORDER.map((k) => (
            <div key={k} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: G, background: PHASES[k].ground, opacity: k === phaseKey ? 1 : 0, transition: 'opacity 1.6s ease' }} />
          ))}

          {/* seasonal ground wash — a constant soft-light veil over the phase cross-fade
              (never during snow; the settled-snow blanket below paints over it anyway) */}
          {seasonLook.groundTint.opacity > 0 && (
            <div
              style={{
                position: 'absolute', bottom: 0, left: 0, width: '100%', height: G,
                background: seasonLook.groundTint.gradient, mixBlendMode: 'soft-light',
                opacity: isSnow ? 0 : seasonLook.groundTint.opacity,
                transition: 'opacity 1.2s ease', pointerEvents: 'none',
              }}
            />
          )}

          {/* settled snow on the meadow floor — fades in while snowing and blankets the
              whole ground (grass hidden); flowers still rise through it */}
          <div
            style={{
              position: 'absolute', left: 0, bottom: 0, width: '100%', height: G, zIndex: 1,
              opacity: isSnow ? 1 : 0, transition: 'opacity 1.2s ease', pointerEvents: 'none',
              background:
                'radial-gradient(26px 13px at 50% 100%, #ffffff 60%, rgba(255,255,255,0) 72%) 0 4px / 52px 16px repeat-x,' +
                'linear-gradient(180deg, rgba(208,224,243,.85) 0%, #e6f0fb 14%, #f5f9ff 38%, #ffffff 70%, #ffffff 100%)',
            }}
          />

          {/* month labels */}
          {layout.months.map((m, i) => (
            <div key={m.key} style={{ position: 'absolute', left: m.cx, bottom: G - 34, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', opacity: activeMonth === i ? 1 : 0.55, transition: 'opacity .5s' }}>
              <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(250,246,232,.85)', textShadow: '0 1px 8px rgba(20,30,25,.35)' }}>
                {MONTH_NAMES[m.m]}
              </div>
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(250,246,232,.6)' }}>{m.y}</div>
            </div>
          ))}

          {/* grass — hidden under the blanket of settled snow while it's snowing */}
          <div style={{ position: 'absolute', inset: 0, color: seasonGrass(phase.grass, seasonLook), opacity: isSnow ? 0 : 1, transition: 'color 1.6s ease, opacity 1s ease', pointerEvents: 'none' }}>
            {tufts.map((t) => (
              <GrassTuft key={t.id} left={t.left} bottom={t.bottom} sc={t.sc} dur={t.dur} delay={t.dl} z={t.z} />
            ))}
          </div>

          {/* flowers */}
          {layout.entries.map((e, i) => {
            const anniv = isAnniv(e.createdAt);
            const isHover = hovered === e.id;
            const label = e.title || snippet(e.content, 50);
            return (
              <div
                key={e.id}
                style={{
                  position: 'absolute',
                  left: e.x,
                  bottom: e.yB,
                  zIndex: isHover ? 200 : e.z,
                  width: 120,
                  height: 170,
                  marginLeft: -60,
                  transform: `scale(${e.scale})`,
                  transformOrigin: 'bottom center',
                  opacity: e.fade,
                  // Only the bloom-head hit target below is interactive; the empty
                  // space + stem no longer swallow clicks meant for nearby flowers.
                  pointerEvents: 'none',
                }}
              >
                {/* ground shadow */}
                <div style={{ position: 'absolute', left: '50%', bottom: -4, width: 64, height: 14, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(15,35,20,.28), transparent 70%)' }} />
                {/* favourite halo */}
                {e.isFavourited && (
                  <div style={{ position: 'absolute', left: '50%', top: 22, width: 110, height: 110, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,219,140,.4), transparent 68%)', pointerEvents: 'none' }} />
                )}
                <div style={{ position: 'absolute', inset: 0, animation: `bj-bloom .9s cubic-bezier(.18,.9,.32,1.2) both`, animationDelay: `${0.15 + i * 0.04}s`, transformOrigin: 'bottom center', pointerEvents: 'none' }}>
                  <div style={{ position: 'absolute', inset: 0, transition: 'transform .3s ease', transform: isHover ? 'translateY(-2px) scale(1.035)' : 'none', transformOrigin: 'bottom center' }}>
                    <div style={{ position: 'absolute', inset: 0, animation: `bj-sway ${e.sway}s ease-in-out infinite alternate`, animationDelay: `${e.delay}s`, transformOrigin: '60px 170px' }}>
                      <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)', width: FLOWER_SIZE, height: FLOWER_SIZE, pointerEvents: 'none' }}>
                        <Flower
                          mood={e.genome.bloomMood}
                          seed={e.genome.seed}
                          size={FLOWER_SIZE}
                          sway={e.lean}
                          wordCount={e.genome.wordCount}
                          wiltDroop={e.genome.wiltFactor * 8}
                          pumpkinStage={e.genome.specialBloom === 'pumpkin' ? e.genome.pumpkinStage : undefined}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {anniv && (
                  <>
                    <div style={{ position: 'absolute', left: 16, top: 28, color: '#ffe49a', fontSize: 13, textShadow: '0 0 8px rgba(255,220,140,.8)', animation: 'bj-spark 3.2s ease-in-out infinite', pointerEvents: 'none' }}>✦</div>
                    <div style={{ position: 'absolute', right: 18, top: 50, color: '#ffe9b0', fontSize: 9, textShadow: '0 0 6px rgba(255,220,140,.8)', animation: 'bj-spark 2.6s 1.1s ease-in-out infinite', pointerEvents: 'none' }}>✦</div>
                  </>
                )}
                {/* hit target — a circle over the bloom head, so you pick the flower (not the stem) */}
                <button
                  data-garden-interactive
                  onClick={() => {
                    if (drag.current.moved > 6) return;
                    setActive(e);
                  }}
                  onMouseEnter={() => setHovered(e.id)}
                  onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                  aria-label={`${label}, ${fmtFull(e.createdAt)}`}
                  style={{
                    position: 'absolute',
                    left: 60,
                    top: HEAD_Y,
                    width: HIT,
                    height: HIT,
                    transform: 'translate(-50%,-50%)',
                    borderRadius: '50%',
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                />
                {/* hover tooltip */}
                {isHover && (
                  <div style={{ position: 'absolute', left: '50%', top: -6, transform: 'translate(-50%,-100%)', maxWidth: 244, background: 'rgba(251,246,236,.96)', border: '1px solid #e3d6bd', borderRadius: 999, padding: '5px 14px', boxShadow: '0 6px 18px rgba(25,35,30,.22)', pointerEvents: 'none', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 14, color: '#3d4438', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
                    <span style={{ fontFamily: sans, fontSize: 10.5, color: '#8a8270', fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtShort(e.createdAt)}</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* butterflies (world-space, scroll with the meadow) */}
          {creatures && bflies && bflies.flock.map((f) => <Butterfly key={`${bflies.run}-${f.id}`} f={f} />)}
        </div>
      </div>

      {/* ===== CLOUD SHADOW SWEEP ===== */}
      {creatures && cshadow && (
        <div key={cshadow.run} style={{ position: 'absolute', left: 0, right: 0, top: '32%', bottom: 0, zIndex: 15, pointerEvents: 'none', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '60vw', mixBlendMode: 'multiply', background: 'radial-gradient(ellipse 52% 58% at 50% 46%, rgba(98,114,106,.95), rgba(150,160,152,.55) 56%, rgba(255,255,255,0) 78%)', filter: 'blur(26px)', animation: 'bj-cshadow 23s linear both' }} />
          <div style={{ position: 'absolute', top: '8%', bottom: 0, left: 0, width: '32vw', mixBlendMode: 'multiply', background: 'radial-gradient(ellipse 50% 55% at 50% 50%, rgba(112,126,118,.85), rgba(255,255,255,0) 74%)', filter: 'blur(24px)', animation: 'bj-cshadow 19s 4.5s linear both' }} />
        </div>
      )}

      {/* ===== RAIN ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', opacity: precip ? 1 : 0, transition: 'opacity 1s ease' }}>
        <div style={{ position: 'absolute', inset: 0, background: `rgba(70,92,122,${rainFx.sheet})`, transition: 'background 1s ease' }} />
        <div style={{ position: 'absolute', inset: '-10% 0', transform: `rotate(${(rainSlant - 5).toFixed(1)}deg)` }}>
          {drops.map((d) => (
            <div
              key={d.id}
              style={{
                position: 'absolute',
                left: `${d.x}%`,
                top: 0,
                width: 1.5,
                height: d.h,
                opacity: rainFx.drop,
                background: 'linear-gradient(to bottom, transparent, rgba(205,220,240,.6))',
                animation: precip
                  ? `bj-rain ${(rainDur.min + d.t * (rainDur.max - rainDur.min)).toFixed(2)}s ${d.dl}s linear infinite`
                  : 'none',
              }}
            />
          ))}
        </div>
      </div>

      {/* ===== SNOW ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', opacity: isSnow ? 1 : 0, transition: 'opacity 1s ease' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(226,232,242,.14)' }} />
        {flakes.map((f) => (
          <div
            key={f.id}
            style={{
              position: 'absolute',
              left: `${f.x}%`,
              top: 0,
              width: f.s,
              height: f.s,
              borderRadius: '50%',
              background: 'rgba(255,255,255,.92)',
              filter: 'blur(.4px)',
              boxShadow: '0 0 4px rgba(255,255,255,.6)',
              animation: isSnow ? `bj-snow ${f.d}s ${f.dl}s linear infinite` : 'none',
            }}
          />
        ))}
      </div>

      {/* ===== LIGHTNING ===== */}
      {isStormy && flash > 0 && (
        <div
          key={flash}
          style={{ position: 'absolute', inset: 0, zIndex: 22, pointerEvents: 'none', background: 'rgba(244,248,255,.9)', animation: 'bj-flash 1.2s ease-out both' }}
        />
      )}

      {/* ===== HEADER ===== */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 22px', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 500, fontSize: 30, color: '#faf6e9', textShadow: '0 2px 16px rgba(15,25,35,.45)', lineHeight: 1 }}>Bloom</div>
          <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.6, textTransform: 'uppercase', color: 'rgba(250,246,233,.78)', textShadow: '0 1px 10px rgba(15,25,35,.5)', marginTop: 6 }}>
            {layout.entries.length === 0
              ? 'sky & weather preview'
              : `${layout.entries.length} ${layout.entries.length === 1 ? 'memory' : 'memories'}`}
          </div>
          {/* Live garden: the real weather driving the scene, so the sky reads as yours. */}
          {live && liveWeather && (
            <div style={{ marginTop: 10 }}>
              <WeatherChip weather={liveWeather} />
            </div>
          )}
          {/* Live garden with flowers: walk the meadow in 3D (/garden/explore). A roomy labelled
              CTA on desktop; on phones it collapses to a small, subtle round ⌖ button so it stops
              dominating the header. Off the crowded event/badge cluster on the right. */}
          {live && canExplore && layout.entries.length > 0 && (
            <button
              type="button"
              onClick={() => router.push('/garden/explore')}
              aria-label="Explore your meadow in 3D"
              style={{
                ...glass,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginTop: vw <= 640 ? 10 : 14,
                cursor: 'pointer',
                background: 'rgba(22,27,36,.5)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                ...(vw <= 640
                  ? {
                      width: 38,
                      height: 38,
                      padding: 0,
                      borderRadius: 999,
                      boxShadow: '0 3px 10px rgba(15,25,35,.25)',
                    }
                  : {
                      minHeight: 44,
                      padding: '0 20px',
                      borderRadius: 999,
                      fontFamily: sans,
                      fontSize: 13,
                      fontWeight: 700,
                      letterSpacing: 1.4,
                      textTransform: 'uppercase',
                      boxShadow: '0 6px 20px rgba(15,25,35,.3)',
                    }),
              }}
            >
              <span aria-hidden style={{ fontSize: vw <= 640 ? 18 : 17, lineHeight: 1 }}>⌖</span>
              {vw > 640 && 'Explore in 3D'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Live garden: name today's headline event (if any) above a subtle hint of the
              next event's date — balancing the title on the left. The column owns the top
              offset that drops it below the fixed SyncBadge (top-right, ~38px) so they
              don't collide. The event name reveals its subtitle on tap when one exists. */}
          {live && (liveEvent || nextEvent) && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, marginTop: 'calc(var(--safe-top) + 26px)' }}>
              {liveEvent &&
                (() => {
                  const dot = RARITY_DOT[liveEvent.rarity];
                  const tappable = Boolean(liveEvent.subtitle);
                  const Name = (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ width: 7, height: 7, borderRadius: 999, background: dot, boxShadow: `0 0 8px ${dot}`, flexShrink: 0 }} />
                      <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 15, color: '#faf6e9', textShadow: '0 1px 10px rgba(15,25,35,.5)', lineHeight: 1.1 }}>
                        {liveEvent.title}
                      </span>
                    </span>
                  );
                  return (
                    <div style={{ textAlign: 'right' }}>
                      {tappable ? (
                        <button
                          type="button"
                          onClick={() => setEventDetail((v) => !v)}
                          aria-expanded={eventDetail}
                          aria-label={`${liveEvent.title} — ${liveEvent.subtitle}`}
                          style={{ pointerEvents: 'auto', display: 'block', marginLeft: 'auto', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                        >
                          {Name}
                        </button>
                      ) : (
                        <div style={{ pointerEvents: 'none' }}>{Name}</div>
                      )}
                      {tappable && eventDetail && (
                        <div style={{ pointerEvents: 'none', fontFamily: sans, fontSize: 10, color: 'rgba(250,246,233,.7)', textShadow: '0 1px 10px rgba(15,25,35,.5)', marginTop: 3 }}>
                          {liveEvent.subtitle}
                        </div>
                      )}
                    </div>
                  );
                })()}
              {nextEvent && (
                <div style={{ pointerEvents: 'none', textAlign: 'right', fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.6, textTransform: 'uppercase', color: 'rgba(250,246,233,.7)', textShadow: '0 1px 10px rgba(15,25,35,.5)' }}>
                  Next · {fmtEventDate(nextEvent.date)}
                </div>
              )}
            </div>
          )}
          {/* Manual sky + weather controls moved to the collapsible right-edge rail
              (<PreviewRail> below) so the meadow stays visible while tuning. */}
        </div>
      </div>

      {/* ===== PREVIEW CONTROLS RAIL (preview playground only) =====
          A thin icon rail on the right edge; tapping an icon expands that section's
          pills inline. The meadow is never covered — see PreviewRail.tsx. */}
      {!live && (
        <PreviewRail
          hasCreatures={creatures}
          hasEvents={eventsBrowser}
          phaseKey={phaseKey}
          onPhaseKey={setPhaseKey}
          defaultPhaseKey={phaseFromHour(new Date().getHours())}
          weatherCat={weatherCat}
          onWeatherCat={setWeatherCat}
          moonPreset={moonPreset}
          onMoonPreset={(key) => {
            setMoonPreset(key);
            const preset = MOON_PRESETS.find((p) => p.key === key);
            // jump to night so the chosen moon is actually visible
            if (preset && preset.phase !== null && phaseKey !== 'night' && phaseKey !== 'dusk') setPhaseKey('night');
          }}
          arrangement={arrangement}
          onArrangement={setArrangement}
          onRerollSheep={() => setSheepSeed(Math.floor(Math.random() * 1e9))}
          sheepRainHide={sheepRainHide}
          onSheepRainHide={() => setSheepRainHide((v) => !v)}
          scenes={[
            ['Butterflies', () => spawnButterflies(), !!bflies],
            ['Fox', () => spawnFox(true), !!fox],
            ['Cloud shadow', () => spawnShadow(), !!cshadow],
            ['Shooting star', () => spawnShoot(true), !!shoot],
            ['Ducks', () => spawnDucks(true), !!ducks],
            ['Birds', () => spawnBirds(true), !!birds],
          ]}
          eventMode={eventMode}
          onToggleEvents={toggleEvents}
        />
      )}

      {/* ===== REPLAY CARD ===== */}
      {replay && !active && (
        <div style={{ position: 'absolute', top: 86, left: '50%', zIndex: 52, width: 'min(420px, calc(100vw - 36px))', animation: 'bj-replay .7s ease both', transform: 'translateX(-50%)' }}>
          <div style={{ background: 'rgba(251,246,236,.97)', border: '1px solid #e6d9bf', borderRadius: 16, padding: '14px 16px', boxShadow: '0 14px 40px rgba(20,30,28,.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: 2.2, textTransform: 'uppercase', color: '#a98c4a' }}>✦ This day in your garden</div>
              <button onClick={dismissReplay} aria-label="Dismiss" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9181', fontSize: 15, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: '#3a4136', margin: '6px 0 3px' }}>“{replay.title || snippet(replay.content, 64)}”</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: '#8b8370' }}>
              {snapshotLine(replay.timePhase, replay.weather.toLowerCase(), replay.place)} · {agoLabel(replay.createdAt)}
            </div>
            <button
              onClick={() => { dismissReplay(); visitEntry(replay); }}
              style={{ marginTop: 10, border: '1px solid #d8c9a4', background: '#f0e6cd', color: '#5c5236', borderRadius: 999, padding: '6px 16px', fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Open this memory
            </button>
          </div>
        </div>
      )}

      {/* ===== EVENTS STEPPER ===== (preview sky playground only) */}
      {eventsBrowser && eventMode && (
        <EventStepper
          events={filteredEvents}
          index={evIndex}
          onIndex={setEvIndex}
          group={evGroup}
          onGroup={pickGroup}
          rarity={evRarity}
          onRarity={pickRarity}
          onClose={() => setEventMode(false)}
        />
      )}

      {/* ===== TIMELINE SCRUBBER ===== (raised clear of the auto-hiding nav; hidden while a memory is open) */}
      {!active && (
      <div style={{ position: 'absolute', bottom: 'calc(112px + var(--safe-bottom))', left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: 'calc(100vw - 28px)' }}>
        <div style={{ ...glass, borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {layout.months.map((m, i) => (
            <React.Fragment key={m.key}>
              {/* year divider — a thin rule wherever the year rolls over */}
              {i > 0 && m.y !== layout.months[i - 1]!.y && (
                <span aria-hidden style={{ width: 1, height: 16, background: 'rgba(247,241,227,.28)', margin: '0 4px', flexShrink: 0 }} />
              )}
              <button
                onClick={() => scrollToX(m.cx)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  padding: '3px 7px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                  color: activeMonth === i ? '#ffe1a0' : 'rgba(247,241,227,.62)',
                  transition: 'color .3s',
                }}
              >
                <span style={{ width: activeMonth === i ? 7 : 5, height: activeMonth === i ? 7 : 5, borderRadius: '50%', background: 'currentColor', transition: 'all .3s' }} />
                <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  {MONTH_ABBR[m.m]}{i === 0 || m.y !== layout.months[i - 1]!.y ? ` '${String(m.y).slice(2)}` : ''}
                </span>
              </button>
            </React.Fragment>
          ))}
          {/* jump back to the newest month */}
          {layout.months.length > 1 && (
            <>
              <span aria-hidden style={{ width: 1, height: 16, background: 'rgba(247,241,227,.28)', margin: '0 4px', flexShrink: 0 }} />
              <button
                onClick={() => scrollToX(layout.months[layout.months.length - 1]!.cx)}
                aria-label="Jump to the newest memories"
                style={{ border: 'none', cursor: 'pointer', background: 'transparent', padding: '3px 7px', color: '#ffe1a0' }}
              >
                <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Today</span>
              </button>
            </>
          )}
        </div>
      </div>
      )}

      {/* hint — sits just above the timeline, also hidden while a memory is open */}
      {layout.entries.length > 0 && !active && (
        <div style={{ position: 'absolute', bottom: 'calc(150px + var(--safe-bottom))', left: 22, zIndex: 50, fontFamily: serif, fontStyle: 'italic', fontSize: 14, color: 'rgba(250,246,233,.72)', textShadow: '0 1px 10px rgba(15,25,35,.5)', pointerEvents: 'none' }}>
          drag to explore · tap a flower to open
        </div>
      )}

      {/* ===== MEMORY CARD ===== */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(12,16,24,.34)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px calc(28px + var(--safe-bottom))' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(440px, 100%)', maxHeight: 'calc(100dvh - 120px)', overflowY: 'auto', background: '#fbf6ec', border: '1px solid #e6d9bf', borderRadius: 20, padding: '20px 22px 18px', boxShadow: '0 24px 70px rgba(15,22,20,.4)', animation: 'bj-card .5s cubic-bezier(.2,.8,.3,1) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: moodMeta?.chip || '#999' }} />
                <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#7d7561' }}>{moodMeta?.label || active.mood}</span>
                {activeFav && <span style={{ color: '#d4a23c', fontSize: 13 }}>♥</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                {/* the tapped flower itself — same genome as the meadow, so it matches exactly */}
                <div data-testid="memory-card-flower" style={{ width: 56, height: 56, flexShrink: 0, pointerEvents: 'none', animation: 'bj-bloom .7s .15s cubic-bezier(.2,.8,.3,1) both' }}>
                  <Flower
                    mood={active.genome.bloomMood}
                    seed={active.genome.seed}
                    size={56}
                    wordCount={active.genome.wordCount}
                    wiltDroop={active.genome.wiltFactor * 8}
                    pumpkinStage={active.genome.specialBloom === 'pumpkin' ? active.genome.pumpkinStage : undefined}
                  />
                </div>
                <button onClick={() => setActive(null)} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9181', fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
              </div>
            </div>

            {active.title && (
              <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 26, lineHeight: 1.15, color: '#33392f', margin: '10px 0 4px' }}>{active.title}</div>
            )}
            <div style={{ fontFamily: sans, fontSize: 11.5, color: '#8b8370', marginBottom: 12, marginTop: active.title ? 0 : 10 }}>
              {fmtFull(active.createdAt)} · {agoLabel(active.createdAt)}{isAnniv(active.createdAt) ? ' ✦' : ''}
            </div>

            <div style={{ fontFamily: serif, fontSize: 17.5, lineHeight: 1.55, color: '#474e42', borderLeft: '2px solid #e3d3ac', paddingLeft: 14, fontStyle: 'italic' }}>
              {active.content}
            </div>

            <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: '#a39a83', marginTop: 14 }}>
              {snapshotLine(active.timePhase, active.weather, active.place)}
            </div>

            {(active.tags?.length || 0) > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {active.tags.map((t) => (
                  <span key={t} style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, color: '#6f7a64', background: '#eee6d0', border: '1px solid #e0d3b3', borderRadius: 999, padding: '3px 10px' }}>#{t}</span>
                ))}
              </div>
            )}

            {parentOf(active) && (
              <button onClick={() => setActive(parentOf(active))} style={{ marginTop: 12, display: 'block', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#8a6f3c', textAlign: 'left' }}>
                ↩ revisits “{parentOf(active)!.title || snippet(parentOf(active)!.content, 40)}”
              </button>
            )}
            {childrenOf(active).map((c) => (
              <button key={c.id} onClick={() => setActive(c)} style={{ marginTop: 8, display: 'block', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#8a6f3c', textAlign: 'left' }}>
                ↪ revisited on {fmtShort(c.createdAt)} — “{c.title || snippet(c.content, 40)}”
              </button>
            ))}

            {/* actions (hidden in the standalone preview, which has no real entries to act on) */}
            {!preview && !confirmDelete && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => router.push(`/entry/${active.id}`)} style={pill}>Open full memory</button>
                <button
                  onClick={() => void handleFavourite()}
                  style={{ ...pill, background: activeFav ? '#f7e4b0' : '#f6f1e4', borderColor: activeFav ? '#e2c98a' : '#e0d3b3', color: activeFav ? '#9a6f1e' : '#6f6650' }}
                >
                  {activeFav ? '♥ Favourited' : '♡ Favourite'}
                </button>
                <button onClick={() => router.push(`/revisit/${active.id}`)} style={{ ...pill, background: '#f6f1e4', borderColor: '#e0d3b3', color: '#6f6650' }}>↻ Revisit</button>
                <button onClick={() => setConfirmDelete(true)} style={{ ...pill, background: '#f6e6df', borderColor: '#e3c4b8', color: '#a8553f' }}>Delete</button>
              </div>
            )}
            {!preview && confirmDelete && (
              <div
                style={{
                  marginTop: 16,
                  background: '#f8e9e2',
                  border: '1px solid #e3c4b8',
                  borderRadius: 14,
                  padding: '13px 14px',
                  animation: 'bj-confirm .28s cubic-bezier(.2,.8,.3,1) both',
                }}
              >
                <div style={{ fontFamily: sans, fontSize: 12.5, fontWeight: 700, color: '#9a4a36', lineHeight: 1.45 }}>
                  Remove this memory from your garden?
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 11 }}>
                  <button onClick={() => setConfirmDelete(false)} style={{ ...pill, background: '#fbf3ee', borderColor: '#e3c4b8', color: '#7a5a4f' }}>Keep</button>
                  <button onClick={() => void handleDelete()} style={{ ...pill, background: '#a8553f', borderColor: '#a8553f', color: '#fbf6ec' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* paper grain + vignette */}
      <svg style={{ position: 'absolute', inset: 0, zIndex: 70, width: '100%', height: '100%', opacity: 0.05, mixBlendMode: 'multiply', pointerEvents: 'none' }}>
        <filter id="bj-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#bj-grain)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, zIndex: 65, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 58%, rgba(18,22,30,.2) 100%)' }} />
    </div>
  );
}

export default BloomMeadow;
