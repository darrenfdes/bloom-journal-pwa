import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { EntryRecord } from '@bloom/core';

import { BouquetBuilder } from './BouquetBuilder';

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

describe('BouquetBuilder', () => {
  it('keeps the download actions disabled until a flower is gathered', async () => {
    const user = userEvent.setup();
    render(<BouquetBuilder entries={[entry({ id: 'a' })]} canShareLink={false} />);

    const file = screen.getByRole('button', { name: /\.bloom/i });
    const image = screen.getByRole('button', { name: /image/i });
    expect(file).toBeDisabled();
    expect(image).toBeDisabled();

    await user.click(screen.getByRole('button', { name: /select memory/i }));
    expect(file).toBeEnabled();
    expect(image).toBeEnabled();
  });

  it('offers a recipient field alongside the sender name', () => {
    render(<BouquetBuilder entries={[entry({ id: 'a' })]} canShareLink={false} />);
    expect(screen.getByLabelText(/^to/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
  });

  it('enables reshuffle only once two or more flowers are gathered', async () => {
    const user = userEvent.setup();
    render(
      <BouquetBuilder entries={[entry({ id: 'a' }), entry({ id: 'b' })]} canShareLink={false} />,
    );

    const tiles = screen.getAllByRole('button', { name: /select memory/i });
    await user.click(tiles[0]!);
    expect(screen.getByRole('button', { name: /reshuffle/i })).toBeDisabled();

    await user.click(tiles[1]!);
    expect(screen.getByRole('button', { name: /reshuffle/i })).toBeEnabled();
  });

  it('shows a live preview of the gathered arrangement', async () => {
    const user = userEvent.setup();
    render(
      <BouquetBuilder entries={[entry({ id: 'a' }), entry({ id: 'b' })]} canShareLink={false} />,
    );

    expect(screen.queryByLabelText(/A bouquet of/i)).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: /select memory/i })[0]);
    expect(screen.getByLabelText(/A bouquet of 1 flower/i)).toBeInTheDocument();
  });

  it('only offers the link action when link sharing is available', () => {
    const { rerender } = render(
      <BouquetBuilder entries={[entry({ id: 'a' })]} canShareLink={false} />,
    );
    expect(screen.queryByRole('button', { name: /link/i })).not.toBeInTheDocument();

    rerender(<BouquetBuilder entries={[entry({ id: 'a' })]} canShareLink />);
    expect(screen.getByRole('button', { name: /link/i })).toBeInTheDocument();
  });
});
