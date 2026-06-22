import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import type { KeptBouquetRow } from '@/lib/db/client';

import { BouquetCard } from './BouquetCard';

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

function kept(): KeptBouquetRow {
  const payload = buildBouquet([entry()], { from: 'Mara', note: 'thinking of you' });
  return {
    id: payload.id,
    payload,
    receivedAt: '2026-06-01T09:00:00.000Z',
    source: 'link',
    userId: 'local',
  };
}

describe('BouquetCard', () => {
  it('shows the sender name and opens on click', async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<BouquetCard bouquet={kept()} onOpen={onOpen} />);

    expect(screen.getByText(/Mara/)).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
