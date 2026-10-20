import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entry } from '../fixtures/entry';

const { getDekMock, getClientMock } = vi.hoisted(() => ({
  getDekMock: vi.fn(),
  getClientMock: vi.fn(),
}));

vi.mock('@/lib/crypto/key-session', () => ({
  getDek: getDekMock,
  clearDek: () => {},
  hasDek: () => true,
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: getClientMock,
}));

import { getDb } from '@/lib/db/client';
import { getOrCreateSettings, updateSettings } from '@/lib/db/repositories/settings';
import { pullForUser, pushPending, syncNow } from '@/lib/sync/engine';

type Store = {
  /** Rows returned by list selects, per table. */
  rows: Record<string, unknown[]>;
  /** Row returned by `.maybeSingle()`, per table. */
  single: Record<string, unknown>;
  /** Runs inside a table's upsert before it resolves (to simulate concurrent local edits). */
  onUpsert?: Record<string, () => Promise<void>>;
  /** Highest number of `entries` selects in flight at once. */
  maxConcurrentEntrySelects: number;
};

/** Minimal stub of the Supabase query builder used by the sync engine. */
function makeFakeClient(store: Store) {
  let activeEntrySelects = 0;

  class FakeQuery {
    constructor(private table: string) {}
    async upsert() {
      await store.onUpsert?.[this.table]?.();
      return { error: null };
    }
    select() {
      return this;
    }
    eq() {
      return this;
    }
    maybeSingle() {
      return Promise.resolve({ data: store.single[this.table] ?? null, error: null });
    }
    then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
      const data = store.rows[this.table] ?? [];
      if (this.table !== 'entries') return Promise.resolve({ data, error: null }).then(resolve);

      activeEntrySelects += 1;
      store.maxConcurrentEntrySelects = Math.max(
        store.maxConcurrentEntrySelects,
        activeEntrySelects,
      );
      return new Promise<{ data: unknown[]; error: null }>((done) =>
        setTimeout(() => {
          activeEntrySelects -= 1;
          done({ data, error: null });
        }, 10),
      ).then(resolve);
    }
  }
  return {
    from: (table: string) => new FakeQuery(table),
    functions: { invoke: vi.fn() },
  };
}

let store: Store;

beforeEach(async () => {
  store = { rows: {}, single: {}, maxConcurrentEntrySelects: 0 };
  getClientMock.mockReturnValue(makeFakeClient(store));
  getDekMock.mockReset();
  getDekMock.mockResolvedValue(
    await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']),
  );
  const db = getDb();
  await Promise.all([db.entries.clear(), db.app_settings.clear(), db.garden_meta.clear()]);
});

describe('pull: app settings', () => {
  it('applies remote reminder prefs without wiping client-only settings', async () => {
    await getOrCreateSettings();
    await updateSettings({ birthday: '1990-04-12', useBirthdayForStars: true, pinEnabled: true });
    store.single.app_settings = {
      user_id: 'user-1',
      reminder_enabled: true,
      reminder_hour: 7,
      reminder_minute: 30,
      updated_at: '2026-07-01T00:00:00.000Z',
    };

    await pullForUser('user-1');

    const settings = await getOrCreateSettings();
    expect(settings.reminderEnabled).toBe(true);
    expect(settings.reminderHour).toBe(7);
    expect(settings.reminderMinute).toBe(30);
    expect(settings.birthday).toBe('1990-04-12');
    expect(settings.useBirthdayForStars).toBe(true);
    expect(settings.pinEnabled).toBe(true);
  });
});

describe('push: edits made while an upload is in flight', () => {
  it('keeps an entry pending when it changes during the upsert', async () => {
    const db = getDb();
    await db.entries.put({
      ...entry({ id: 'e1', updatedAt: '2026-07-01T10:00:00.000Z' }),
      userId: 'user-1',
      pendingPush: true,
      syncedAt: null,
    });
    // The user favourites the entry while the first version is still uploading.
    store.onUpsert = {
      entries: async () => {
        await db.entries.update('e1', {
          isFavourited: true,
          updatedAt: '2026-07-01T10:00:01.000Z',
          pendingPush: true,
        });
      },
    };

    await pushPending('user-1');

    const row = await db.entries.get('e1');
    expect(row?.isFavourited).toBe(true);
    expect(row?.pendingPush).toBe(true);
  });

  it('clears pending once the uploaded version is still the latest', async () => {
    const db = getDb();
    await db.entries.put({
      ...entry({ id: 'e1', updatedAt: '2026-07-01T10:00:00.000Z' }),
      userId: 'user-1',
      pendingPush: true,
      syncedAt: null,
    });

    await pushPending('user-1');

    const row = await db.entries.get('e1');
    expect(row?.pendingPush).toBe(false);
    expect(row?.syncedAt).toEqual(expect.any(String));
  });
});

describe('sync operations run one at a time', () => {
  it('does not interleave overlapping syncs', async () => {
    await Promise.all([syncNow('user-1'), syncNow('user-1'), pullForUser('user-1')]);

    expect(store.maxConcurrentEntrySelects).toBe(1);
  });
});
