'use client';

import { useRouter } from 'next/navigation';

import { EntryForm } from '@/components/write/EntryForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useWriteDraft } from '@/lib/hooks/useWriteDraft';
import { useBloomStore } from '@/stores/useBloomStore';

/**
 * Quick-add memory modal — opened from the global "+" dock on /garden so a
 * memory can be captured without leaving the meadow for the full /write page.
 * On plant it hands off to the same `pendingPlant` → /plant-confirm celebration
 * flow that /write uses. The draft persists across open/close (via
 * `useWriteDraft({ mode: 'quick' })`) so dismissing the modal no longer loses
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick memory</DialogTitle>
          <DialogDescription>
            Capture a thought — it grows a flower in your garden.
          </DialogDescription>
        </DialogHeader>

        <EntryForm
          draft={draft}
          setDraft={setDraft}
          canPlant={canPlant}
          onPlant={handlePlant}
          idPrefix="quick"
          saveState={saveState}
        />
      </DialogContent>
    </Dialog>
  );
}
