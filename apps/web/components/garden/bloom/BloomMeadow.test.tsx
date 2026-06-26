import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { buildSampleEntries } from '@/lib/garden/bloom/sample-entries';

import { entry } from '@/test/fixtures/entry';
import {
  mockPush,
  mockRefreshEntries,
  mockSoftDelete,
  mockToggleFavourite,
  renderMeadow,
  resetMeadowMocks,
} from '@/test/render-meadow';

describe('BloomMeadow', () => {
  beforeEach(() => {
    resetMeadowMocks();
  });

  describe('render & chrome', () => {
    it('shows preview empty-state copy', () => {
      renderMeadow({ preview: true, entries: [] });
      expect(screen.getByText('Bloom')).toBeInTheDocument();
      expect(screen.getByText('sky & weather preview')).toBeInTheDocument();
    });

    it('shows memory count and explore hint when entries exist', () => {
      const entries = buildSampleEntries().slice(0, 3);
      renderMeadow({ preview: true, entries });
      expect(screen.getByText(/3 memories/)).toBeInTheDocument();
      expect(screen.getByText('drag to explore · tap a flower to open')).toBeInTheDocument();
    });

    it('renders timeline month abbreviations', () => {
      renderMeadow({
        preview: true,
        entries: [
          entry({ id: 'jan', createdAt: new Date(2026, 0, 5) }),
          entry({ id: 'mar', createdAt: new Date(2026, 2, 1) }),
        ],
      });
      expect(screen.getByText("Jan '26")).toBeInTheDocument();
      expect(screen.getByText('Mar')).toBeInTheDocument();
    });
  });

  describe('preview controls', () => {
    it('shows phase and weather controls in preview mode', () => {
      renderMeadow({ preview: true, entries: [] });
      expect(screen.getByRole('button', { name: 'Dawn' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Night' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Snow' })).toBeInTheDocument();
    });

    it('hides manual controls in live mode', () => {
      renderMeadow({ live: true, entries: buildSampleEntries().slice(0, 2) });
      expect(screen.queryByRole('button', { name: 'Dawn' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    });

    it('switches phase when a phase pill is clicked', async () => {
      const user = userEvent.setup();
      renderMeadow({ preview: true, entries: [] });
      const night = screen.getByRole('button', { name: 'Night' });
      await user.click(night);
      expect(night).toHaveStyle({ background: 'rgb(243, 236, 217)' });
    });
  });

  describe('flower interaction', () => {
    it('opens memory card when a bloom is tapped', async () => {
      const user = userEvent.setup();
      const e = entry({
        id: 'tap-me',
        title: 'Morning coffee',
        content: 'Quiet start before the day.',
        createdAt: new Date(2026, 1, 10, 9, 0, 0),
      });
      renderMeadow({ preview: true, entries: [e] });

      await user.click(screen.getByRole('button', { name: /Morning coffee/ }));
      expect(screen.getByText('Quiet start before the day.')).toBeInTheDocument();
    });

    it('closes memory card from close button', async () => {
      const user = userEvent.setup();
      const e = entry({
        id: 'close-me',
        title: 'Evening walk',
        content: 'Long shadows on the lane.',
        createdAt: new Date(2026, 2, 5, 18, 0, 0),
      });
      renderMeadow({ preview: true, entries: [e] });

      await user.click(screen.getByRole('button', { name: /Evening walk/ }));
      expect(screen.getByText('Long shadows on the lane.')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByText('Long shadows on the lane.')).not.toBeInTheDocument();
      });
    });

    it('hides action buttons in preview mode', async () => {
      const user = userEvent.setup();
      const e = entry({ id: 'preview-only', title: 'Preview entry', createdAt: new Date(2026, 0, 1) });
      renderMeadow({ preview: true, entries: [e] });

      await user.click(screen.getByRole('button', { name: /Preview entry/ }));
      expect(screen.queryByRole('button', { name: /Open full memory/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Favourite/i })).not.toBeInTheDocument();
    });

    it('shows action buttons outside preview and wires them up', async () => {
      const user = userEvent.setup();
      const e = entry({ id: 'live-entry', title: 'Live entry', createdAt: new Date(2026, 0, 1) });
      renderMeadow({ preview: false, entries: [e] });

      await user.click(screen.getByRole('button', { name: /Live entry/ }));
      await user.click(screen.getByRole('button', { name: /Open full memory/i }));
      expect(mockPush).toHaveBeenCalledWith('/entry/live-entry');

      await user.click(screen.getByRole('button', { name: /Favourite/i }));
      expect(mockToggleFavourite).toHaveBeenCalledWith('live-entry');
      expect(mockRefreshEntries).toHaveBeenCalled();

      // first Delete click only asks for confirmation, it does not delete yet
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockSoftDelete).not.toHaveBeenCalled();

      // confirming actually removes the entry
      await user.click(screen.getByRole('button', { name: 'Delete' }));
      expect(mockSoftDelete).toHaveBeenCalledWith('live-entry');
      expect(mockRefreshEntries).toHaveBeenCalledTimes(2);
      await waitFor(() => {
        expect(screen.queryByText('Live entry')).not.toBeInTheDocument();
      });
    });
  });

  describe('memory replay card', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-06-14T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows replay card for same-day prior-year entry', async () => {
      const ann = entry({
        id: 'replay',
        title: 'One year ago',
        content: 'Anniversary memory.',
        createdAt: '2025-06-14T18:00:00.000Z',
      });
      renderMeadow({ preview: true, entries: [ann] });

      await act(async () => {
        vi.advanceTimersByTime(1200);
      });
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
      expect(screen.getByText(/One year ago/)).toBeInTheDocument();

      await act(async () => {
        screen.getByRole('button', { name: 'Dismiss' }).click();
      });
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });

    it('opens memory card from replay visit button', async () => {
      const ann = entry({
        id: 'visit-replay',
        title: 'Visit me',
        content: 'Replay body text.',
        createdAt: '2025-06-14T18:00:00.000Z',
      });
      renderMeadow({ preview: true, entries: [ann] });

      await act(async () => {
        vi.advanceTimersByTime(1200);
      });

      await act(async () => {
        screen.getByRole('button', { name: 'Open this memory' }).click();
        vi.advanceTimersByTime(700);
      });
      expect(screen.getByText('Replay body text.')).toBeInTheDocument();
    });
  });

  describe('revisit links', () => {
    it('shows parent revisit link and navigates between entries', async () => {
      const user = userEvent.setup();
      const parent = entry({
        id: 'parent',
        title: 'Original memory',
        content: 'Parent content.',
        createdAt: new Date(2025, 10, 16, 21, 0, 0),
      });
      const child = entry({
        id: 'child',
        title: 'Follow-up',
        content: 'Child content.',
        revisitOf: 'parent',
        createdAt: new Date(2026, 2, 9, 9, 0, 0),
      });
      renderMeadow({ preview: true, entries: [parent, child] });

      await user.click(screen.getByRole('button', { name: /Follow-up/ }));
      const card = screen.getByText('Child content.').closest('div');
      expect(card).toBeTruthy();
      await user.click(within(card!.parentElement!).getByRole('button', { name: /revisits/i }));
      expect(screen.getByText('Parent content.')).toBeInTheDocument();
    });

    it('shows child revisit links on parent entry', async () => {
      const user = userEvent.setup();
      const parent = entry({
        id: 'parent2',
        title: 'Root memory',
        content: 'Root body.',
        createdAt: new Date(2025, 10, 16, 21, 0, 0),
      });
      const child = entry({
        id: 'child2',
        title: 'Later revisit',
        content: 'Later body.',
        revisitOf: 'parent2',
        createdAt: new Date(2026, 2, 9, 9, 0, 0),
      });
      renderMeadow({ preview: true, entries: [parent, child] });

      await user.click(screen.getByRole('button', { name: /Root memory/ }));
      expect(screen.getByRole('button', { name: /revisited on/i })).toBeInTheDocument();
    });
  });
});
