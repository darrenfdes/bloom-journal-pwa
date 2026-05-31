import { parseISO } from 'date-fns';

import type { EntryRecord } from '../types';
import type { Season } from '../theme/seasons';
import type { TimePhase, WeatherCategory } from '../scene/types';

export type MemoryReplayMatch = {
  entry: EntryRecord;
  yearsAgo: number;
};

const EXCERPT_MAX = 60;

function sameCalendarMonthDay(a: Date, b: Date): boolean {
  return a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function entryYear(createdAt: string): number {
  return parseISO(createdAt).getFullYear();
}

/** Entries planted on this calendar day in a prior year; prefers the most recent past year. */
export function findMemoryReplay(
  entries: EntryRecord[],
  now = new Date()
): MemoryReplayMatch | null {
  const currentYear = now.getFullYear();
  let best: MemoryReplayMatch | null = null;

  for (const entry of entries) {
    if (entry.isDeleted) continue;
    const created = parseISO(entry.createdAt);
    if (!sameCalendarMonthDay(created, now)) continue;
    const yearsAgo = currentYear - entryYear(entry.createdAt);
    if (yearsAgo < 1) continue;

    if (!best || yearsAgo < best.yearsAgo) {
      best = { entry, yearsAgo };
    }
  }

  return best;
}

function yearsAgoPhrase(yearsAgo: number): string {
  if (yearsAgo === 1) return 'One year ago';
  if (yearsAgo === 2) return 'Two years ago';
  return `${yearsAgo} years ago`;
}

const SEASON_PHRASE: Record<Season, string> = {
  spring: 'spring',
  summer: 'summer',
  autumn: 'autumn',
  winter: 'winter',
};

const TIME_SETTING: Partial<Record<TimePhase, string>> = {
  dawn: 'at dawn',
  day: 'during the day',
  golden_hour: 'during golden hour',
  dusk: 'at dusk',
  night: 'in the evening',
  deep_night: 'late at night',
  pre_dawn: 'before dawn',
};

const RAINY: WeatherCategory[] = [
  'drizzle',
  'rain',
  'heavy_rain',
  'thunderstorm',
];
const SNOWY: WeatherCategory[] = ['snow'];
const FOGGY: WeatherCategory[] = ['fog'];

function weatherTone(category: WeatherCategory | undefined): string | null {
  if (!category) return null;
  if (RAINY.includes(category)) return 'rainy';
  if (SNOWY.includes(category)) return 'snowy';
  if (FOGGY.includes(category)) return 'foggy';
  if (category === 'clear' || category === 'partly_cloudy') return 'clear';
  return null;
}

function settingPhrase(entry: EntryRecord): string | null {
  const tone = weatherTone(entry.weather?.category);
  const time = entry.timePhase ? TIME_SETTING[entry.timePhase] : null;
  const season = entry.sceneSeason ? SEASON_PHRASE[entry.sceneSeason] : null;

  if (tone === 'rainy' && time) return `during a rainy ${stripDuring(time)}`;
  if (tone === 'snowy' && time) return `during a snowy ${stripDuring(time)}`;
  if (tone === 'foggy' && time) return `on a foggy ${stripDuring(time)}`;
  if (tone === 'rainy') return 'on a rainy day';
  if (tone === 'snowy') return 'on a snowy day';
  if (tone === 'foggy') return 'on a foggy day';
  if (season && time) return `on a ${season} ${stripDuring(time)}`;
  if (time) return time;
  if (season) return `in ${season}`;
  return null;
}

function stripDuring(phrase: string): string {
  return phrase.replace(/^during /, '').replace(/^at /, '').replace(/^in /, '');
}

function placePhrase(locationName: string | null | undefined): string | null {
  if (!locationName?.trim()) return null;
  const city = locationName.split(',')[0]?.trim();
  return city ? `in ${city}` : null;
}

export function memoryReplayExcerpt(entry: EntryRecord): string {
  const title = entry.title?.trim();
  if (title) return title.length <= EXCERPT_MAX ? title : truncateAtWord(title, EXCERPT_MAX);

  const content = entry.content.trim().replace(/\s+/g, ' ');
  if (!content) return 'your memory';
  return truncateAtWord(content, EXCERPT_MAX);
}

function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace > max * 0.5) return `${slice.slice(0, lastSpace).trim()}…`;
  return `${slice.trim()}…`;
}

/** Single-sentence narrative for the memory replay card. */
export function formatMemoryReplayLine(entry: EntryRecord, yearsAgo: number): string {
  const parts: string[] = [yearsAgoPhrase(yearsAgo)];

  const setting = settingPhrase(entry);
  const place = placePhrase(entry.weather?.locationName);
  if (setting && place) {
    parts.push(`${setting} ${place}`);
  } else if (setting) {
    parts.push(setting);
  } else if (place) {
    parts.push(place);
  }

  parts.push(`you wrote about ${memoryReplayExcerpt(entry)}`);
  const sentence = parts.join(', ');
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

export function formatMemoryReplayDismissKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export type MemoryReplayDismiss = {
  date: string;
  entryId: string;
};

export function isMemoryReplayDismissed(
  dismiss: MemoryReplayDismiss | null,
  match: MemoryReplayMatch,
  now = new Date()
): boolean {
  if (!dismiss) return false;
  const today = formatMemoryReplayDismissKey(now);
  return dismiss.date === today && dismiss.entryId === match.entry.id;
}
