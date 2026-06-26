import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ReleaseNote } from '@/lib/release-notes/notes';

import { ReleaseNotesCarousel } from './ReleaseNotesCarousel';

const notes: ReleaseNote[] = [
  { version: '0.3.0', date: '2026-03-01', title: 'Release Three', items: ['three-a', 'three-b'] },
  { version: '0.2.0', date: '2026-02-01', title: 'Release Two', items: ['two-a'] },
  { version: '0.1.0', date: '2026-01-01', title: 'Release One', items: ['one-a'] },
];

// The carousel renders Radix dialog primitives (DialogTitle/Description), so it must live inside a
// Dialog — mirror its real usage inside the modal.
function renderCarousel(props: { notes: ReleaseNote[]; onDismiss: () => void }) {
  return render(
    <Dialog open onOpenChange={() => {}}>
      <DialogContent>
        <ReleaseNotesCarousel {...props} />
      </DialogContent>
    </Dialog>
  );
}

describe('ReleaseNotesCarousel', () => {
  it('shows the first note and a page indicator', () => {
    renderCarousel({ notes, onDismiss: () => {} });
    expect(screen.getByText('Release Three')).toBeInTheDocument();
    expect(screen.getByText('three-a')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('Next advances to the following note', async () => {
    renderCarousel({ notes, onDismiss: () => {} });
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('Release Two')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('Prev goes back to the previous note', async () => {
    renderCarousel({ notes, onDismiss: () => {} });
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(screen.getByText('Release Three')).toBeInTheDocument();
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });

  it('disables Prev on the first page and Next on the last page', async () => {
    renderCarousel({ notes, onDismiss: () => {} });
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /next/i })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('3 / 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /prev/i })).toBeEnabled();
  });

  it('calls onDismiss when "Got it" is clicked', async () => {
    const onDismiss = vi.fn();
    renderCarousel({ notes, onDismiss });
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('hides the picker when there is only one note', () => {
    renderCarousel({ notes: [notes[1]!], onDismiss: () => {} });
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ \/ \d+/)).not.toBeInTheDocument();
  });
});
