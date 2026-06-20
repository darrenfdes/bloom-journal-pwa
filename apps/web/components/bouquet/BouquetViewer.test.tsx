import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { buildBouquet } from '@bloom/core';
import type { EntryRecord } from '@bloom/core';

import { BouquetViewer } from './BouquetViewer';

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

describe('BouquetViewer', () => {
  it('shows a friendly message when the key is missing', () => {
    render(<BouquetViewer state={{ status: 'missing-key' }} />);
    expect(screen.getByText(/key/i)).toBeInTheDocument();
  });

  it('shows a friendly message when the bouquet is not found', () => {
    render(<BouquetViewer state={{ status: 'not-found' }} />);
    expect(screen.getByText(/couldn’t find|could not be found|not be found/i)).toBeInTheDocument();
  });

  it('renders the arrangement, note, and from name when ready', () => {
    const payload = buildBouquet([entry()], { from: 'Mara', note: 'thinking of you' });
    render(<BouquetViewer state={{ status: 'ready', payload }} />);

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByText('thinking of you')).toBeInTheDocument();
    expect(screen.getByText(/Mara/)).toBeInTheDocument();
  });

  it('shows included words only for flowers that opted in', () => {
    const payload = buildBouquet(
      [
        entry({ id: 'shared', title: 'Shared', content: 'These words travel.' }),
        entry({ id: 'private', content: 'These stay home.' }),
      ],
      { includeTextFor: ['shared'] },
    );
    render(<BouquetViewer state={{ status: 'ready', payload }} />);

    expect(screen.getByText('These words travel.')).toBeInTheDocument();
    expect(screen.queryByText('These stay home.')).not.toBeInTheDocument();
  });

  it('calls onKeep when Keep is pressed', async () => {
    const user = userEvent.setup();
    const onKeep = vi.fn();
    const payload = buildBouquet([entry()]);
    render(<BouquetViewer state={{ status: 'ready', payload }} onKeep={onKeep} />);

    await user.click(screen.getByRole('button', { name: /keep/i }));
    expect(onKeep).toHaveBeenCalledTimes(1);
  });
});
