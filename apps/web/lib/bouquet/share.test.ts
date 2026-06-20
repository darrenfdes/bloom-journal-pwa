import { describe, expect, it } from 'vitest';

import { parseFragmentKey } from './share';

describe('parseFragmentKey', () => {
  it('reads the key from a #k= fragment', () => {
    expect(parseFragmentKey('#k=abc123')).toBe('abc123');
  });

  it('preserves base64 +, / and = characters (URLSearchParams would mangle +)', () => {
    expect(parseFragmentKey('#k=ab+/cd==')).toBe('ab+/cd==');
  });

  it('works without the leading #', () => {
    expect(parseFragmentKey('k=xyz')).toBe('xyz');
  });

  it('returns null when there is no key', () => {
    expect(parseFragmentKey('')).toBeNull();
    expect(parseFragmentKey('#')).toBeNull();
    expect(parseFragmentKey('#other=1')).toBeNull();
  });
});
