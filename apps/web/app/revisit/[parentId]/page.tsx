'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { EntryForm } from '@/components/write/EntryForm';
import { useWriteDraft } from '@/lib/hooks/useWriteDraft';
import { getEntry } from '@/lib/db/repositories/entries';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

export default function RevisitPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const router = useRouter();
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const [parent, setParent] = useState<EntryRecord | null>(null);

  // Bind to the shared draft, seeded with `revisitOf` once the parent resolves.
  const { draft, setDraft, saveState, canPlant } = useWriteDraft({
    mode: 'revisit',
    revisitOf: parentId,
  });

  useEffect(() => {
    if (!parentId) return;
    void getEntry(parentId).then((p) => setParent(p));
  }, [parentId]);

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({ ...draft });
    router.push('/plant-confirm');
  };

  if (!parent) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Link href={`/entry/${parent.id}`} className="text-sm text-ink-soft hover:text-ink">
        ← Back to memory
      </Link>

      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">Revisit</h1>
        <p className="mt-2 text-sm text-ink-muted">
          A new bloom beside &ldquo;{parent.title || 'Untitled'}&rdquo;
        </p>
      </header>

      <EntryForm
        draft={draft}
        setDraft={setDraft}
        canPlant={canPlant}
        onPlant={handlePlant}
        idPrefix="revisit"
        showTitle={false}
        submitLabel="Plant revisit"
        saveState={saveState}
      />
    </div>
  );
}
