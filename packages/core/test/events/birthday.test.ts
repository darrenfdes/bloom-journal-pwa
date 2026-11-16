import { describe, expect, it } from 'vitest';

import { isBirthdayOn, personalEvents } from '../../src/events/events-runtime';

describe('personal birthday events', () => {
  const appInstallDate = '2026-03-24';

  it('uses the month and day without inventing an age for the default birthday', () => {
    const user = { birthday: '12-01', appInstallDate };
    expect(personalEvents('2026-12-01', user)).toEqual([
      expect.objectContaining({ type: 'birthday', title: 'Your Birthday', subtitle: undefined }),
    ]);
    expect(personalEvents('2027-01-01', user)).toEqual([]);
  });

  it('takes the age from a real birth date', () => {
    const user = { birthday: '1990-07-15', appInstallDate };
    expect(personalEvents('2026-07-15', user)).toEqual([
      expect.objectContaining({ type: 'birthday', subtitle: 'Turning 36' }),
    ]);
    expect(personalEvents('2026-12-01', user)).toEqual([]);
  });

  it('matches the local date and observes a leap-day birthday on Feb 28 in non-leap years', () => {
    expect(isBirthdayOn(new Date(2026, 1, 28, 23), '2000-02-29')).toBe(true);
    expect(isBirthdayOn(new Date(2028, 1, 28, 23), '2000-02-29')).toBe(false);
    expect(isBirthdayOn(new Date(2028, 1, 29, 23), '2000-02-29')).toBe(true);
  });
});
