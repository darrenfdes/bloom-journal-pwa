'use client';

import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

import { BackLink } from '@/components/layout/BackLink';
import { EntryForm } from '@/components/write/EntryForm';
import { PlantBar } from '@/components/write/PlantBar';
import { useWriteDraft } from '@/lib/hooks/useWriteDraft';
import { FIRST_OPEN_TAGLINE, JOURNAL_PROMPTS } from '@bloom/core/constants/prompts';
import { useBloomStore } from '@/stores/useBloomStore';

export default function WritePage() {
  const router = useRouter();
  const entries = useBloomStore((s) => s.entries);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);

  const { draft, setDraft, saveState, canPlant } = useWriteDraft({ mode: 'fresh' });

  const isFirstOpen = entries.length === 0;
  const prompt = useMemo(
    () => JOURNAL_PROMPTS[Math.floor(Date.now() / 86400000) % JOURNAL_PROMPTS.length],
    []
  );

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({ ...draft });
    router.push('/plant-confirm');
  };

  const applyPrompt = () => {
    // Only seed when empty, so we never overwrite something the user wrote.
    if (!draft.content.trim()) setDraft({ content: `${prompt}\n\n` });
  };

  return (
    <div className="flex flex-1 flex-col gap-6">
      <BackLink href="/garden" label="Garden" />

      <header>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {isFirstOpen ? 'Start your garden' : 'Plant a memory'}
        </h1>
        {isFirstOpen ? (
          <p className="mt-2 text-sm text-ink-muted">{FIRST_OPEN_TAGLINE}</p>
        ) : null}
      </header>

      <EntryForm
        draft={draft}
        setDraft={setDraft}
        canPlant={canPlant}
        onPlant={handlePlant}
        idPrefix="write"
        prompt={isFirstOpen ? undefined : prompt}
        onApplyPrompt={applyPrompt}
        saveState={saveState}
        hideSubmit
      />

      <PlantBar canPlant={canPlant} onPlant={handlePlant} />
    </div>
  );
}
