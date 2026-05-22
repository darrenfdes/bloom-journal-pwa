import type { BloomPalette } from '@/lib/flowers/moodPalettes';

export interface BloomProps {
  /** Namespace prefix for gradient/filter IDs: `${mood}-${seed}`. */
  ns: string;
  palette: BloomPalette;
  seed: number;
  cx: number;
  cy: number;
}

export function nsId(ns: string, suffix: string): string {
  return `${ns}-${suffix}`;
}
