import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Capture every Supabase upsert so we can assert what the push actually sent.
const upserts: Record<string, unknown[]> = {};
vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({
    // `afterLocalMutation` (fired by plantEntry) reads the session; stay signed-out so it no-ops.
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    from: (table: string) => ({
      upsert: (payload: unknown) => {
        (upserts[table] ??= []).push(payload);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

import { getDb } from '@/lib/db/client';
import { PREVIEW_USER_ID } from '@/lib/db/sentinels';
import { plantEntry } from '@/lib/db/repositories/entries';
import { pushPending, setActiveSyncUser } from '@/lib/sync/engine';
import type { WriteDraft } from '@/lib/types';

const bounds = { width: 390, height: 800 };

function draft(content: string): WriteDraft {
  return { title: '', content, mood: null, tags: [], createdAtOverride: null, revisitOf: null };
}

beforeEach(async () => {
  const db = getDb();
  await db.entries.clear();
  await db.garden_meta.clear();
  for (const key of Object.keys(upserts)) delete upserts[key];
  setActiveSyncUser(null);
});

describe('pushPending preview isolation', () => {
  it('pushes the real entry but never the preview-owned sample flower', async () => {
    setActiveSyncUser('user-123');
    const real = await plantEntry(draft('a real memory'), bounds);
    setActiveSyncUser(null);

    // A stray preview-owned record sitting in Dexie, flagged for push.
    await getDb().entries.put({
      ...real,
      id: 'preview-flower',
      userId: PREVIEW_USER_ID,
      pendingPush: true,
    });

    await pushPending('user-123');

    const pushedIds = (upserts.entries ?? [])
      .flat()
      .map((row) => (row as { id: string }).id);
    expect(pushedIds).toContain(real.id);
    expect(pushedIds).not.toContain('preview-flower');
  });
});
