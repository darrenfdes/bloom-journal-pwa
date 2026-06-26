'use client';

import { useEffect, useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CURRENT_RELEASE_VERSION, RELEASE_NOTES, type ReleaseNote } from '@/lib/release-notes/notes';
import { selectUnseenNotes } from '@/lib/release-notes/select';
import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from '@/lib/release-notes/seen';

import { ReleaseNotesCarousel } from './ReleaseNotesCarousel';

/**
 * Shows a dismissible "what's new" dialog to returning users when the app has shipped releases they
 * haven't seen. Reads/seeds the last-seen version on mount (client-only, so nothing renders during
 * SSR). The first time the flag is ever absent we seed it to the current version and show nothing,
 * so brand-new users — and existing users on the rollout open — don't get a backlog.
 */
export function ReleaseNotesDialog() {
  const [unseen, setUnseen] = useState<ReleaseNote[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!CURRENT_RELEASE_VERSION) return;
    const lastSeen = getLastSeenReleaseVersion();
    if (lastSeen === null) {
      setLastSeenReleaseVersion(CURRENT_RELEASE_VERSION);
      return;
    }
    const notes = selectUnseenNotes(RELEASE_NOTES, lastSeen);
    if (notes.length > 0) {
      setUnseen(notes);
      setOpen(true);
    }
  }, []);

  function dismiss() {
    if (CURRENT_RELEASE_VERSION) setLastSeenReleaseVersion(CURRENT_RELEASE_VERSION);
    setOpen(false);
  }

  if (unseen.length === 0) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) dismiss();
      }}
    >
      <DialogContent>
        <ReleaseNotesCarousel notes={unseen} onDismiss={dismiss} />
      </DialogContent>
    </Dialog>
  );
}
