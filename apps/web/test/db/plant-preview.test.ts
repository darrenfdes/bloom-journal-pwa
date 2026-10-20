import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { buildFlowerGenome } from '@bloom/core/flowers/genome';

import { getDb } from '@/lib/db/client';
import { plantEntry } from '@/lib/db/repositories/entries';
import { buildPlantPreviewEntry } from '@/lib/plant/preview';
import type { WriteDraft } from '@/lib/types';

const bounds = { width: 390, height: 800 };
const now = new Date('2026-07-01T12:00:00.000Z');

const draft: WriteDraft = {
  title: '  A walk by the river ',
  content: 'The water was so calm today, I felt grateful and at peace.\n',
  mood: null,
  additionalMoods: [],
  tags: ['walks'],
  createdAtOverride: '2026-07-01T11:00:00.000Z',
  revisitOf: null,
};

function genomeOf(entry: Parameters<typeof buildFlowerGenome>[0]) {
  return buildFlowerGenome(entry, { now });
}

beforeEach(async () => {
  const db = getDb();
  await db.entries.clear();
  await db.garden_meta.clear();
});

describe('plant preview', () => {
  it('previews exactly the bloom that gets planted', async () => {
    const preview = buildPlantPreviewEntry(draft, 'entry-123', now);
    const planted = await plantEntry(draft, bounds, undefined, { id: 'entry-123' });

    expect(planted.id).toBe('entry-123');
    expect(genomeOf({ ...preview, mood: preview.mood! })).toEqual(
      genomeOf({ ...planted, mood: planted.mood! }),
    );
  });

  it('derives the preview seed from the id rather than a constant', () => {
    const a = buildPlantPreviewEntry(draft, 'entry-a', now);
    const b = buildPlantPreviewEntry(draft, 'entry-b', now);
    expect(a.flowerSeed).not.toBe(b.flowerSeed);
  });
});
