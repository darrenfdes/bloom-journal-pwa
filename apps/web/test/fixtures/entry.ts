import type { EntryRecord } from '@bloom/core';

export function entry(
  overrides: Partial<Omit<EntryRecord, 'createdAt' | 'updatedAt'>> & {
    createdAt?: string | Date;
    updatedAt?: string;
  } = {},
): EntryRecord {
  const { createdAt: createdAtOverride, updatedAt: updatedAtOverride, ...rest } = overrides;
  const createdAt =
    createdAtOverride instanceof Date
      ? createdAtOverride.toISOString()
      : (createdAtOverride ?? new Date(2026, 0, 15, 12, 0, 0).toISOString());

  return {
    id: 'e1',
    userId: 'local',
    title: null,
    content: 'A memory.',
    mood: 'peaceful',
    additionalMoods: [],
    inferredSentiment: null,
    tags: [],
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: { x: 0, y: 0, z: 0, rotation: 0, scale: 1 },
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    weather: null,
    timePhase: 'day',
    sceneSeason: null,
    ...rest,
    createdAt,
    updatedAt: updatedAtOverride ?? createdAt,
  };
}
