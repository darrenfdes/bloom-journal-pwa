import { differenceInDays, parseISO } from 'date-fns';

export function daysSinceLastEntry(lastEntryAt: string | null): number | null {
  if (!lastEntryAt) return null;
  return differenceInDays(new Date(), parseISO(lastEntryAt));
}

export function isGardenWilted(lastEntryAt: string | null): boolean {
  const days = daysSinceLastEntry(lastEntryAt);
  return days != null && days > 3;
}

export function gardenFreshness(lastEntryAt: string | null): number {
  const days = daysSinceLastEntry(lastEntryAt);
  if (days == null) return 1;
  if (days <= 1) return 1;
  if (days <= 3) return 0.85;
  if (days <= 7) return 0.7;
  return 0.55;
}
