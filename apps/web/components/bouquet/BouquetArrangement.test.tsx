import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { BouquetArrangement } from './BouquetArrangement';

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

describe('BouquetArrangement', () => {
  it('renders a single flower without error', () => {
    const bouquet = buildBouquet([entry()]);
    const { container } = render(<BouquetArrangement flowers={bouquet.flowers} />);
    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-bouquet-flower]')).toHaveLength(1);
  });

  it('renders five fanned flowers without error', () => {
    const entries = Array.from({ length: 5 }, (_, i) => entry({ id: `e${i}` }));
    const bouquet = buildBouquet(entries);
    const { container } = render(<BouquetArrangement flowers={bouquet.flowers} />);
    expect(container.querySelectorAll('[data-bouquet-flower]')).toHaveLength(5);
  });
});
