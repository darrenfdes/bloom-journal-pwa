import { describe, expect, it } from 'vitest';

import { toReferenceEntry } from '@/lib/garden/bloom/adapt';
import { entry } from '../fixtures/entry';

describe('toReferenceEntry', () => {
  it('parses ISO createdAt into a Date', () => {
    const iso = '2026-03-15T10:30:00.000Z';
    const ref = toReferenceEntry(entry({ createdAt: iso }));
    expect(ref.createdAt).toBeInstanceOf(Date);
    expect(ref.createdAt.toISOString()).toBe(iso);
  });

  it('maps weather category to display label', () => {
    const ref = toReferenceEntry(
      entry({
        weather: {
          category: 'heavy_rain',
          windSpeed: 0,
          cloudCover: 0,
          visibility: 0,
          precipitation: 0,
          temperature: 0,
          coords: { lat: 0, lon: 0 },
          locationName: null,
        },
      })
    );
    expect(ref.weather).toBe('Heavy rain');
  });

  it('defaults weather to Clear when snapshot is absent', () => {
    expect(toReferenceEntry(entry({ weather: null })).weather).toBe('Clear');
  });

  it('maps timePhase to meadow phase key', () => {
    const ref = toReferenceEntry(entry({ timePhase: 'golden_hour' }));
    expect(ref.timePhase).toBe('golden');
  });

  it('falls back empty title to blank string', () => {
    expect(toReferenceEntry(entry({ title: null })).title).toBe('');
    expect(toReferenceEntry(entry({ title: '  ' })).title).toBe('');
    expect(toReferenceEntry(entry({ title: 'My day' })).title).toBe('My day');
  });

  it('derives place from weather locationName', () => {
    const ref = toReferenceEntry(
      entry({
        weather: {
          category: 'clear',
          windSpeed: 0,
          cloudCover: 0,
          visibility: 0,
          precipitation: 0,
          temperature: 0,
          coords: { lat: 15, lon: 73 },
          locationName: 'Mapusa',
        },
      })
    );
    expect(ref.place).toBe('Mapusa');
  });
});
