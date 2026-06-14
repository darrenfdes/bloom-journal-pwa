'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { MoodPicker } from '@/components/ui/MoodPicker';
import { TagInput } from '@/components/ui/TagInput';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useBloomStore } from '@/stores/useBloomStore';
import type { Mood } from '@bloom/core';

/**
 * Quick-add memory modal — opened from the global "+" dock on /garden so a memory can be
 * captured without leaving the meadow for the full /write page. On plant it hands off to
 * the same `pendingPlant` → /plant-confirm celebration flow that /write uses.
 */
export function QuickWrite() {
  const router = useRouter();
  const open = useBloomStore((s) => s.quickWriteOpen);
  const setOpen = useBloomStore((s) => s.setQuickWriteOpen);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  const canPlant = content.trim().length > 0;

  const reset = () => {
    setTitle('');
    setContent('');
    setMood(null);
    setTags([]);
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({
      title,
      content,
      mood,
      tags,
      createdAtOverride: null,
      revisitOf: null,
    });
    setOpen(false);
    reset();
    router.push('/plant-confirm');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick memory</DialogTitle>
          <DialogDescription>Capture a thought — it grows a flower in your garden.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="quick-title">Title (optional)</Label>
          <Input
            id="quick-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quick-content">Your thoughts</Label>
          <Textarea
            id="quick-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write freely..."
            rows={5}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label>Mood</Label>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <TagInput tags={tags} onChange={setTags} />
        </div>

        <Button
          size="lg"
          className="h-12 w-full rounded-full border-0 text-base font-semibold shadow-lg shadow-sage/30 transition-all active:scale-[0.98] disabled:shadow-none"
          disabled={!canPlant}
          onClick={handlePlant}
        >
          Plant it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
