'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { ReleaseNote } from '@/lib/release-notes/notes';

/**
 * Renders one release note at a time with a Prev/Next picker to cycle through the rest. Purely
 * presentational — the parent owns which notes to show (the unseen ones) and what dismissing does.
 */
export function ReleaseNotesCarousel({
  notes,
  onDismiss,
}: {
  notes: ReleaseNote[];
  onDismiss: () => void;
}) {
  const [index, setIndex] = useState(0);
  const total = notes.length;
  const note = notes[index];
  if (!note) return null;

  return (
    <>
      <DialogHeader>
        <DialogTitle>{note.title}</DialogTitle>
        <DialogDescription>{note.date}</DialogDescription>
      </DialogHeader>
      <ul className="max-h-[50vh] list-disc space-y-1 overflow-y-auto pl-5 text-sm text-ink">
        {note.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {total > 1 ? (
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIndex((i) => i - 1)}
            disabled={index === 0}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Button>
          <span aria-live="polite">
            {index + 1} / {total}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIndex((i) => i + 1)}
            disabled={index === total - 1}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <DialogFooter>
        <Button onClick={onDismiss}>Got it</Button>
      </DialogFooter>
    </>
  );
}
