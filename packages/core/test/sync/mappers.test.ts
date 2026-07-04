import { describe, expect, it } from 'vitest';

import { entryToRemote, remoteToEntry } from '../../src/sync/mappers';
import type { EntryRecord } from '../../src/types';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'e1',
    userId: 'local',
    title: null,
    content: 'A quiet memory.',
    mood: 'joyful',
    additionalMoods: [],
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

describe('entryToRemote / remoteToEntry — additionalMoods round trip', () => {
  it('carries additionalMoods through to the remote row', () => {
    const remote = entryToRemote(entry({ additionalMoods: ['angry', 'jealous'] }), 'user-1');
    expect(remote.additional_moods).toEqual(['angry', 'jealous']);
  });

  it('reconstructs additionalMoods from the remote row', () => {
    const remote = entryToRemote(entry({ additionalMoods: ['cribby'] }), 'user-1');
    const back = remoteToEntry(remote);
    expect(back.additionalMoods).toEqual(['cribby']);
  });

  it('defaults to an empty array when the remote row has none', () => {
    const remote = entryToRemote(entry(), 'user-1');
    remote.additional_moods = undefined as unknown as string[];
    expect(remoteToEntry(remote).additionalMoods).toEqual([]);
  });
});
