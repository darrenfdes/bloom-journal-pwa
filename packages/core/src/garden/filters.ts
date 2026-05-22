import type { EntryRecord, GardenFilter } from '../types';
import { format, parseISO } from 'date-fns';

export function applyGardenFilter(
  entries: EntryRecord[],
  filter: GardenFilter
): EntryRecord[] {
  const active = entries.filter((e) => !e.isDeleted);

  if (filter.type === 'all') return active;
  if (filter.type === 'mood') {
    return active.filter((e) => e.mood === filter.mood);
  }
  const monthStr = `${filter.year}-${String(filter.month).padStart(2, '0')}`;
  return active.filter((e) => format(parseISO(e.createdAt), 'yyyy-MM') === monthStr);
}

export function getAvailableMonths(entries: EntryRecord[]): { year: number; month: number; label: string }[] {
  const keys = new Set<string>();
  for (const e of entries.filter((x) => !x.isDeleted)) {
    keys.add(format(parseISO(e.createdAt), 'yyyy-MM'));
  }
  return [...keys]
    .sort()
    .map((k) => {
      const [y, m] = k.split('-').map(Number);
      const d = new Date(y!, m! - 1, 1);
      return { year: y!, month: m!, label: format(d, 'MMM yyyy') };
    });
}
