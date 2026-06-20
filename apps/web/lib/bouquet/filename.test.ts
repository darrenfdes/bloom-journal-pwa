import { describe, expect, it } from 'vitest';

import { bouquetFilename } from './filename';

describe('bouquetFilename', () => {
  it('builds a poetic adjective-noun stem with the given extension', () => {
    expect(bouquetFilename({ id: 'abc-123' }, 'bloom')).toMatch(/^[a-z]+-[a-z]+\.bloom$/);
  });

  it('is deterministic for a given id', () => {
    expect(bouquetFilename({ id: 'same-id' }, 'png')).toBe(bouquetFilename({ id: 'same-id' }, 'png'));
  });

  it('shares one stem across extensions so the .bloom and .png match', () => {
    const bloom = bouquetFilename({ id: 'gift-9' }, 'bloom');
    const png = bouquetFilename({ id: 'gift-9' }, 'png');
    expect(bloom.replace(/\.bloom$/, '')).toBe(png.replace(/\.png$/, ''));
  });

  it('varies the stem across different ids', () => {
    const stems = new Set(
      Array.from({ length: 50 }, (_, i) => bouquetFilename({ id: `id-${i}` }, 'bloom')),
    );
    expect(stems.size).toBeGreaterThan(10);
  });
});
