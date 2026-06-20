import { describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { bouquetSvgMarkup, wrapText } from './image';

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

function countFlowers(svg: string): number {
  return (svg.match(/data-flower/g) ?? []).length;
}

function countGreenery(svg: string): number {
  return (svg.match(/data-greenery/g) ?? []).length;
}

describe('bouquetSvgMarkup', () => {
  it('produces a standalone svg the requested width', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { size: 400 });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain('width="400"');
    // Taller than wide — room beneath the tie for the ribbon tails.
    expect(svg).toContain('viewBox="0 0 400 ');
  });

  it('embeds one rendered flower per stem', () => {
    const three = Array.from({ length: 3 }, (_, i) => entry({ id: `e${i}`, flowerSeed: i + 1 }));
    const { flowers } = buildBouquet(three);
    const svg = bouquetSvgMarkup(flowers);
    expect(countFlowers(svg)).toBe(3);
    // The flower bodies render as real svg paths, not a placeholder.
    expect(svg).toContain('<path');
  });

  it('is well-formed XML — the image rasterises by loading the svg as strict XML', () => {
    // A bare attribute (e.g. `data-flower`) is valid HTML but breaks XML parsing, which silently
    // fails the PNG export. Parsing as application/xml here guards that regression.
    const five = Array.from({ length: 5 }, (_, i) => entry({ id: `e${i}`, flowerSeed: i + 1 }));
    const { flowers } = buildBouquet(five);
    const svg = bouquetSvgMarkup(flowers, { from: 'Mara & co' });
    const doc = new DOMParser().parseFromString(svg, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('[data-flower]')).toHaveLength(5);
  });

  it('adds a sender caption only when a name is given', () => {
    const { flowers } = buildBouquet([entry()]);
    expect(bouquetSvgMarkup(flowers, { from: 'Mara' })).toContain('Mara');
    expect(bouquetSvgMarkup(flowers, { from: null })).not.toContain('</text>');
  });

  it('addresses the card to a recipient when given', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { to: 'Sarah' });
    expect(svg).toContain('To Sarah');
    expect(svg).toContain('</text>');
    expect(bouquetSvgMarkup(flowers, { to: null })).not.toContain('</text>');
  });

  it('prints as much of the note as fits', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { note: 'Thinking of you today' });
    expect(svg).toContain('Thinking');
    expect(svg).toContain('</text>');
  });

  it('truncates a very long note with an ellipsis', () => {
    const { flowers } = buildBouquet([entry()]);
    const long = Array.from({ length: 120 }, (_, i) => `word${i}`).join(' ');
    const svg = bouquetSvgMarkup(flowers, { note: long });
    expect(svg).toContain('…');
    // The whole note can't possibly fit.
    expect(svg).not.toContain('word119');
  });

  it('omits the note text block when there is no note', () => {
    const { flowers } = buildBouquet([entry()]);
    expect(bouquetSvgMarkup(flowers, {})).not.toContain('</text>');
  });

  it('embeds one greenery accent per chosen kind', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { greenery: ['reeds', 'wheat'] });
    expect(countGreenery(svg)).toBe(2);
  });

  it('caps greenery at three accents to keep the tie balanced', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, {
      greenery: ['reeds', 'wheat', 'fern', 'sprigs', 'babys-breath'],
    });
    expect(countGreenery(svg)).toBe(3);
  });

  it('layers greenery behind the flowers', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { greenery: ['reeds'] });
    expect(svg.indexOf('data-greenery')).toBeLessThan(svg.indexOf('data-flower'));
  });

  it('renders no greenery layer when none are chosen', () => {
    const { flowers } = buildBouquet([entry()]);
    expect(bouquetSvgMarkup(flowers, {})).not.toContain('data-greenery');
  });

  it('stays well-formed XML with greenery accents (the image rasterises as strict XML)', () => {
    const { flowers } = buildBouquet([entry()]);
    const svg = bouquetSvgMarkup(flowers, { greenery: ['reeds', 'babys-breath', 'wheat'] });
    const doc = new DOMParser().parseFromString(svg, 'application/xml');
    expect(doc.querySelector('parsererror')).toBeNull();
    expect(doc.querySelectorAll('[data-greenery]')).toHaveLength(3);
  });

  it('keeps every gradient id unique so accents do not collide in one document', () => {
    const { flowers } = buildBouquet([entry()]);
    // reeds, fern and wheat all define gradients; their ids must not clash with each other.
    const svg = bouquetSvgMarkup(flowers, { greenery: ['reeds', 'fern', 'wheat'] });
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(3);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('wrapText', () => {
  it('keeps a short line intact', () => {
    expect(wrapText('hello there', 20, 3)).toEqual(['hello there']);
  });

  it('wraps on word boundaries within the width', () => {
    const lines = wrapText('the quick brown fox jumps over', 12, 5);
    expect(lines.every((l) => l.length <= 12)).toBe(true);
    expect(lines.join(' ')).toBe('the quick brown fox jumps over');
  });

  it('caps at the line budget and ends with an ellipsis', () => {
    const lines = wrapText('one two three four five six seven eight nine ten', 9, 2);
    expect(lines).toHaveLength(2);
    expect(lines[1]!.endsWith('…')).toBe(true);
    expect(lines.every((l) => l.length <= 9)).toBe(true);
  });

  it('returns nothing for empty text', () => {
    expect(wrapText('   ', 10, 3)).toEqual([]);
  });
});
