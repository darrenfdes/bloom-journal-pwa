'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  line: string;
  onOpen: () => void;
  onDismiss: () => void;
  className?: string;
};

export function MemoryReplayCard({ line, onOpen, onDismiss, className }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      role="region"
      aria-label={line}
      className={cn(
        'relative mx-auto w-[min(560px,calc(100%-24px))] rounded-2xl border border-white/50 bg-white/85 px-4 py-3 shadow-md backdrop-blur-sm',
        className
      )}
    >
      <p className="pr-8 font-serif text-sm leading-relaxed text-ink">
        <span className="mr-1.5" aria-hidden>
          🌷
        </span>
        <span className="text-xs font-sans font-semibold uppercase tracking-wide text-sage">
          This day in your garden
        </span>
        <button
          type="button"
          className="mt-1 block w-full text-left text-sm text-ink-soft transition-colors hover:text-ink"
          onClick={onOpen}
        >
          {line}
        </button>
      </p>
      <button
        type="button"
        aria-label="Dismiss memory for today"
        className="absolute right-2 top-2 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-parchment/80 hover:text-ink"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <X className="size-4" aria-hidden />
      </button>
    </motion.div>
  );
}
