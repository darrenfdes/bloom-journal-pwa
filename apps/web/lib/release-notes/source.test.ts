import { afterEach, describe, expect, it, vi } from 'vitest';

const { getClientMock } = vi.hoisted(() => ({ getClientMock: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: getClientMock,
}));

import { loadReleaseNotes } from './source';

const rows = [
  { version: '0.1.0', date: '2026-06-26', title: 'v1', items: ['a'] },
  { version: '0.2.0', date: '2026-06-26', title: 'v2', items: ['b'] },
];

/** Minimal stub of the `from(...).select(...)` shape loadReleaseNotes uses. */
function clientReturning(result: { data: unknown; error: unknown }) {
  return { from: () => ({ select: () => Promise.resolve(result) }) };
}

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('loadReleaseNotes', () => {
  it('maps rows and sorts newest-first', async () => {
    getClientMock.mockReturnValue(clientReturning({ data: rows, error: null }));

    const notes = await loadReleaseNotes();

    expect(notes.map((n) => n.version)).toEqual(['0.2.0', '0.1.0']);
    expect(notes[0].items).toEqual(['b']);
  });

  it('replays the last successful fetch from cache on a query error', async () => {
    getClientMock.mockReturnValue(clientReturning({ data: rows, error: null }));
    await loadReleaseNotes();

    getClientMock.mockReturnValue(clientReturning({ data: null, error: { message: 'boom' } }));
    const notes = await loadReleaseNotes();

    expect(notes.map((n) => n.version)).toEqual(['0.2.0', '0.1.0']);
  });

  it('returns the cache when the client is unavailable (offline / no env)', async () => {
    getClientMock.mockReturnValue(clientReturning({ data: rows, error: null }));
    await loadReleaseNotes();

    getClientMock.mockReturnValue(null);
    const notes = await loadReleaseNotes();

    expect(notes.map((n) => n.version)).toEqual(['0.2.0', '0.1.0']);
  });

  it('returns an empty list when there is no cache and no client', async () => {
    getClientMock.mockReturnValue(null);

    expect(await loadReleaseNotes()).toEqual([]);
  });
});
