import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db/client';
import { plantEntry } from '@/lib/db/repositories/entries';
import { getActiveSyncUser, reparentLocalEntries, setActiveSyncUser } from '@/lib/sync/engine';
import type { WriteDraft } from '@/lib/types';

const bounds = { width: 390, height: 800 };

function draft(content: string): WriteDraft {
  return {
    title: '',
    content,
    mood: null,
    additionalMoods: [],
    tags: [],
    createdAtOverride: null,
    revisitOf: null,
  };
}

beforeEach(async () => {
  const db = getDb();
  await db.entries.clear();
  await db.garden_meta.clear();
  setActiveSyncUser(null);
});

describe('entry ownership', () => {
  it('stamps new entries with "local" when signed out', async () => {
    const entry = await plantEntry(draft('a quiet morning'), bounds);
    expect(getActiveSyncUser()).toBeNull();
    expect(entry.userId).toBe('local');
  });

  it('stamps new entries with the signed-in user id', async () => {
    setActiveSyncUser('user-123');
    const entry = await plantEntry(draft('planted while signed in'), bounds);
    expect(entry.userId).toBe('user-123');

    const stored = await getDb().entries.get(entry.id);
    expect(stored?.userId).toBe('user-123');
    expect(stored?.pendingPush).toBe(true);
  });
});

describe('reparentLocalEntries', () => {
  it('re-tags local-only entries to the user and queues them for push', async () => {
    await plantEntry(draft('one'), bounds);
    await plantEntry(draft('two'), bounds);

    const merged = await reparentLocalEntries('user-123');
    expect(merged).toBe(2);

    const rows = await getDb().entries.toArray();
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.userId).toBe('user-123');
      expect(row.pendingPush).toBe(true);
    }
  });

  it('leaves entries already owned by another account untouched', async () => {
    setActiveSyncUser('other-user');
    const owned = await plantEntry(draft('owned elsewhere'), bounds);
    setActiveSyncUser(null);
    await plantEntry(draft('local one'), bounds);

    const merged = await reparentLocalEntries('user-123');
    expect(merged).toBe(1);

    const stored = await getDb().entries.get(owned.id);
    expect(stored?.userId).toBe('other-user');
  });
});
