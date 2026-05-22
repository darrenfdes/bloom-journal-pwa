'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { MoodPicker } from '@/components/ui/MoodPicker';
import { TagInput } from '@/components/ui/TagInput';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getEntry } from '@/lib/db/repositories/entries';
import { saveWriteDraft } from '@/lib/db/repositories/settings';
import { resolveMood } from '@/lib/sentiment/infer';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

export default function RevisitPage() {
  const { parentId } = useParams<{ parentId: string }>();
  const router = useRouter();
  const draft = useBloomStore((s) => s.draft);
  const setDraft = useBloomStore((s) => s.setDraft);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const [parent, setParent] = useState<EntryRecord | null>(null);

  useEffect(() => {
    if (!parentId) return;
    getEntry(parentId).then((p) => {
      setParent(p);
      if (p) {
        setDraft({
          title: '',
          content: '',
          mood: null,
          tags: [],
          createdAtOverride: null,
          revisitOf: p.id,
        });
      }
    });
  }, [parentId, setDraft]);

  const persistDraft = useCallback(async () => {
    await saveWriteDraft(draft);
  }, [draft]);

  useEffect(() => {
    const timer = setTimeout(() => void persistDraft(), 600);
    return () => clearTimeout(timer);
  }, [draft, persistDraft]);

  const canPlant = draft.content.trim().length > 0;
  const resolved = resolveMood(draft.mood, draft.content);

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

      <Textarea
        value={draft.content}
        onChange={(e) => setDraft({ content: e.target.value })}
        placeholder="What has changed since you planted this memory?"
        rows={8}
      />

      <MoodPicker value={draft.mood} onChange={(mood) => setDraft({ mood })} />
      {!draft.mood && draft.content.trim().length > 12 && (
        <p className="text-xs text-ink-muted">Tone inferred: {resolved.mood}</p>
      )}

      <TagInput tags={draft.tags} onChange={(tags) => setDraft({ tags })} />

      <Button size="lg" disabled={!canPlant} onClick={handlePlant}>
        Plant revisit
      </Button>
    </div>
  );
}
