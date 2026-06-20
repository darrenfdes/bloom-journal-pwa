'use client';

import { useEffect, useRef } from 'react';

import { MoodPicker } from '@/components/ui/MoodPicker';
import { TagInput } from '@/components/ui/TagInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { DraftSaveState } from '@/lib/hooks/useWriteDraft';
import { resolveMood } from '@/lib/sentiment/infer';
import type { WriteDraft } from '@bloom/core';

type Props = {
  /** Draft + setter come from `useWriteDraft`, so every surface shares one shape. */
  draft: WriteDraft;
  setDraft: (patch: Partial<WriteDraft>) => void;
  canPlant: boolean;
  onPlant: () => void;
  /** Disambiguates input `id`s so the same field can render on several routes. */
  idPrefix: string;
  /** Hide the title field (e.g. revisits never set a title). */
  showTitle?: boolean;
  submitLabel?: string;
  /** Optional prompt line above the textarea; `onApplyPrompt` makes it clickable. */
  prompt?: string;
  onApplyPrompt?: () => void;
  /** Autosave indicator wired from `useWriteDraft`. */
  saveState?: DraftSaveState;
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

const SAVE_LABEL: Record<DraftSaveState, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Could not save draft',
};

/**
 * The single compose form shared by `/write`, `/revisit/[id]`, and `QuickWrite`.
 * Eliminates the per-surface drift in field sets, labels, and button styling —
 * every writing surface now renders the same, consistently-labelled fields.
 *
 * Accessibility is centralised here: the mood pills live in a labelled
 * fieldset, every input has a paired `<Label htmlFor>`, and the inferred-tone
 * hint is announced via `aria-live`.
 */
export function EntryForm({
  draft,
  setDraft,
  canPlant,
  onPlant,
  idPrefix,
  showTitle = true,
  submitLabel = 'Plant it',
  prompt,
  onApplyPrompt,
  saveState = 'idle',
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow the textarea with its content (ported from `JournalPanel`) so
  // long entries expand the page instead of scrolling inside a fixed box.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [draft.content]);

  const resolved = resolveMood(draft.mood, draft.content);
  const showInferred = !draft.mood && draft.content.trim().length > 12;
  const wordCount = countWords(draft.content);

  return (
    <div className="flex flex-1 flex-col gap-6">
      {showTitle && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-title`}>Title (optional)</Label>
          <Input
            id={`${idPrefix}-title`}
            value={draft.title}
            onChange={(e) => setDraft({ title: e.target.value })}
            placeholder="Give it a name"
          />
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <Label htmlFor={`${idPrefix}-content`}>Your thoughts</Label>
          {saveState !== 'idle' && (
            <span
              role="status"
              aria-live="polite"
              className={
                saveState === 'error' ? 'text-xs text-danger' : 'text-xs text-ink-muted'
              }
            >
              {SAVE_LABEL[saveState]}
            </span>
          )}
        </div>
        {prompt && (
          <button
            type="button"
            onClick={onApplyPrompt}
            className="text-left text-sm text-ink-muted hover:text-ink-soft"
          >
            Prompt: {prompt}
          </button>
        )}
        <Textarea
          ref={textareaRef}
          id={`${idPrefix}-content`}
          value={draft.content}
          onChange={(e) => setDraft({ content: e.target.value })}
          placeholder="Write freely..."
          rows={8}
          className="min-h-[160px] resize-none overflow-hidden"
        />
        <p className="text-xs text-ink-muted" aria-live="polite">
          {wordCount === 1 ? '1 word' : `${wordCount} words`}
          {showInferred && <> · tone inferred: {resolved.mood}</>}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-medium leading-none text-ink">Mood</legend>
        <MoodPicker value={draft.mood} onChange={(mood) => setDraft({ mood })} />
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-tags`}>Tags</Label>
        <TagInput tags={draft.tags} onChange={(tags) => setDraft({ tags })} />
      </div>

      <Button
        size="lg"
        className="h-12 w-full rounded-full border-0 text-base font-semibold shadow-lg shadow-sage/30 transition-all active:scale-[0.98] active:shadow-md disabled:shadow-none"
        disabled={!canPlant}
        onClick={onPlant}
      >
        {submitLabel}
      </Button>
    </div>
  );
}
