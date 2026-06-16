import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { entryToRemote, type RemoteEntryRow } from '@bloom/core';

import { encryptRemoteRow } from '@/lib/crypto/remote-row-cipher';

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
import { pullForUser, pushPending } from '@/lib/sync/engine';
import { getSyncStatus } from '@/lib/sync/status';

type Store = {
  rows: Record<string, unknown[]>;
  upserts: Record<string, unknown[]>;
  /** Force a specific table's upsert to fail, to exercise error handling. */
  upsertErrors?: Record<string, Error>;
};

/** Minimal stub of the Supabase query builder used by the sync engine. */
function makeFakeClient(store: Store) {
  class FakeQuery {
    constructor(private table: string) {}
    upsert(payload: unknown) {
      (store.upserts[this.table] ??= []).push(payload);
      return Promise.resolve({ error: store.upsertErrors?.[this.table] ?? null });
    }
    select() {
      return this;
    }
    eq() {
      return this;
    }
    gte() {
      return this;
    }
    maybeSingle() {
      return Promise.resolve({ data: null, error: null });
    }
    then(resolve: (v: { data: unknown[]; error: null }) => unknown) {
      return Promise.resolve({ data: store.rows[this.table] ?? [], error: null }).then(resolve);
    }
  }
  return {
    from: (table: string) => new FakeQuery(table),
    functions: { invoke: vi.fn() },
  };
}

function makeKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]) as Promise<CryptoKey>;
}

let store: Store;
let key: CryptoKey;

beforeEach(async () => {
  store = { rows: {}, upserts: {} };
  key = await makeKey();
  getClientMock.mockReturnValue(makeFakeClient(store));
  getDekMock.mockReset();
  getDekMock.mockResolvedValue(key);
  await getDb().entries.clear();
});

describe('sync encryption', () => {
  it('encrypts entries before pushing to Supabase', async () => {
    await getDb().entries.put({
      ...entry({ id: 'e1', content: 'top secret', title: 'Diary', tags: ['x'], mood: 'joyful' }),
      userId: 'user-1',
      pendingPush: true,
      syncedAt: null,
    });

    await pushPending('user-1');

    const payload = (store.upserts.entries?.[0] ?? []) as RemoteEntryRow[];
    expect(payload).toHaveLength(1);
    expect(payload[0].enc_version).toBe(1);
    expect(typeof payload[0].enc_blob).toBe('string');
    expect(payload[0].content).toBeNull();
    expect(payload[0].title).toBeNull();
    expect(payload[0].mood).toBeNull();

    // local row is marked synced
    const local = await getDb().entries.get('e1');
    expect(local?.pendingPush).toBe(false);
  });

  it('decrypts encrypted rows on pull into local plaintext', async () => {
    const remoteRow = await encryptRemoteRow(
      entryToRemote(entry({ id: 'e2', content: 'remember this', mood: 'peaceful' }), 'user-1'),
      key,
    );
    store.rows.entries = [remoteRow];

    await pullForUser('user-1');

    const local = await getDb().entries.get('e2');
    expect(local?.content).toBe('remember this');
    expect(local?.mood).toBe('peaceful');
    expect(local?.userId).toBe('user-1');
  });

  it('fails closed: a missing key leaves entries pending and pushes nothing', async () => {
    getDekMock.mockRejectedValue(new Error('key unavailable'));
    await getDb().entries.put({
      ...entry({ id: 'e3', content: 'should not leak' }),
      userId: 'user-1',
      pendingPush: true,
      syncedAt: null,
    });

    await pushPending('user-1');

    expect(store.upserts.entries).toBeUndefined();
    const local = await getDb().entries.get('e3');
    expect(local?.pendingPush).toBe(true);
  });
});

describe('sync pull resilience', () => {
  it('skips an undecryptable row but still applies the rest', async () => {
    const otherKey = await makeKey();
    const badRow = await encryptRemoteRow(
      entryToRemote(entry({ id: 'bad', content: 'unreadable' }), 'user-1'),
      otherKey, // encrypted with a different key → decrypt fails under the session key
    );
    const goodRow = await encryptRemoteRow(
      entryToRemote(entry({ id: 'good', content: 'readable' }), 'user-1'),
      key,
    );
    store.rows.entries = [badRow, goodRow];

    await pullForUser('user-1');

    expect(await getDb().entries.get('bad')).toBeUndefined();
    expect((await getDb().entries.get('good'))?.content).toBe('readable');
    expect(getSyncStatus().lastError).toMatch(/1 entry couldn't be read/);
  });

  it('still syncs plaintext rows when the key is unavailable', async () => {
    getDekMock.mockRejectedValue(new Error('key unavailable'));
    const legacyRow = entryToRemote(entry({ id: 'legacy', content: 'plain text' }), 'user-1');
    const encRow = await encryptRemoteRow(
      entryToRemote(entry({ id: 'enc', content: 'secret' }), 'user-1'),
      key,
    );
    store.rows.entries = [legacyRow, encRow];

    await pullForUser('user-1');

    expect((await getDb().entries.get('legacy'))?.content).toBe('plain text');
    expect(await getDb().entries.get('enc')).toBeUndefined();
    expect(getSyncStatus().lastError).toMatch(/1 entry couldn't be read/);
  });
});

describe('sync push error handling', () => {
  it('surfaces a failed metadata upsert instead of reporting success', async () => {
    store.upsertErrors = { garden_meta: new Error('meta upsert failed') };
    await getDb().entries.put({
      ...entry({ id: 'p1', content: 'hello' }),
      userId: 'user-1',
      pendingPush: true,
      syncedAt: null,
    });

    await pushPending('user-1');

    // The entries upsert still succeeded and the row was marked synced...
    expect((store.upserts.entries ?? []).length).toBe(1);
    expect((await getDb().entries.get('p1'))?.pendingPush).toBe(false);
    // ...but the failed garden_meta upsert was reported, not silently swallowed.
    expect(getSyncStatus().lastError).toBe('meta upsert failed');
  });
});
