'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

import { EntryForm, plantButtonClass } from '@/components/write/EntryForm';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { useWriteDraft } from '@/lib/hooks/useWriteDraft';
import { useBloomStore } from '@/stores/useBloomStore';

/**
 * Quick-add memory sheet — opened from the global "+" dock on /garden so a
 * memory can be captured without leaving the meadow for the full /write page.
 * Presented as a bottom sheet (the native compose pattern) with the mood/tags
 * collapsed for fast capture and a "Plant it" button pinned above the keyboard.
 * On plant it hands off to the same `pendingPlant` → /plant-confirm celebration
 * flow that /write uses. The draft persists across open/close (via
 * `useWriteDraft({ mode: 'quick' })`) so dismissing the sheet no longer loses
 * what was typed.
 */
export function QuickWrite() {
  const router = useRouter();
  const open = useBloomStore((s) => s.quickWriteOpen);
  const setOpen = useBloomStore((s) => s.setQuickWriteOpen);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);

  const { draft, setDraft, reset, saveState, canPlant } = useWriteDraft({ mode: 'quick' });

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({ ...draft });
    reset();
    setOpen(false);
    router.push('/plant-confirm');
  };

  const handleClose = useCallback(() => setOpen(false), [setOpen]);

  return (
    <Sheet
      open={open}
      onClose={handleClose}
      title="Quick memory"
      description="Capture a thought — it grows a flower in your garden."
      footer={
        <Button
          size="lg"
          className={plantButtonClass}
          disabled={!canPlant}
          onClick={handlePlant}
        >
          Plant it
        </Button>
      }
    >
      <EntryForm
        draft={draft}
        setDraft={setDraft}
        canPlant={canPlant}
        onPlant={handlePlant}
        idPrefix="quick"
        saveState={saveState}
        extrasCollapsed
        hideSubmit
      />
    </Sheet>
  );
}
