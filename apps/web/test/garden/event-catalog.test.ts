import { describe, expect, it } from 'vitest';

import { ALL_WORLD_EVENTS, nextWorldEvent } from '@/lib/garden/bloom/event-catalog';

describe('nextWorldEvent', () => {
  it('returns the earliest event strictly after the given day', () => {
    const today = ALL_WORLD_EVENTS[10]!.date;
    const next = nextWorldEvent(today);
    expect(next).not.toBeNull();
    // strictly after `today` — an event happening today is not "next"
    expect(next!.date > today).toBe(true);
    // and it is the earliest such event (none in the list fall between)
    const earlier = ALL_WORLD_EVENTS.find((e) => e.date > today && e.date < next!.date);
    expect(earlier).toBeUndefined();
  });

  it('returns null when no event lies after the day', () => {
    const last = ALL_WORLD_EVENTS[ALL_WORLD_EVENTS.length - 1]!.date;
    expect(nextWorldEvent(last)).toBeNull();
    expect(nextWorldEvent('9999-12-31')).toBeNull();
  });
});
