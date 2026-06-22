import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { buildBouquet, type BouquetPayload } from '@bloom/core';

import { encryptKeptBouquet } from '@/lib/crypto/bouquet-keepsake-cipher';

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

import { getDb, type KeptBouquetRow } from '@/lib/db/client';
import { pullForUser, pushPending, reparentLocalEntries } from '@/lib/sync/engine';

type Store = {
  rows: Record<string, unknown[]>;
  upserts: Record<string, unknown[]>;
};

/** Minimal stub of the Supabase query builder used by the sync engine. */
function makeFakeClient(store: Store) {
  class FakeQuery {
    constructor(private table: string) {}
    upsert(payload: unknown) {
      (store.upserts[this.table] ??= []).push(payload);
      return Promise.resolve({ error: null });
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

function payload(id: string): BouquetPayload {
  return { ...buildBouquet([entry()], { from: 'Mara', note: 'for you' }), id };
}

function localRow(id: string, userId: string): KeptBouquetRow {
  return {
    id,
    payload: payload(id),
    receivedAt: '2026-06-01T09:00:00.000Z',
    source: 'link',
    userId,
    pendingPush: true,
    syncedAt: null,
  };
}

let store: Store;
let key: CryptoKey;

beforeEach(async () => {
  store = { rows: {}, upserts: {} };
  key = await makeKey();
  getClientMock.mockReturnValue(makeFakeClient(store));
  getDekMock.mockReset();
  getDekMock.mockResolvedValue(key);
  await Promise.all([getDb().bouquets.clear(), getDb().entries.clear()]);
});

describe('kept bouquet sync — push', () => {
  it('encrypts a pending kept bouquet before pushing, then marks it synced', async () => {
    await getDb().bouquets.put(localRow('b1', 'user-1'));

    await pushPending('user-1');

    const rows = (store.upserts.kept_bouquets?.[0] ?? []) as Array<{
      id: string;
      user_id: string;
      enc_blob: unknown;
      enc_version: number;
      received_at: string;
    }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('b1');
    expect(rows[0].user_id).toBe('user-1');
    expect(rows[0].enc_version).toBe(1);
    expect(typeof rows[0].enc_blob).toBe('string');
    expect(rows[0].received_at).toBe('2026-06-01T09:00:00.000Z');
    // No plaintext payload leaves the device.
    expect(JSON.stringify(rows[0])).not.toContain('for you');

    const local = await getDb().bouquets.get('b1');
    expect(local?.pendingPush).toBe(false);
    expect(typeof local?.syncedAt).toBe('string');
  });

  it('fails closed: a missing key leaves the kept bouquet pending and pushes nothing', async () => {
    getDekMock.mockRejectedValue(new Error('key unavailable'));
    await getDb().bouquets.put(localRow('b2', 'user-1'));

    await pushPending('user-1');

    expect(store.upserts.kept_bouquets).toBeUndefined();
    expect((await getDb().bouquets.get('b2'))?.pendingPush).toBe(true);
  });
});

describe('kept bouquet sync — pull', () => {
  it('decrypts a remote kept bouquet into the local shelf', async () => {
    const enc = await encryptKeptBouquet({ payload: payload('b3'), source: 'file' }, key);
    store.rows.kept_bouquets = [
      { id: 'b3', user_id: 'user-1', enc_blob: enc, enc_version: 1, received_at: '2026-06-02T10:00:00.000Z' },
    ];

    await pullForUser('user-1');

    const local = await getDb().bouquets.get('b3');
    expect(local?.userId).toBe('user-1');
    expect(local?.source).toBe('file');
    expect(local?.payload.note).toBe('for you');
    expect(local?.receivedAt).toBe('2026-06-02T10:00:00.000Z');
    expect(local?.pendingPush).toBe(false);
  });

  it('is insert-only: never overwrites an existing local keepsake', async () => {
    await getDb().bouquets.put({ ...localRow('b4', 'user-1'), pendingPush: false });
    const enc = await encryptKeptBouquet({ payload: payload('b4'), source: 'file' }, key);
    store.rows.kept_bouquets = [
      { id: 'b4', user_id: 'user-1', enc_blob: enc, enc_version: 1, received_at: '2030-01-01T00:00:00.000Z' },
    ];

    await pullForUser('user-1');

    const local = await getDb().bouquets.get('b4');
    expect(local?.source).toBe('link'); // original, not the remote 'file'
    expect(local?.receivedAt).toBe('2026-06-01T09:00:00.000Z');
  });

  it('skips an undecryptable keepsake but still applies the rest', async () => {
    const otherKey = await makeKey();
    const bad = await encryptKeptBouquet({ payload: payload('bad'), source: 'link' }, otherKey);
    const good = await encryptKeptBouquet({ payload: payload('good'), source: 'link' }, key);
    store.rows.kept_bouquets = [
      { id: 'bad', user_id: 'user-1', enc_blob: bad, enc_version: 1, received_at: '2026-06-01T00:00:00.000Z' },
      { id: 'good', user_id: 'user-1', enc_blob: good, enc_version: 1, received_at: '2026-06-01T00:00:00.000Z' },
    ];

    await pullForUser('user-1');

    expect(await getDb().bouquets.get('bad')).toBeUndefined();
    expect((await getDb().bouquets.get('good'))?.payload.id).toBe('good');
  });
});

describe('kept bouquet sync — reparent on connect', () => {
  it('re-tags local-only keepsakes to the user and queues them for push', async () => {
    await getDb().bouquets.put({ ...localRow('b5', 'local'), pendingPush: false });

    await reparentLocalEntries('user-1');

    const local = await getDb().bouquets.get('b5');
    expect(local?.userId).toBe('user-1');
    expect(local?.pendingPush).toBe(true);
  });
});
