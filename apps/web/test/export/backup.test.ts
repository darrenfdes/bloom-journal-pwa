import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it } from 'vitest';

import { getDb } from '@/lib/db/client';
import { listEntries } from '@/lib/db/repositories/entries';
import { importBackup } from '@/lib/export/backup';
import { setActiveSyncUser } from '@/lib/sync/engine';

function fakeFile(content: string): File {
  return { text: async () => content } as unknown as File;
}

// `.rejects.toThrow(matcher)` can't read Error.message under this jsdom env, so assert manually.
async function rejectionMessage(p: Promise<unknown>): Promise<string> {
  try {
    await p;
    return '';
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

function sampleEntry(id: string) {
  return {
    id,
    userId: 'someone-else',
    title: null,
    content: `entry ${id}`,
    mood: null,
    inferredSentiment: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    flowerSeed: 1,
    flowerStyle: '{}',
    gardenPosition: null,
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
  };
}

beforeEach(async () => {
  const db = getDb();
  await db.entries.clear();
  await db.garden_meta.clear();
  setActiveSyncUser(null);
});

describe('importBackup', () => {
  it('rejects a file that is not valid JSON', async () => {
    expect(await rejectionMessage(importBackup(fakeFile('not json at all')))).toMatch(
      /valid JSON/
    );
  });

  it('rejects an unrecognised backup version', async () => {
    const payload = JSON.stringify({ version: 99, entries: [] });
    expect(await rejectionMessage(importBackup(fakeFile(payload)))).toMatch(
      /Unrecognised backup/
    );
  });

  it('imports entries owned by the current user and queues them for push', async () => {
    const payload = JSON.stringify({
      version: 1,
      entries: [sampleEntry('e1'), sampleEntry('e2')],
    });

    const { imported } = await importBackup(fakeFile(payload));
    expect(imported).toBe(2);

    const entries = await listEntries();
    expect(entries).toHaveLength(2);

    const rows = await getDb().entries.toArray();
    for (const row of rows) {
      expect(row.userId).toBe('local');
      expect(row.pendingPush).toBe(true);
    }
  });
});
