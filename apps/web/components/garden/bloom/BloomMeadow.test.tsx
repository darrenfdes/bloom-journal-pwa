import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
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

// CometVisual drives an rAF loop; test/setup.ts stubs requestAnimationFrame to call back
// synchronously, which recurses infinitely if the real component mounts under test.
vi.mock('@/components/garden/bloom/shooting-star-visual', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/garden/bloom/shooting-star-visual')>();
  return { ...actual, CometVisual: () => <div data-testid="comet-visual" /> };
});

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

  describe('comet event (live mode)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('does not render the comet during daytime hours even when a comet event is active', () => {
      vi.setSystemTime(new Date(2026, 5, 14, 12, 0, 0));
      renderMeadow({ live: true, liveSceneEffects: ['cometArc'] });
      expect(screen.queryByTestId('comet-visual')).not.toBeInTheDocument();
    });

    it('still renders the comet at night when a comet event is active', () => {
      vi.setSystemTime(new Date(2026, 5, 14, 23, 0, 0));
      renderMeadow({ live: true, liveSceneEffects: ['cometArc'] });
      expect(screen.getByTestId('comet-visual')).toBeInTheDocument();
    });
  });

  describe('meadow drag', () => {
    it('captures the pointer on drag start so a release outside the scroller still ends the drag', () => {
      const { container } = renderMeadow({ preview: true, entries: [] });
      const scroller = container.querySelector('.bj-scroll') as HTMLDivElement;
      const capture = vi.fn();
      scroller.setPointerCapture = capture;

      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(event, { pointerType: 'mouse', button: 0, clientX: 120, pointerId: 3 });
      fireEvent(scroller, event);

      expect(capture).toHaveBeenCalledWith(3);
    });

    it('does not capture a pointer that starts on a flower', () => {
      const e = entry({ id: 'clickable-flower', title: 'Clickable flower' });
      const { container } = renderMeadow({ preview: true, entries: [e] });
      const scroller = container.querySelector('.bj-scroll') as HTMLDivElement;
      const capture = vi.fn();
      scroller.setPointerCapture = capture;
      const flower = screen.getByRole('button', { name: /Clickable flower/ });

      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(event, { pointerType: 'mouse', button: 0, clientX: 120, pointerId: 4 });
      fireEvent(flower, event);

      expect(capture).not.toHaveBeenCalled();
    });
  });

  describe('wheel scroll', () => {
    it('ignores vertical wheel when the meadow has nothing to scroll horizontally', () => {
      const { container } = renderMeadow({ preview: true, entries: [] });
      const scroller = container.querySelector('.bj-scroll') as HTMLDivElement;
      Object.defineProperty(scroller, 'scrollWidth', { value: 500, configurable: true });
      Object.defineProperty(scroller, 'clientWidth', { value: 500, configurable: true });
      fireEvent.wheel(scroller, { deltaY: 80, deltaX: 0 });
      expect(scroller.scrollLeft).toBe(0);
    });

    it('redirects vertical wheel to horizontal scroll when the meadow overflows', () => {
      const { container } = renderMeadow({ preview: true, entries: [] });
      const scroller = container.querySelector('.bj-scroll') as HTMLDivElement;
      Object.defineProperty(scroller, 'scrollWidth', { value: 2000, configurable: true });
      Object.defineProperty(scroller, 'clientWidth', { value: 500, configurable: true });
      fireEvent.wheel(scroller, { deltaY: 80, deltaX: 0 });
      expect(scroller.scrollLeft).toBe(80);
    });
  });

  describe('ambient creature timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('clears the pending spawn timer on unmount right after a manual trigger', async () => {
      const { unmount } = renderMeadow({ preview: true, creatures: true, entries: [] });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Shooting star' }));
      });
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('clears the inner timer too once a spawn has already fired', async () => {
      const { unmount } = renderMeadow({ preview: true, creatures: true, entries: [] });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Scenes' }));
      });
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Shooting star' }));
      });
      await act(async () => {
        vi.advanceTimersByTime(1600); // outer setTimeout(go, 1500|100) fires
      });
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('preview controls', () => {
    it('expands phase and weather sections from the rail in preview mode', async () => {
      const user = userEvent.setup();
      renderMeadow({ preview: true, entries: [] });

      // Controls start collapsed (meadow visible); expanding a section reveals its pills.
      await user.click(screen.getByRole('button', { name: 'Sky phase' }));
      expect(screen.getByRole('button', { name: 'Dawn' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Night' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Weather' }));
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Snow' })).toBeInTheDocument();
    });

    it('hides manual controls in live mode', () => {
      renderMeadow({ live: true, entries: buildSampleEntries().slice(0, 2) });
      // The preview controls rail is not rendered in live mode.
      expect(screen.queryByRole('button', { name: 'Sky phase' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Weather' })).not.toBeInTheDocument();
    });

    it('shows the Ducks scene trigger only in creatures mode', async () => {
      const user = userEvent.setup();
      const { unmount } = renderMeadow({ preview: true, entries: [] });
      // No Scenes section in the rail when creatures are off.
      expect(screen.queryByRole('button', { name: 'Scenes' })).not.toBeInTheDocument();
      unmount();

      renderMeadow({ preview: true, creatures: true, entries: [] });
      await user.click(screen.getByRole('button', { name: 'Scenes' }));
      expect(screen.getByRole('button', { name: 'Ducks' })).toBeInTheDocument();
    });

    it('switches phase when a phase pill is clicked', async () => {
      const user = userEvent.setup();
      renderMeadow({ preview: true, entries: [] });
      await user.click(screen.getByRole('button', { name: 'Sky phase' }));
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
      window.localStorage.clear();
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

    it('does not re-show after entries array identity changes with the same content', async () => {
      const ann = entry({
        id: 'replay-stable',
        title: 'Stable memory',
        content: 'Anniversary memory.',
        createdAt: '2025-06-14T18:00:00.000Z',
      });
      const { rerenderMeadow } = renderMeadow({ preview: true, entries: [ann] });

      await act(async () => {
        vi.advanceTimersByTime(1200);
      });
      expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();

      await act(async () => {
        screen.getByRole('button', { name: 'Dismiss' }).click();
      });
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();

      // simulate a favourite-toggle-triggered refreshEntries(): new array reference, same content
      await act(async () => {
        rerenderMeadow({ preview: true, entries: [{ ...ann }] });
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
    });

    it('does not re-show a dismissed replay after remounting the same day', async () => {
      const ann = entry({
        id: 'replay-persist',
        title: 'Persisted memory',
        content: 'Anniversary memory.',
        createdAt: '2025-06-14T18:00:00.000Z',
      });
      const { unmount } = renderMeadow({ preview: true, entries: [ann] });
      await act(async () => {
        vi.advanceTimersByTime(1200);
      });
      await act(async () => {
        screen.getByRole('button', { name: 'Dismiss' }).click();
      });
      unmount();

      renderMeadow({ preview: true, entries: [{ ...ann }] });
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
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
