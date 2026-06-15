import { afterEach, describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowserClient: () => ({ functions: { invoke } }),
}));

import { clearDek, getDek, hasDek, KeyUnavailableError } from '@/lib/crypto/key-session';

function dekB64(): string {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const b of raw) binary += String.fromCharCode(b);
  return btoa(binary);
}

afterEach(() => {
  clearDek();
  invoke.mockReset();
});

describe('key-session', () => {
  it('fetches once and caches the DEK', async () => {
    invoke.mockResolvedValue({ data: { dek: dekB64() }, error: null });
    const a = await getDek();
    const b = await getDek();
    expect(a).toBe(b);
    expect(a.type).toBe('secret');
    expect(hasDek()).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('dedupes concurrent calls into one request', async () => {
    invoke.mockResolvedValue({ data: { dek: dekB64() }, error: null });
    const [a, b] = await Promise.all([getDek(), getDek()]);
    expect(a).toBe(b);
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('throws KeyUnavailableError on edge failure and allows a later retry', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    let err: unknown;
    try {
      await getDek();
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(KeyUnavailableError);
    expect(hasDek()).toBe(false);

    invoke.mockResolvedValueOnce({ data: { dek: dekB64() }, error: null });
    const key = await getDek();
    expect(key.type).toBe('secret');
  });
});
