import { describe, expect, it } from 'vitest';

import { applyGardenFilter } from '../../src/garden/filters';
import type { EntryRecord } from '../../src/types';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'e1',
    userId: 'local',
    title: null,
    content: 'A quiet memory.',
    mood: 'peaceful',
    inferredSentiment: null,
    tags: [],
    createdAt: '2026-05-15T12:00:00.000Z',
    updatedAt: '2026-05-15T12:00:00.000Z',
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: null,
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    weather: null,
    timePhase: 'day',
    sceneSeason: null,
    ...overrides,
  };
}

describe('applyGardenFilter — by mood', () => {
  it('matches entries whose primary mood equals the filter', () => {
    const entries = [entry({ id: 'e1', mood: 'joyful' }), entry({ id: 'e2', mood: 'angry' })];
    const result = applyGardenFilter(entries, { type: 'mood', mood: 'angry' });
    expect(result.map((e) => e.id)).toEqual(['e2']);
  });

  it('also matches entries where the mood is only a secondary/additional feeling', () => {
    const entries = [
      entry({ id: 'e1', mood: 'joyful', additionalMoods: ['angry'] }),
      entry({ id: 'e2', mood: 'peaceful' }),
    ];
    const result = applyGardenFilter(entries, { type: 'mood', mood: 'angry' });
    expect(result.map((e) => e.id)).toEqual(['e1']);
  });

  it('does not match entries lacking the mood entirely', () => {
    const entries = [entry({ id: 'e1', mood: 'joyful', additionalMoods: ['jealous'] })];
    const result = applyGardenFilter(entries, { type: 'mood', mood: 'angry' });
    expect(result).toEqual([]);
  });
});
