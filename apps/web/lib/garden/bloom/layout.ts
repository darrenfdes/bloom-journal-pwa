/**
 * World layout for the Bloom Meadow: months laid out left→right, one deterministic flower
 * per entry. Ported from the reference's `layout` memo (spec §9), fed by real entries.
 */
import type { EntryRecord } from '@bloom/core';

import { toReferenceEntry, type ReferenceEntry } from './adapt';
import { FALLBACK_BLOOM, MOODS, type BloomKind } from './moods';
import { hashString, mulberry32 } from './rng';

const MW = 560; // month width
const PL = 300; // left padding
const PR = 380; // right padding

const PUMPKIN_RE = /(!!!|ecstatic|over the moon|thrilled)/i;

export interface PlacedEntry extends ReferenceEntry {
  seed: number;
  x: number;
  yB: number;
  scale: number;
  bloom: BloomKind;
  z: number;
  lean: number;
  sway: number;
  delay: number;
  fade: number;
}

export interface MonthMarker {
  key: number;
  y: number;
  m: number;
  x: number;
  cx: number;
}

export interface MeadowLayout {
  entries: PlacedEntry[];
  months: MonthMarker[];
  W: number;
  MW: number;
  PL: number;
}

export function buildMeadowLayout(records: EntryRecord[]): MeadowLayout {
  const refs = records
    .filter((e) => !e.isDeleted)
    .map((e) => ({ record: e, ref: toReferenceEntry(e) }))
    .sort((a, b) => a.ref.createdAt.getTime() - b.ref.createdAt.getTime());

  const mk = (d: Date) => d.getFullYear() * 12 + d.getMonth();
  const keys = [...new Set(refs.map(({ ref }) => mk(ref.createdAt)))].sort((a, b) => a - b);
  const idx = new Map(keys.map((k, i) => [k, i]));

  const months: MonthMarker[] = keys.map((k, i) => ({
    key: k,
    y: Math.floor(k / 12),
    m: k % 12,
    x: PL + i * MW,
    cx: PL + i * MW + MW / 2,
  }));
  const W = PL + keys.length * MW + PR;

  const entries: PlacedEntry[] = refs.map(({ record, ref }, ei) => {
    // Seed from the original record so the display title fallback never shifts shapes.
    const seed = hashString(record.id + (record.title ?? ''));
    const r = mulberry32(seed);
    const mi = idx.get(mk(ref.createdAt)) ?? 0;
    const x = PL + mi * MW + 85 + r() * (MW - 180);
    const depth = r();
    const yB = 16 + depth * 72;
    const words = ref.content.split(/\s+/).length;
    const scale =
      (1.16 - depth * 0.46) *
      (0.9 + (Math.min(words, 60) / 60) * 0.22) *
      (ref.isFavourited ? 1.12 : 1);

    const isPumpkin =
      (ref.mood === 'joyful' || ref.mood === 'ecstatic') &&
      PUMPKIN_RE.test(`${ref.title} ${ref.content}`);
    const bloom: BloomKind = isPumpkin
      ? 'pumpkin'
      : ref.mood && MOODS[ref.mood]
        ? MOODS[ref.mood].bloom
        : FALLBACK_BLOOM;

    return {
      ...ref,
      seed,
      x,
      yB,
      scale,
      bloom,
      z: 100 + Math.round((1 - depth) * 40),
      lean: (r() - 0.5) * 9,
      sway: 3.8 + r() * 3.2,
      delay: -r() * 6,
      fade: 0.8 + (ei / Math.max(1, refs.length)) * 0.2,
    };
  });

  return { entries, months, W, MW, PL };
}
