import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExploreMemoryCard } from '@/components/garden/explore/ExploreMemoryCard';
import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import { useBloomStore } from '@/stores/useBloomStore';
import { entry } from '../../fixtures/entry';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

const placed = () =>
  buildMeadowLayout([
    entry({
      id: 'mem1',
      title: 'A golden walk',
      content: 'We wandered the fields until dusk.',
      mood: 'joyful',
      tags: ['walk'],
      createdAt: new Date(2026, 3, 12),
    }),
  ]).entries[0]!;

describe('ExploreMemoryCard', () => {
  beforeEach(() => {
    push.mockClear();
  });

  it('shows the memory: title, date, mood chip, quote, tags', () => {
    render(<ExploreMemoryCard entry={placed()} onClose={() => {}} />);
    expect(screen.getByText('A golden walk')).toBeTruthy();
    expect(screen.getByText('Joyful')).toBeTruthy();
    expect(screen.getByText(/12 April 2026/)).toBeTruthy();
    expect(screen.getByText(/We wandered the fields/)).toBeTruthy();
    expect(screen.getByText('#walk')).toBeTruthy();
  });

  it('routes to the full memory page', () => {
    render(<ExploreMemoryCard entry={placed()} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /open full memory/i }));
    expect(push).toHaveBeenCalledWith('/entry/mem1');
  });

  it('closes via the close button', () => {
    const onClose = vi.fn();
    render(<ExploreMemoryCard entry={placed()} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('flags the memory card open in the store while mounted', () => {
    const { unmount } = render(<ExploreMemoryCard entry={placed()} onClose={() => {}} />);
    expect(useBloomStore.getState().memoryCardOpen).toBe(true);
    unmount();
    expect(useBloomStore.getState().memoryCardOpen).toBe(false);
  });
});
