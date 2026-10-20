import { createFlowerSeed } from '@bloom/core/flowers/genome';
import type { EntryRecord, WriteDraft } from '@bloom/core';

import { resolveMood } from '@/lib/sentiment/infer';

/**
 * The entry the plant-confirm screen previews. Built from the same id, seed and trimmed fields
 * `plantEntry` will store (pass the same `id` to it), so the previewed bloom is the one that grows.
 */
export function buildPlantPreviewEntry(draft: WriteDraft, id: string, now = new Date()): EntryRecord {
  const { mood, inferredSentiment } = resolveMood(draft.mood, draft.content);
  const nowIso = now.toISOString();
  return {
    id,
    userId: 'local',
    title: draft.title.trim() || null,
    content: draft.content.trim(),
    mood,
    additionalMoods: draft.additionalMoods,
    inferredSentiment,
    tags: draft.tags,
    createdAt: draft.createdAtOverride ?? nowIso,
    updatedAt: nowIso,
    flowerSeed: createFlowerSeed(id),
    flowerStyle: '{}',
    gardenPosition: null,
    isFavourited: false,
    revisitOf: draft.revisitOf,
    isDeleted: false,
  };
}
