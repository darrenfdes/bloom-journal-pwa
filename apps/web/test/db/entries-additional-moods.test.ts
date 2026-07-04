import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db/client';
import { plantEntry, updateEntry } from '@/lib/db/repositories/entries';
import type { WriteDraft } from '@/lib/types';

const bounds = { width: 390, height: 800 };

function draft(overrides: Partial<WriteDraft> = {}): WriteDraft {
  return {
    title: '',
    content: 'A quiet morning',
    mood: 'joyful',
    additionalMoods: [],
    tags: [],
    createdAtOverride: null,
    revisitOf: null,
    ...overrides,
  };
}

beforeEach(async () => {
  const db = getDb();
  await db.entries.clear();
  await db.garden_meta.clear();
});

describe('plantEntry — additionalMoods', () => {
  it('stores additionalMoods from the draft on the new entry', async () => {
    const entry = await plantEntry(draft({ additionalMoods: ['angry', 'jealous'] }), bounds);
    expect(entry.additionalMoods).toEqual(['angry', 'jealous']);
  });

  it('stores an empty array when the draft has no additional moods', async () => {
    const entry = await plantEntry(draft(), bounds);
    expect(entry.additionalMoods).toEqual([]);
  });
});

describe('updateEntry — additionalMoods', () => {
  it('patches additionalMoods when provided', async () => {
    const entry = await plantEntry(draft(), bounds);
    const updated = await updateEntry(entry.id, { additionalMoods: ['cribby'] });
    expect(updated?.additionalMoods).toEqual(['cribby']);
  });

  it('leaves additionalMoods unchanged when not provided in the patch', async () => {
    const entry = await plantEntry(draft({ additionalMoods: ['angry'] }), bounds);
    const updated = await updateEntry(entry.id, { title: 'New title' });
    expect(updated?.additionalMoods).toEqual(['angry']);
  });
});
