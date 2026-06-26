import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReleaseNote } from '@/lib/release-notes/notes';
import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from '@/lib/release-notes/seen';

const notes: ReleaseNote[] = [
  { version: '0.2.0', date: '2026-06-26', title: "What's new", items: ['Newest thing'] },
  { version: '0.1.0', date: '2026-06-26', title: "What's new in Bloom", items: ['Older thing'] },
];
const latest = notes[0];
const CURRENT = latest.version;

const { loadReleaseNotesMock } = vi.hoisted(() => ({ loadReleaseNotesMock: vi.fn() }));

vi.mock('@/lib/release-notes/source', () => ({
  loadReleaseNotes: loadReleaseNotesMock,
}));

import { ReleaseNotesDialog } from './ReleaseNotesDialog';

beforeEach(() => {
  loadReleaseNotesMock.mockResolvedValue(notes);
});

afterEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('ReleaseNotesDialog', () => {
  it('on first run shows nothing and seeds the last-seen version to current', async () => {
    render(<ReleaseNotesDialog />);

    await waitFor(() => expect(getLastSeenReleaseVersion()).toBe(CURRENT));
    expect(screen.queryByText(latest.items[0])).not.toBeInTheDocument();
  });

  it('shows unseen notes to a returning user on an older version', async () => {
    setLastSeenReleaseVersion('0.0.1');
    render(<ReleaseNotesDialog />);

    expect(await screen.findByText(latest.title)).toBeInTheDocument();
    expect(screen.getByText(latest.items[0])).toBeInTheDocument();
  });

  it('shows nothing when the user is already on the current version', async () => {
    setLastSeenReleaseVersion(CURRENT);
    render(<ReleaseNotesDialog />);

    await waitFor(() => expect(loadReleaseNotesMock).toHaveBeenCalled());
    expect(screen.queryByText(latest.items[0])).not.toBeInTheDocument();
  });

  it('marks the current version seen and closes when dismissed', async () => {
    setLastSeenReleaseVersion('0.0.1');
    render(<ReleaseNotesDialog />);

    const dismiss = await screen.findByRole('button', { name: /got it/i });
    await userEvent.click(dismiss);

    await waitFor(() => expect(screen.queryByText(latest.title)).not.toBeInTheDocument());
    expect(getLastSeenReleaseVersion()).toBe(CURRENT);
  });
});
