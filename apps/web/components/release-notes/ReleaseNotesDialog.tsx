'use client';

import { useEffect, useState } from 'react';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { ReleaseNote } from '@/lib/release-notes/notes';
import { selectUnseenNotes } from '@/lib/release-notes/select';
import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from '@/lib/release-notes/seen';
import { loadReleaseNotes } from '@/lib/release-notes/source';

import { ReleaseNotesCarousel } from './ReleaseNotesCarousel';

/**
 * Shows a dismissible "what's new" dialog to returning users when releases they haven't seen have
 * shipped. Loads the notes from Supabase on mount (client-only, so nothing renders during SSR); the
 * newest note's version is the "current" release. The first time the last-seen flag is ever absent
 * we seed it to the current version and show nothing, so brand-new users — and existing users on the
 * rollout open — don't get a backlog.
 */
export function ReleaseNotesDialog() {
  const [unseen, setUnseen] = useState<ReleaseNote[]>([]);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const notes = await loadReleaseNotes();
      const current = notes[0]?.version ?? null;
      if (cancelled || !current) return;
      setCurrentVersion(current);
      const lastSeen = getLastSeenReleaseVersion();
      if (lastSeen === null) {
        setLastSeenReleaseVersion(current);
        return;
      }
      const unseenNotes = selectUnseenNotes(notes, lastSeen);
      if (unseenNotes.length > 0) {
        setUnseen(unseenNotes);
        setOpen(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function dismiss() {
    if (currentVersion) setLastSeenReleaseVersion(currentVersion);
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
