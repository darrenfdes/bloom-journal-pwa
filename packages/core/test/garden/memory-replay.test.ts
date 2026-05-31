import { describe, expect, it } from 'vitest';

import type { EntryRecord } from '../../src/types';
import {
  findMemoryReplay,
  formatMemoryReplayLine,
  isMemoryReplayDismissed,
  memoryReplayExcerpt,
} from '../../src/garden/memory-replay';

const NOW = new Date(2026, 4, 30, 12, 0, 0);

function entry(overrides: Partial<EntryRecord> & { createdAt: string }): EntryRecord {
  return {
    id: overrides.id ?? 'e1',
    userId: 'local',
    title: null,
    content: 'Starting my new job today.',
    mood: null,
    inferredSentiment: null,
    tags: [],
    createdAt: overrides.createdAt,
    updatedAt: overrides.createdAt,
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: { x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    ...overrides,
  };
}

describe('findMemoryReplay', () => {
  it('picks one year ago over two years ago on the same calendar day', () => {
    const oneYear = entry({ id: 'y1', createdAt: new Date(2025, 4, 30, 18, 0, 0).toISOString() });
    const twoYear = entry({ id: 'y2', createdAt: new Date(2024, 4, 30, 10, 0, 0).toISOString() });
    const match = findMemoryReplay([twoYear, oneYear], NOW);
    expect(match?.entry.id).toBe('y1');
    expect(match?.yearsAgo).toBe(1);
  });

  it('returns closest past year when only older matches exist', () => {
    const threeYear = entry({ id: 'y3', createdAt: new Date(2023, 4, 30, 10, 0, 0).toISOString() });
    const match = findMemoryReplay([threeYear], NOW);
    expect(match?.yearsAgo).toBe(3);
  });

  it('returns null when no prior-year same day', () => {
    const today = entry({ createdAt: new Date(2026, 4, 30, 8, 0, 0).toISOString() });
    const otherDay = entry({ createdAt: new Date(2025, 5, 1, 8, 0, 0).toISOString() });
    expect(findMemoryReplay([today, otherDay], NOW)).toBeNull();
  });

  it('ignores deleted entries', () => {
    const deleted = entry({ createdAt: new Date(2025, 4, 30, 8, 0, 0).toISOString(), isDeleted: true });
    expect(findMemoryReplay([deleted], NOW)).toBeNull();
  });
});

describe('formatMemoryReplayLine', () => {
  it('builds rich copy from scene snapshot', () => {
    const e = entry({
      createdAt: new Date(2025, 4, 30, 20, 0, 0).toISOString(),
      title: 'starting my new job',
      timePhase: 'night',
      sceneSeason: 'summer',
      weather: {
        category: 'rain',
        windSpeed: 2,
        cloudCover: 80,
        visibility: 10,
        precipitation: 1,
        temperature: 22,
        coords: { lat: 19, lon: 72 },
        locationName: 'Mumbai, Maharashtra, India',
      },
    });
    const line = formatMemoryReplayLine(e, 1);
    expect(line).toContain('One year ago');
    expect(line).toContain('rainy');
    expect(line).toContain('Mumbai');
    expect(line).toContain('starting my new job');
  });

  it('degrades gracefully without scene data', () => {
    const e = entry({
      createdAt: new Date(2025, 4, 30, 8, 0, 0).toISOString(),
      content: 'A quiet reflection.',
    });
    const line = formatMemoryReplayLine(e, 1);
    expect(line).toBe('One year ago, you wrote about A quiet reflection.');
  });
});

describe('memoryReplayExcerpt', () => {
  it('prefers title over content', () => {
    expect(memoryReplayExcerpt(entry({ createdAt: '2025-05-30', title: 'My day' }))).toBe('My day');
  });
});

describe('isMemoryReplayDismissed', () => {
  it('is dismissed when same day and entry id', () => {
    const match = { entry: entry({ id: 'abc', createdAt: '2025-05-30' }), yearsAgo: 1 };
    expect(
      isMemoryReplayDismissed({ date: '2026-05-30', entryId: 'abc' }, match, NOW)
    ).toBe(true);
  });

  it('is not dismissed on a different day', () => {
    const match = { entry: entry({ id: 'abc', createdAt: '2025-05-30' }), yearsAgo: 1 };
    expect(
      isMemoryReplayDismissed({ date: '2026-05-29', entryId: 'abc' }, match, NOW)
    ).toBe(false);
  });
});
