'use client';

import { Button } from '@/components/ui/button';
import { plantButtonClass } from '@/components/write/EntryForm';

type Props = {
  canPlant: boolean;
  onPlant: () => void;
  label?: string;
};

/**
 * Pinned "Plant it" bar for the full-page compose surfaces (`/write`,
 * `/revisit`). Fixed to the bottom edge (centered to the same `max-w-lg` column
 * as the page) so the primary action stays reachable above the on-screen
 * keyboard. The compose routes hide the global nav, so this owns the bottom.
 */
export function PlantBar({ canPlant, onPlant, label = 'Plant it' }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg px-4 pb-[calc(1rem+var(--safe-bottom))] pt-3">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-cream to-transparent" />
      <div className="rounded-full">
        <Button size="lg" className={plantButtonClass} disabled={!canPlant} onClick={onPlant}>
          {label}
        </Button>
      </div>
    </div>
  );
}
