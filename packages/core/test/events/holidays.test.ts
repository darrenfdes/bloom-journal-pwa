import { describe, expect, it } from 'vitest';

import { getEventsForDate } from '../../src/events/events-runtime';
import { sceneEffectsForDay } from '../../src/events/scene-effects';
import type { EventsUserContext } from '../../src/events/types';

// Neutral user, far from any holiday date so personal events never collide.
const USER: EventsUserContext = { birthday: '1990-07-15', appInstallDate: '2020-05-20' };

/** Titles of events on a given ISO date (UTC bucketing — holidays carry no instant). */
const titlesOn = (iso: string) => getEventsForDate(iso, USER).map((e) => e.title);
const effectsOn = (iso: string) => sceneEffectsForDay(getEventsForDate(iso, USER)).map((r) => r.effect);

describe('festive holidays → fireworks', () => {
  it('New Year (Jan 1) every year', () => {
    expect(titlesOn('2027-01-01')).toContain('New Year');
    expect(effectsOn('2027-01-01')).toContain('fireworks');
  });

  it('Chinese New Year from the lunisolar table', () => {
    expect(titlesOn('2026-02-17')).toContain('Chinese New Year');
    expect(effectsOn('2026-02-17')).toContain('fireworks');
    expect(titlesOn('2045-02-17')).toContain('Chinese New Year');
  });

  it('Diwali from the lunisolar table', () => {
    expect(titlesOn('2026-11-08')).toContain('Diwali');
    expect(effectsOn('2030-10-26')).toContain('fireworks');
  });

  it('Holi from the lunisolar table', () => {
    expect(titlesOn('2026-03-04')).toContain('Holi');
    expect(effectsOn('2026-03-04')).toContain('fireworks');
  });
});

describe('Christmas → bright star', () => {
  it('Dec 25 every year maps to the christmasStar effect', () => {
    expect(titlesOn('2026-12-25')).toContain('Christmas');
    expect(effectsOn('2026-12-25')).toContain('christmasStar');
  });
});

describe('one-off fireworks (config)', () => {
  it('fires on 24 Jun 2026 only', () => {
    expect(titlesOn('2026-06-24')).toContain('Fireworks Test');
    expect(effectsOn('2026-06-24')).toContain('fireworks');
  });

  it('does not fire on 24 Jun in other years', () => {
    expect(titlesOn('2025-06-24')).not.toContain('Fireworks Test');
    expect(titlesOn('2027-06-24')).not.toContain('Fireworks Test');
  });
});
