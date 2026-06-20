'use client';

import { Shuffle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { buildBouquet, MAX_BOUQUET_FLOWERS, type EntryRecord } from '@bloom/core';

import { downloadBouquetFile } from '@/lib/bouquet/file';
import { downloadBouquetPng } from '@/lib/bouquet/image';
import { shuffleOrder } from '@/lib/bouquet/layout';
import { shareBouquetLink, shareOrCopyLink } from '@/lib/bouquet/share';

import { BouquetArrangement } from './BouquetArrangement';
import { FlowerPicker, type SelectedFlower } from './FlowerPicker';

type Props = {
  entries: EntryRecord[];
  /** Whether the user is signed in and can create an encrypted share link. */
  canShareLink: boolean;
};

/**
 * The "make a bouquet" flow: pick up to {@link MAX_BOUQUET_FLOWERS} flowers, add a note and an
 * optional name, preview the tied arrangement (reshuffle to rearrange the stems), then download a
 * `.bloom` file or an image — and/or share an encrypted link (when signed in).
 */
export function BouquetBuilder({ entries, canShareLink }: Props) {
  const [selection, setSelection] = useState<SelectedFlower[]>([]);
  const [order, setOrder] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);

  // Keep a display order alongside the picker's selection: preserve existing positions, append newly
  // gathered flowers, drop removed ones. Reshuffle permutes this without touching the picker.
  useEffect(() => {
    setOrder((prev) => {
      const ids = selection.map((s) => s.id);
      const kept = prev.filter((id) => ids.includes(id));
      const added = ids.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
  }, [selection]);

  const orderedSelection = useMemo(() => {
    const byId = new Map(selection.map((s) => [s.id, s]));
    return order.map((id) => byId.get(id)).filter((s): s is SelectedFlower => Boolean(s));
  }, [order, selection]);

  const selectedEntries = useMemo(() => {
    const byId = new Map(entries.map((e) => [e.id, e]));
    return orderedSelection
      .map((s) => byId.get(s.id))
      .filter((e): e is EntryRecord => Boolean(e));
  }, [orderedSelection, entries]);

  const includeTextFor = useMemo(
    () => orderedSelection.filter((s) => s.includeText).map((s) => s.id),
    [orderedSelection],
  );

  const hasSelection = selectedEntries.length > 0;
  const canReshuffle = selectedEntries.length > 1;

  const previewFlowers = useMemo(
    () => (hasSelection ? buildBouquet(selectedEntries, { includeTextFor }).flowers : []),
    [hasSelection, selectedEntries, includeTextFor],
  );

  const makePayload = () =>
    buildBouquet(selectedEntries, {
      includeTextFor,
      from: from.trim() || null,
      note: note.trim() || null,
    });

  const handleReshuffle = () => setOrder((prev) => shuffleOrder(prev));

  const handleDownloadFile = () => {
    downloadBouquetFile(makePayload());
    toast.success('Bouquet saved as a .bloom file');
  };

  const handleDownloadImage = async () => {
    try {
      await downloadBouquetPng(makePayload());
      toast.success('Bouquet saved as an image');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save the image.');
    }
  };

  const handleShareLink = async () => {
    setSharing(true);
    try {
      const { url } = await shareBouquetLink(makePayload());
      const how = await shareOrCopyLink(url);
      toast.success(how === 'copied' ? 'Link copied to clipboard' : 'Link shared');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create a share link.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className="space-y-2">
        <h2 className="font-display text-lg text-ink">Gather your flowers</h2>
        <p className="text-sm text-ink-muted">
          Pick up to {MAX_BOUQUET_FLOWERS}. For each, choose whether to include the words.
        </p>
        {entries.length > 0 ? (
          <FlowerPicker entries={entries} max={MAX_BOUQUET_FLOWERS} onChange={setSelection} />
        ) : (
          <p className="text-sm text-ink-muted">Plant a few memories first, then come back.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="space-y-1">
          <label htmlFor="bouquet-from" className="text-sm text-ink-soft">
            Your name (optional)
          </label>
          <Input
            id="bouquet-from"
            value={from}
            maxLength={60}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="from…"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="bouquet-note" className="text-sm text-ink-soft">
            A short note (optional)
          </label>
          <Textarea
            id="bouquet-note"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Thinking of you…"
          />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg text-ink">Preview</h2>
          {hasSelection ? (
            <Button
              type="button"
              variant="ghost"
              className="-mr-2 gap-1.5 text-ink-soft"
              disabled={!canReshuffle}
              onClick={handleReshuffle}
            >
              <Shuffle className="h-4 w-4" />
              Reshuffle
            </Button>
          ) : null}
        </div>
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-parchment bg-gradient-to-b from-cream to-cream-dark p-4 shadow-inner">
          {hasSelection ? (
            <BouquetArrangement flowers={previewFlowers} size={280} />
          ) : (
            <p className="text-sm text-ink-muted">Your tied bouquet will appear here.</p>
          )}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Button variant="outline" disabled={!hasSelection} onClick={handleDownloadFile}>
          Download .bloom file
        </Button>
        <Button
          variant="outline"
          disabled={!hasSelection}
          onClick={() => void handleDownloadImage()}
        >
          Download image
        </Button>
        {canShareLink ? (
          <Button disabled={!hasSelection || sharing} onClick={() => void handleShareLink()}>
            {sharing ? 'Creating link…' : 'Share a link'}
          </Button>
        ) : null}
      </section>
    </div>
  );
}
