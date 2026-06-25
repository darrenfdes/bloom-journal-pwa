import { describe, expect, it } from 'vitest';

import {
  selectNotifications,
  type NotifyGroups,
  type SelectInput,
} from '../../../../supabase/functions/_shared/notify-select';
import type { NotifyEvent } from '../../../../supabase/functions/_shared/messages';

const ALL_ON: NotifyGroups = { celestial: true, festivities: true, memory: true };

function input(over: Partial<SelectInput>): SelectInput {
  return {
    events: [],
    localHour: 20,
    localDate: '2026-06-24',
    groups: ALL_ON,
    birthday: null,
    firstEntryDate: null,
    memoryYearsAgo: null,
    ...over,
  };
}

const fullMoon: NotifyEvent = {
  id: 'fm-2026-06-29',
  type: 'fullMoon',
  title: 'Strawberry Moon',
};
const solstice: NotifyEvent = {
  id: 'sol-2026-06-21',
  type: 'solstice',
  title: 'June Solstice',
  subtitle: 'Summer begins',
};
const solarEclipse: NotifyEvent = {
  id: 'se-2026-08-12',
  type: 'solarEclipse',
  title: 'Solar Eclipse',
};
const diwali: NotifyEvent = { id: 'diwali-2026', type: 'diwali', title: 'Diwali' };

describe('selectNotifications — celestial windows', () => {
  it('sends a night-sky event at the night window (hour 20)', () => {
    const out = selectNotifications(input({ events: [fullMoon], localHour: 20 }));
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('celestial:fm-2026-06-29');
    expect(out[0].title).toContain('Strawberry Moon');
  });

  it('does not send a night-sky event during the day', () => {
    expect(selectNotifications(input({ events: [fullMoon], localHour: 9 }))).toEqual([]);
  });

  it('sends a golden-hour event (solstice) at hour 17, not at night', () => {
    expect(selectNotifications(input({ events: [solstice], localHour: 17 }))).toHaveLength(1);
    expect(selectNotifications(input({ events: [solstice], localHour: 20 }))).toEqual([]);
  });

  it('sends a daytime event (solar eclipse) at hour 9', () => {
    const out = selectNotifications(input({ events: [solarEclipse], localHour: 9 }));
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('celestial:se-2026-08-12');
  });

  it('respects the celestial group toggle', () => {
    const out = selectNotifications(
      input({ events: [fullMoon], localHour: 20, groups: { ...ALL_ON, celestial: false } }),
    );
    expect(out).toEqual([]);
  });
});

describe('selectNotifications — festivities & milestones', () => {
  it('sends a holiday at the morning window (hour 9)', () => {
    const out = selectNotifications(input({ events: [diwali], localHour: 9 }));
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('festivity:diwali-2026');
  });

  it('does not send a holiday when festivities are off', () => {
    const out = selectNotifications(
      input({ events: [diwali], localHour: 9, groups: { ...ALL_ON, festivities: false } }),
    );
    expect(out).toEqual([]);
  });

  it('sends a birthday greeting when today matches the birthday MM-DD at hour 9', () => {
    const out = selectNotifications(
      input({ birthday: '1990-06-24', localDate: '2026-06-24', localHour: 9 }),
    );
    expect(out.map((n) => n.key)).toContain('milestone:birthday:2026');
  });

  it('sends an app-anniversary with the right number of years', () => {
    const out = selectNotifications(
      input({ firstEntryDate: '2024-06-24', localDate: '2026-06-24', localHour: 9 }),
    );
    const anniv = out.find((n) => n.key === 'milestone:anniversary:2026');
    expect(anniv).toBeDefined();
    expect(anniv?.body).toContain('2');
  });
});

describe('selectNotifications — revisit a memory', () => {
  it('sends a memory at midday (hour 11) when a prior-year entry exists', () => {
    const out = selectNotifications(
      input({ memoryYearsAgo: 2, localDate: '2026-06-24', localHour: 11 }),
    );
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('memory:2026-06-24');
    expect(out[0].body).toContain('2');
  });

  it('does not send a memory outside the midday window', () => {
    expect(selectNotifications(input({ memoryYearsAgo: 2, localHour: 10 }))).toEqual([]);
  });

  it('respects the memory group toggle', () => {
    const out = selectNotifications(
      input({ memoryYearsAgo: 2, localHour: 11, groups: { ...ALL_ON, memory: false } }),
    );
    expect(out).toEqual([]);
  });
});
