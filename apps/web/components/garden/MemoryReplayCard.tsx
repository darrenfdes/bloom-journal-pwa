'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  /** Entry title — rendered as the serif quote. */
  title: string | null;
  /** Descriptive meta sentence (years ago · setting · place). */
  line: string;
  onOpen: () => void;
  onDismiss: () => void;
  className?: string;
};

export function MemoryReplayCard({ title, line, onOpen, onDismiss, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      role="region"
      aria-label="This day in your garden"
      className={cn(
        'relative mx-auto w-[min(420px,calc(100%-32px))] rounded-[18px] border border-amber-200/60 bg-[#faf5e8]/95 px-5 pb-4 pt-4 shadow-[0_10px_36px_rgba(30,26,14,0.28)] ring-1 ring-amber-100/40 backdrop-blur-sm',
        className
      )}
    >
      <button
        type="button"
        aria-label="Dismiss memory for today"
        className="absolute right-2.5 top-2.5 rounded-full p-1 text-[#9a8d74] transition-colors hover:text-[#473e2e]"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X className="size-4" aria-hidden />
      </button>

      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-amber-600/90">
        <span aria-hidden className="mr-1.5">
          ✦
        </span>
        This day in your garden
      </p>

      {title ? (
        <p className="mt-2 font-display text-[20px] italic leading-snug text-[#473e2e]">
          “{title}”
        </p>
      ) : null}

      <p className="mt-1.5 text-[12.5px] leading-snug text-[#7a6e58]">{line}</p>

      <button
        type="button"
        onClick={onOpen}
        className="mt-3 rounded-full bg-amber-200/70 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b5a2e] transition-colors hover:bg-amber-200"
      >
        Visit this memory
      </button>
    </motion.div>
  );
}
