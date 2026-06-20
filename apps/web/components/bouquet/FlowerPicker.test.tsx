import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { EntryRecord } from '@bloom/core';

import { FlowerPicker, type SelectedFlower } from './FlowerPicker';

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

function lastSelection(onChange: ReturnType<typeof vi.fn>): SelectedFlower[] {
  return onChange.mock.calls.at(-1)?.[0] ?? [];
}

describe('FlowerPicker', () => {
  it('caps selection at five flowers', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const entries = Array.from({ length: 6 }, (_, i) => entry({ id: `e${i}` }));
    render(<FlowerPicker entries={entries} onChange={onChange} />);

    const tiles = screen.getAllByRole('button', { name: /select memory/i });
    for (const tile of tiles) await user.click(tile);

    expect(lastSelection(onChange)).toHaveLength(5);
    // The sixth tile cannot be selected once the cap is reached.
    expect(tiles[5]).toBeDisabled();
  });

  it('toggles include-words for a selected flower', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FlowerPicker entries={[entry({ id: 'a' })]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /select memory/i }));
    expect(lastSelection(onChange)).toEqual([{ id: 'a', includeText: false }]);

    await user.click(screen.getByRole('button', { name: /include the words/i }));
    expect(lastSelection(onChange)).toEqual([{ id: 'a', includeText: true }]);
  });

  it('deselecting a flower removes it from the selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FlowerPicker entries={[entry({ id: 'a' })]} onChange={onChange} />);

    const tile = screen.getByRole('button', { name: /select memory/i });
    await user.click(tile);
    await user.click(tile);
    expect(lastSelection(onChange)).toEqual([]);
  });
});
