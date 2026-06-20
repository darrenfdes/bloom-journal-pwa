import { describe, expect, it } from 'vitest';

import { buildBouquet } from '../../src/bouquet/build';
import { parseBouquet, serializeBouquet } from '../../src/bouquet/serialize';
import type { BouquetPayload } from '../../src/bouquet/types';
import type { EntryRecord } from '../../src/types';

function entry(overrides: Partial<EntryRecord> = {}): EntryRecord {
  return {
    id: 'e1',
    userId: 'local',
    title: null,
    content: 'A quiet memory.',
    mood: 'peaceful',
    inferredSentiment: null,
    tags: [],
    createdAt: '2026-05-15T12:00:00.000Z',
    updatedAt: '2026-05-15T12:00:00.000Z',
    flowerSeed: 1,
    flowerStyle: 'organic',
    gardenPosition: null,
    isFavourited: false,
    revisitOf: null,
    isDeleted: false,
    weather: null,
    timePhase: 'day',
    sceneSeason: null,
    ...overrides,
  };
}

describe('buildBouquet', () => {
  it('caps the arrangement at 5 flowers', () => {
    const entries = Array.from({ length: 8 }, (_, i) => entry({ id: `e${i}` }));
    const bouquet = buildBouquet(entries);
    expect(bouquet.flowers).toHaveLength(5);
  });

  it('throws when given no entries', () => {
    expect(() => buildBouquet([])).toThrow();
  });

  it('stamps the bouquet kind and version', () => {
    const bouquet = buildBouquet([entry()]);
    expect(bouquet.kind).toBe('bloom-bouquet');
    expect(bouquet.version).toBe(1);
    expect(bouquet.flowers).toHaveLength(1);
  });

  it('includes entry text only for opted-in ids', () => {
    const entries = [
      entry({ id: 'shared', title: 'Shared', content: 'These words travel.' }),
      entry({ id: 'private', title: 'Private', content: 'These stay home.' }),
    ];
    const bouquet = buildBouquet(entries, { includeTextFor: ['shared'] });

    const [shared, kept] = bouquet.flowers;
    expect(shared.content).toBe('These words travel.');
    expect(shared.title).toBe('Shared');
    expect(kept.content).toBeUndefined();
    expect(kept.title).toBeUndefined();
  });

  it('renders gifted flowers fresh (no wilt or fade)', () => {
    const bouquet = buildBouquet([entry()]);
    expect(bouquet.flowers[0].genome.wiltFactor).toBe(0);
    expect(bouquet.flowers[0].genome.fadeFactor).toBe(0);
  });

  it('snapshots a renderable genome and the entry date', () => {
    const bouquet = buildBouquet([entry({ mood: 'joyful', content: 'one two three' })]);
    const flower = bouquet.flowers[0];
    expect(typeof flower.genome.seed).toBe('number');
    expect(typeof flower.genome.bloomMood).toBe('string');
    expect(flower.createdAt).toBe('2026-05-15T12:00:00.000Z');
  });

  it('defaults a null-mood entry to a renderable mood', () => {
    const bouquet = buildBouquet([entry({ mood: null })]);
    expect(typeof bouquet.flowers[0].genome.bloomMood).toBe('string');
  });

  it('carries optional to/from names and a note', () => {
    const bouquet = buildBouquet([entry()], { to: 'Sarah', from: 'Mara', note: 'thinking of you' });
    expect(bouquet.to).toBe('Sarah');
    expect(bouquet.from).toBe('Mara');
    expect(bouquet.note).toBe('thinking of you');
  });

  it('defaults to/from/note to null when omitted', () => {
    const bouquet = buildBouquet([entry()]);
    expect(bouquet.to).toBeNull();
    expect(bouquet.from).toBeNull();
    expect(bouquet.note).toBeNull();
  });
});

describe('serializeBouquet / parseBouquet', () => {
  it('round-trips a built bouquet', () => {
    const original = buildBouquet([entry()], { to: 'Sarah', from: 'Mara', note: 'hi' });
    const restored = parseBouquet(serializeBouquet(original));
    expect(restored).toEqual(original);
    expect(restored.to).toBe('Sarah');
  });

  it('rejects non-JSON', () => {
    expect(() => parseBouquet('not json')).toThrow(/bouquet/i);
  });

  it('rejects the wrong kind', () => {
    const bad = JSON.stringify({ ...buildBouquet([entry()]), kind: 'something-else' });
    expect(() => parseBouquet(bad)).toThrow(/bouquet/i);
  });

  it('rejects an unknown version', () => {
    const bad = JSON.stringify({ ...buildBouquet([entry()]), version: 2 });
    expect(() => parseBouquet(bad)).toThrow(/bouquet/i);
  });

  it('rejects an empty arrangement', () => {
    const bad = JSON.stringify({ ...buildBouquet([entry()]), flowers: [] });
    expect(() => parseBouquet(bad)).toThrow(/bouquet/i);
  });

  it('rejects more than 5 flowers', () => {
    const one = buildBouquet([entry()]);
    const bad = JSON.stringify({ ...one, flowers: Array(6).fill(one.flowers[0]) });
    expect(() => parseBouquet(bad)).toThrow(/bouquet/i);
  });

  it('rejects a malformed genome', () => {
    const one = buildBouquet([entry()]);
    const bad = JSON.stringify({
      ...one,
      flowers: [{ createdAt: '2026-05-15T12:00:00.000Z', genome: { seed: 'nope' } }],
    });
    expect(() => parseBouquet(bad)).toThrow(/bouquet/i);
  });
});

// Type-level guard: BouquetPayload is the exported shape consumers depend on.
const _typecheck: BouquetPayload = buildBouquet([entry()]);
void _typecheck;
