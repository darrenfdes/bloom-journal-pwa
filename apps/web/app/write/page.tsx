'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';

import { MoodPicker } from '@/components/ui/MoodPicker';
import { TagInput } from '@/components/ui/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FIRST_OPEN_TAGLINE, JOURNAL_PROMPTS } from '@bloom/core/constants/prompts';
import { saveWriteDraft } from '@/lib/db/repositories/settings';
import { resolveMood } from '@/lib/sentiment/infer';
import { useBloomStore } from '@/stores/useBloomStore';

export default function WritePage() {
  const router = useRouter();
  const entries = useBloomStore((s) => s.entries);
  const draft = useBloomStore((s) => s.draft);
  const setDraft = useBloomStore((s) => s.setDraft);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);

  const isFirstOpen = entries.length === 0;
  const prompt = useMemo(
    () => JOURNAL_PROMPTS[Math.floor(Date.now() / 86400000) % JOURNAL_PROMPTS.length],
    []
  );
  const canPlant = draft.content.trim().length > 0;

  const persistDraft = useCallback(async () => {
    await saveWriteDraft(draft);
  }, [draft]);

  useEffect(() => {
    const timer = setTimeout(() => void persistDraft(), 600);
    return () => clearTimeout(timer);
  }, [draft, persistDraft]);

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({ ...draft });
    router.push('/plant-confirm');
  };

  const applyPrompt = () => {
    if (!draft.content.trim()) {
      setDraft({ content: `${prompt}\n\n` });
    }
  };

  const resolved = resolveMood(draft.mood, draft.content);

  return (
    <div className="flex flex-1 flex-col gap-6 pb-[calc(2rem+var(--safe-bottom))]">
        <div className="flex items-center justify-between">
          <Link href="/garden" className="text-sm text-ink-soft hover:text-ink">
            ← Garden
          </Link>
          <Link href="/settings" className="text-sm text-ink-soft hover:text-ink">
            Settings
          </Link>
        </div>

        <header>
          <h1 className="font-display text-3xl font-semibold text-ink">
            {isFirstOpen ? 'Start your garden' : 'Plant a memory'}
          </h1>
          {isFirstOpen ? (
            <p className="mt-2 text-sm text-ink-muted">{FIRST_OPEN_TAGLINE}</p>
          ) : (
            <button
              type="button"
              onClick={applyPrompt}
              className="mt-2 text-left text-sm text-ink-muted hover:text-ink-soft"
            >
              Prompt: {prompt}
            </button>
          )}
        </header>

        <div className="space-y-2">
          <Label htmlFor="title">Title (optional)</Label>
          <Input
            id="title"
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            placeholder="Title (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Your thoughts</Label>
          <Textarea
            id="content"
            value={draft.content}
            onChange={(e) => setDraft({ content: e.target.value })}
            placeholder="Write freely..."
            rows={10}
          />
        </div>

        <div className="space-y-2">
          <Label>Mood</Label>
          <MoodPicker value={draft.mood} onChange={(mood) => setDraft({ mood })} />
          {!draft.mood && draft.content.trim().length > 12 && (
            <p className="text-xs text-ink-muted">Tone inferred: {resolved.mood}</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tags</Label>
            <TagInput tags={draft.tags} onChange={(tags) => setDraft({ tags })} />
          </div>

          <Button
            size="lg"
            className="h-12 w-full rounded-full border-0 text-base font-semibold shadow-lg shadow-sage/30 transition-all active:scale-[0.98] active:shadow-md disabled:shadow-none"
            disabled={!canPlant}
            onClick={handlePlant}
          >
            Plant it
          </Button>
        </div>
    </div>
  );
}
