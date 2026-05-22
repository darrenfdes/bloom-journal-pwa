import { differenceInCalendarDays, parseISO } from 'date-fns';

/** Entry planted ~one year ago — show a subtle anniversary blossom accent. */
export function isAnniversaryBlossom(createdAt: string, now = new Date()): boolean {
  const created = parseISO(createdAt);
  const days = Math.abs(differenceInCalendarDays(now, created));
  return days >= 360 && days <= 370;
}
