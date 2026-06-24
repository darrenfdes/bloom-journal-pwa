/**
 * Time-of-day palettes + date helpers, ported verbatim from the Bloom Meadow reference
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`, spec §6 & §20).
 */

export type PhaseKey = 'dawn' | 'day' | 'golden' | 'dusk' | 'night';

export interface PhasePalette {
  label: string;
  sky: string;
  sun: { x: number; y: number; size: number; core: string; glow: string; o: number };
  moon: { x: number; y: number; o: number };
  clouds: string;
  stars: number;
  hills: [string, string, string];
  tree: string;
  ground: string;
  grass: string;
  filter: string;
  fire: number;
  pollen: number;
  sheep: number;
}

export const PHASE_ORDER: PhaseKey[] = ['dawn', 'day', 'golden', 'dusk', 'night'];

export const PHASES: Record<PhaseKey, PhasePalette> = {
  dawn: {
    label: 'Dawn',
    sky: 'linear-gradient(180deg,#5d6f9e 0%,#9c87ab 36%,#e7b292 64%,#f7ddb6 100%)',
    sun: { x: 20, y: 64, size: 116, core: '#ffedc8', glow: 'rgba(255,205,135,.55)', o: 1 },
    moon: { x: 80, y: 16, o: 0 },
    clouds: '#eec9b4',
    stars: 0.18,
    hills: ['#a18ba3', '#7e8198', '#5f7077'],
    tree: '#4b5b60',
    ground: 'linear-gradient(180deg,#6e8a66,#49664a)',
    grass: '#567c50',
    filter: 'brightness(.97) saturate(.96)',
    fire: 0,
    pollen: 0.35,
    sheep: 1,
  },
  day: {
    label: 'Day',
    sky: 'linear-gradient(180deg,#9bc4e6 0%,#bedaee 46%,#e7ead3 80%,#f5edd3 100%)',
    sun: { x: 68, y: 13, size: 102, core: '#fffae6', glow: 'rgba(255,246,205,.5)', o: 1 },
    moon: { x: 80, y: 16, o: 0 },
    clouds: '#ffffff',
    stars: 0,
    hills: ['#b7c9ab', '#8fb288', '#6da267'],
    tree: '#557a52',
    ground: 'linear-gradient(180deg,#7fae72,#54824e)',
    grass: '#5d9457',
    filter: 'none',
    fire: 0,
    pollen: 1,
    sheep: 1,
  },
  golden: {
    label: 'Golden',
    sky: 'linear-gradient(180deg,#6f7fb2 0%,#c9a386 40%,#f0bd7e 70%,#fadfae 100%)',
    sun: { x: 81, y: 58, size: 148, core: '#ffd98f', glow: 'rgba(255,178,96,.6)', o: 1 },
    moon: { x: 18, y: 22, o: 0 },
    clouds: '#f4cda1',
    stars: 0.1,
    hills: ['#c3ad8d', '#9aa06b', '#7d8d54'],
    tree: '#5f6e40',
    ground: 'linear-gradient(180deg,#8c9c5d,#5d7544)',
    grass: '#6c8a4c',
    filter: 'sepia(.1) saturate(1.05) brightness(1.02)',
    fire: 0.2,
    pollen: 1,
    sheep: 1,
  },
  dusk: {
    label: 'Dusk',
    sky: 'linear-gradient(180deg,#33396b 0%,#5d4f86 38%,#a96f8b 66%,#e09a83 100%)',
    sun: { x: 86, y: 92, size: 148, core: '#ffc98a', glow: 'rgba(255,160,110,.4)', o: 0 },
    moon: { x: 22, y: 22, o: 0.7 },
    clouds: '#c79fb6',
    stars: 0.5,
    hills: ['#6e6489', '#525a7c', '#3d4a64'],
    tree: '#2f3b50',
    ground: 'linear-gradient(180deg,#4a6053,#33473b)',
    grass: '#3f5c46',
    filter: 'brightness(.88) saturate(.92)',
    fire: 0.6,
    pollen: 0.2,
    sheep: 0,
  },
  night: {
    label: 'Night',
    sky: 'linear-gradient(180deg,#0a0f2a 0%,#15204a 45%,#243259 78%,#2c3d63 100%)',
    sun: { x: 86, y: 96, size: 120, core: '#ffc98a', glow: 'rgba(255,160,110,.3)', o: 0 },
    moon: { x: 72, y: 14, o: 1 },
    clouds: '#3a4a74',
    stars: 1,
    hills: ['#2c3a5e', '#232f4d', '#1a2440'],
    tree: '#131c30',
    ground: 'linear-gradient(180deg,#1f3331,#152521)',
    grass: '#264336',
    filter: 'brightness(.74) saturate(.8)',
    fire: 1,
    pollen: 0,
    sheep: 0,
  },
};

export const phaseFromHour = (h: number): PhaseKey =>
  h < 5 ? 'night' : h < 7 ? 'dawn' : h < 16 ? 'day' : h < 18 ? 'golden' : h < 20 ? 'dusk' : 'night';

/**
 * Continuous sun/moon geometry for live mode. Each segment interpolates *from* its phase keyframe
 * *to* the next phase's keyframe over the segment's clock span, so a body reaches the next stage's
 * position exactly as the phase flips (continuous across the join). Night wraps midnight (20:00 →
 * 05:00). Only geometry is interpolated — opacity/colour stay tied to `phaseKey`. Segment boundaries
 * match `phaseFromHour` so the discrete sky crossfade and the drifting bodies stay in sync.
 */
const CELESTIAL_SEGMENTS: { from: PhaseKey; to: PhaseKey; start: number; end: number }[] = [
  { from: 'night', to: 'dawn', start: 20, end: 29 }, // 20:00 → 05:00(+1)
  { from: 'dawn', to: 'day', start: 5, end: 7 },
  { from: 'day', to: 'golden', start: 7, end: 16 },
  { from: 'golden', to: 'dusk', start: 16, end: 18 },
  { from: 'dusk', to: 'night', start: 18, end: 20 },
];

export function celestialAt(date: Date): {
  sun: { x: number; y: number; size: number };
  moon: { x: number; y: number };
} {
  const h = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
  const hc = h < 5 ? h + 24 : h; // night-wrap
  const seg = CELESTIAL_SEGMENTS.find((s) => hc >= s.start && hc < s.end) ?? CELESTIAL_SEGMENTS[0]!;
  const t = (hc - seg.start) / (seg.end - seg.start);
  const a = PHASES[seg.from];
  const b = PHASES[seg.to];
  const lerp = (p: number, q: number) => p + (q - p) * t;
  return {
    sun: { x: lerp(a.sun.x, b.sun.x), y: lerp(a.sun.y, b.sun.y), size: lerp(a.sun.size, b.sun.size) },
    moon: { x: lerp(a.moon.x, b.moon.x), y: lerp(a.moon.y, b.moon.y) },
  };
}

export const PHASE_PRETTY: Record<PhaseKey, string> = {
  dawn: 'Dawn',
  day: 'Midday',
  golden: 'Golden hour',
  dusk: 'Dusk',
  night: 'Night',
};

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export const fmtFull = (d: Date): string =>
  `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;

export const fmtShort = (d: Date): string =>
  `${d.getDate()} ${MONTH_ABBR[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;

export function agoLabel(d: Date): string {
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth();
  const yrs = now.getFullYear() - d.getFullYear();
  if (sameDay && yrs >= 1) return `${yrs} year${yrs > 1 ? 's' : ''} ago today`;
  const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (months <= 0) return 'this month';
  if (months === 1) return 'last month';
  if (months < 12) return `${months} months ago`;
  return `${Math.floor(months / 12)}y ${months % 12}m ago`;
}

export const isAnniv = (d: Date): boolean => {
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() < now.getFullYear()
  );
};
