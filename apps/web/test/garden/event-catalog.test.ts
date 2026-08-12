import { describe, expect, it } from 'vitest';

import type { WorldEvent } from '@bloom/core/events';

import { ALL_WORLD_EVENTS, headlineForPhase, nextWorldEvent } from '@/lib/garden/bloom/event-catalog';

const ev = (over: Partial<WorldEvent> & Pick<WorldEvent, 'id' | 'type' | 'title' | 'rarity'>): WorldEvent => ({
  date: '2026-08-12',
  ...over,
});

const AUG12: WorldEvent[] = [
  ev({ id: 'meteor-PER-2026', type: 'meteorShower', title: 'Perseids peak', rarity: 'rare' }),
  ev({ id: 'newMoon-2026-08-12', type: 'newMoon', title: 'New Moon', rarity: 'common' }),
  ev({ id: 'solarEclipse-2026-08-12', type: 'solarEclipse', title: 'Solar Eclipse', rarity: 'epic' }),
];

describe('headlineForPhase', () => {
  it('names the night-sky event at night, not a rarer daytime eclipse', () => {
    expect(headlineForPhase(AUG12, 'night')?.title).toBe('Perseids peak');
    expect(headlineForPhase(AUG12, 'dusk')?.title).toBe('Perseids peak');
  });

  it('names the daytime eclipse during the day', () => {
    expect(headlineForPhase(AUG12, 'day')?.title).toBe('Solar Eclipse');
    expect(headlineForPhase(AUG12, 'dawn')?.title).toBe('Solar Eclipse');
  });

  it('returns null when nothing matches the current phase', () => {
    expect(headlineForPhase(AUG12, 'golden')).toBeNull();
  });
});

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
