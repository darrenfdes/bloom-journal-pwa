import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExploreHud } from '@/components/garden/explore/ExploreHud';

describe('ExploreHud', () => {
  it('fires onBack from the garden button', () => {
    const onBack = vi.fn();
    render(<ExploreHud onBack={onBack} hint={null} progress={null} />);
    fireEvent.click(screen.getByRole('button', { name: /back to garden/i }));
    expect(onBack).toHaveBeenCalled();
  });

  it('uses the app font variables (regression: --font-serif/--font-sans do not exist)', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    const back = screen.getByRole('button', { name: /back to garden/i });
    expect(back.style.fontFamily).toContain('--font-body');
  });

  it('shows the hint only when provided', () => {
    const { rerender } = render(
      <ExploreHud onBack={() => {}} hint="drag to look" progress={null} />,
    );
    expect(screen.getByText('drag to look')).toBeTruthy();
    rerender(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    expect(screen.queryByText('drag to look')).toBeNull();
  });

  it('shows the loading card with title, percent and bar width', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={0.4} />);
    expect(screen.getByText('Growing your meadow…')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy();
    const fill = document.querySelector<HTMLElement>('[data-progress-fill]');
    expect(fill?.style.width).toBe('40%');
  });

  it('hides the loading overlay at progress 1', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={1} />);
    expect(screen.queryByText('Growing your meadow…')).toBeNull();
  });

  it('toggles the controls panel from the help pill', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    const help = screen.getByRole('button', { name: /controls help/i });
    expect(help.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText('Wandering the meadow')).toBeNull();

    fireEvent.click(help);
    expect(help.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('Wandering the meadow')).toBeTruthy();

    fireEvent.click(help);
    expect(screen.queryByText('Wandering the meadow')).toBeNull();
  });

  it('lists keyboard controls by default and stick controls for coarse pointers', () => {
    const { rerender } = render(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    fireEvent.click(screen.getByRole('button', { name: /controls help/i }));
    expect(screen.getByText('WASD / arrows')).toBeTruthy();
    expect(screen.queryByText('stick')).toBeNull();

    rerender(<ExploreHud onBack={() => {}} hint={null} progress={null} coarsePointer />);
    expect(screen.getByText('stick')).toBeTruthy();
    expect(screen.queryByText('WASD / arrows')).toBeNull();
  });

  it('closes the panel with the close button and with Escape', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    const help = screen.getByRole('button', { name: /controls help/i });

    fireEvent.click(help);
    fireEvent.click(screen.getByRole('button', { name: /close help/i }));
    expect(screen.queryByText('Wandering the meadow')).toBeNull();

    fireEvent.click(help);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Wandering the meadow')).toBeNull();
  });

  it('credits the fox and fish models in the controls panel', () => {
    render(<ExploreHud onBack={() => {}} hint={null} progress={null} />);
    fireEvent.click(screen.getByRole('button', { name: /controls help/i }));
    expect(screen.getByText(/PixelMannen/)).toBeTruthy();
    expect(screen.getByText(/CC BY 4\.0/)).toBeTruthy();
    expect(screen.getByText(/Quaternius/)).toBeTruthy();
  });

  it('shows the month pill with dimmed neighbour hints when a month is provided', () => {
    const { rerender } = render(
      <ExploreHud
        onBack={() => {}}
        hint={null}
        progress={null}
        month={{ prev: 'May', current: 'June 2026', next: 'Jul' }}
      />,
    );
    expect(screen.getByText('June 2026')).toBeTruthy();
    expect(screen.getByText('‹ May')).toBeTruthy();
    expect(screen.getByText('Jul ›')).toBeTruthy();
    rerender(<ExploreHud onBack={() => {}} hint={null} progress={null} month={null} />);
    expect(screen.queryByText('June 2026')).toBeNull();
    expect(screen.queryByText(/‹|›/)).toBeNull();
  });

  it('omits the chevron for a missing neighbour at either end of the garden', () => {
    const { rerender } = render(
      <ExploreHud
        onBack={() => {}}
        hint={null}
        progress={null}
        month={{ prev: 'May', current: 'June 2026', next: null }}
      />,
    );
    expect(screen.getByText('‹ May')).toBeTruthy();
    expect(screen.queryByText(/›/)).toBeNull();
    rerender(
      <ExploreHud
        onBack={() => {}}
        hint={null}
        progress={null}
        month={{ prev: null, current: 'January 2026', next: 'Feb' }}
      />,
    );
    expect(screen.getByText('Feb ›')).toBeTruthy();
    expect(screen.queryByText(/‹/)).toBeNull();
  });
});
