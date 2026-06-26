import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { CURRENT_RELEASE_VERSION, RELEASE_NOTES } from '@/lib/release-notes/notes';
import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from '@/lib/release-notes/seen';

import { ReleaseNotesDialog } from './ReleaseNotesDialog';

const latest = RELEASE_NOTES[0];

afterEach(() => {
  window.localStorage.clear();
});

describe('ReleaseNotesDialog', () => {
  it('on first run shows nothing and seeds the last-seen version to current', async () => {
    render(<ReleaseNotesDialog />);

    await waitFor(() => expect(getLastSeenReleaseVersion()).toBe(CURRENT_RELEASE_VERSION));
    expect(screen.queryByText(latest.title)).not.toBeInTheDocument();
  });

  it('shows unseen notes to a returning user on an older version', async () => {
    setLastSeenReleaseVersion('0.0.1');
    render(<ReleaseNotesDialog />);

    expect(await screen.findByText(latest.title)).toBeInTheDocument();
    expect(screen.getByText(latest.items[0])).toBeInTheDocument();
  });

  it('shows nothing when the user is already on the current version', async () => {
    setLastSeenReleaseVersion(CURRENT_RELEASE_VERSION!);
    render(<ReleaseNotesDialog />);

    // give the mount effect a chance to (not) open the dialog
    await Promise.resolve();
    expect(screen.queryByText(latest.title)).not.toBeInTheDocument();
  });

  it('marks the current version seen and closes when dismissed', async () => {
    setLastSeenReleaseVersion('0.0.1');
    render(<ReleaseNotesDialog />);

    const dismiss = await screen.findByRole('button', { name: /got it/i });
    await userEvent.click(dismiss);

    await waitFor(() => expect(screen.queryByText(latest.title)).not.toBeInTheDocument());
    expect(getLastSeenReleaseVersion()).toBe(CURRENT_RELEASE_VERSION);
  });
});
