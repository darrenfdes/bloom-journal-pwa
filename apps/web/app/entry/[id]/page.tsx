'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MOODS } from '@/lib/constants/moods';
import {
  countRevisits,
  getEntry,
  softDelete,
  toggleFavourite,
} from '@/lib/db/repositories/entries';
import type { EntryRecord } from '@bloom/core';
import { useBloomStore } from '@/stores/useBloomStore';

export default function EntryPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [revisitCount, setRevisitCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getEntry(id), countRevisits(id)])
      .then(([e, count]) => {
        setEntry(e);
        setRevisitCount(count);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const mood = entry ? MOODS.find((m) => m.id === entry.mood) : null;

  const handleFavourite = async () => {
    if (!entry) return;
    const updated = await toggleFavourite(entry.id);
    if (updated) {
      setEntry(updated);
      await refreshEntries();
      toast.success(updated.isFavourited ? 'Added to favourites' : 'Removed from favourites');
    }
  };

  const handleDelete = async () => {
    if (!entry) return;
    await softDelete(entry.id);
    await refreshEntries();
    setDeleteOpen(false);
    toast.success('Entry removed from garden');
    router.push('/garden');
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-ink-muted">Loading…</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-ink-muted">Entry not found.</p>
        <Button variant="outline" onClick={() => router.push('/garden')}>
          Back to garden
        </Button>
      </div>
    );
  }

  return (
    <article className="flex flex-1 flex-col gap-6">
      <header>
        <Button variant="ghost" className="-ml-2 mb-2" onClick={() => router.push('/garden')}>
          ← Garden
        </Button>
        <h1 className="font-display text-3xl font-semibold text-ink">
          {entry.title || 'Untitled'}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {mood && (
            <Badge variant="secondary">
              {mood.emoji} {mood.label}
            </Badge>
          )}
          <time className="text-sm text-ink-muted">
            {new Date(entry.createdAt).toLocaleString()}
          </time>
          {revisitCount > 0 && (
            <Badge variant="outline">{revisitCount} revisit{revisitCount === 1 ? '' : 's'}</Badge>
          )}
        </div>
        {entry.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </header>

      <div className="flex justify-center rounded-xl border border-parchment bg-cream p-6">
        <FlowerSvg entry={entry} size={180} animateSway />
      </div>

      <div className="rounded-xl border border-parchment bg-cream p-4">
        <p className="whitespace-pre-wrap text-base leading-relaxed text-ink">{entry.content}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={entry.isFavourited ? 'default' : 'outline'} onClick={() => void handleFavourite()}>
          {entry.isFavourited ? '★ Favourited' : '☆ Favourite'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/revisit/${entry.id}`}>Revisit this memory</Link>
        </Button>
        <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
          Remove
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from garden?</DialogTitle>
            <DialogDescription>
              This memory will be softly hidden. You can still recover it from backups later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleDelete()}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
