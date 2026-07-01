'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Optional visible heading; pair with `description`. */
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Accessible name when there is no visible `title`. */
  ariaLabel?: string;
  /** Pinned region below the scrollable body — e.g. a sticky CTA. */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * Bottom sheet shared by the garden's memory picker and quick-capture compose.
 * Slides up from the bottom edge (the native pattern for compose-while-typing),
 * with a grab handle, a tap-scrim backdrop, a scrollable body, and an optional
 * sticky footer that stays above the safe area / on-screen keyboard. Extracted
 * from the original inline markup in `FlowerClusterPicker`.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  footer,
  children,
  className,
}: Props) {
  const reduceMotion = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);

  // Keep the latest `onClose` in a ref so the effect below can depend only on
  // `open`. Callers often pass an inline `() => setOpen(false)` that changes
  // every render; depending on it here would re-run the effect (and re-focus the
  // panel) on every keystroke, stealing focus from the textarea while typing.
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  // The framer-motion sheet doesn't get Radix's focus management, so do the
  // minimum here: focus the panel once on open and close on Escape.
  React.useEffect(() => {
    if (!open) return;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const slide = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 320, damping: 28 };

  const hasHeader = Boolean(title || description);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            key="sheet-backdrop"
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/45 backdrop-blur-sm"
            onClick={onClose}
            aria-label="Close"
          />

          <motion.div
            key="sheet-panel"
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={slide}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50 mx-auto flex max-h-[92dvh] max-w-lg flex-col rounded-t-[32px] border-t border-white/40 bg-cream/95 shadow-[0_-8px_40px_rgba(0,0,0,0.15)] backdrop-blur-xl focus:outline-none',
              className
            )}
          >
            <div className="pointer-events-none absolute left-1/2 top-3 h-1.5 w-12 -translate-x-1/2 rounded-full bg-parchment" />

            <button
              type="button"
              className="absolute right-5 top-5 z-10 rounded-full bg-parchment/50 p-2 text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {hasHeader ? (
              <div className="shrink-0 px-6 pb-2 pr-14 pt-8">
                {title ? (
                  <h2 className="font-display text-2xl font-bold text-ink">{title}</h2>
                ) : null}
                {description ? (
                  <p className="mt-1 text-sm text-ink-muted">{description}</p>
                ) : null}
              </div>
            ) : null}

            <div
              className={cn(
                'min-h-0 flex-1 overflow-y-auto px-6 pb-6',
                hasHeader ? 'pt-4' : 'pt-9'
              )}
            >
              {children}
            </div>

            {footer ? (
              <div className="shrink-0 border-t border-parchment/60 bg-cream/80 px-6 pb-[calc(1rem+var(--safe-bottom))] pt-3 backdrop-blur-sm">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
