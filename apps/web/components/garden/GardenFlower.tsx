'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import React, { memo } from 'react';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { isAnniversaryBlossom } from '@bloom/core/garden/anniversary';
import type { EntryRecord } from '@bloom/core';
import { cn } from '@/lib/utils';

type Position = {
  x: number;
  y: number;
  z: number;
  rotation: number;
  scale: number;
};

type Props = {
  entry: EntryRecord;
  position: Position;
  /** World X of the virtual column container (0 when placed on the world root). */
  worldOffsetX?: number;
  index: number;
  totalEntries: number;
  daysSince: number | null;
  isHighlighted: boolean;
  animateSway: boolean;
  monthKey: string;
  onOpenFilter: (entry: EntryRecord, monthKey: string) => void;
  onLongPressStart: (entry: EntryRecord, monthKey: string) => void;
  onLongPressEnd: () => void;
};

function flowerSizeForEntry(entry: EntryRecord): number {
  if (entry.isFavourited) return 156;
  if (isAnniversaryBlossom(entry.createdAt)) return 148;
  return 140;
}

function GardenFlowerInner({
  entry,
  position,
  worldOffsetX = 0,
  index,
  totalEntries,
  daysSince,
  isHighlighted,
  animateSway,
  monthKey,
  onOpenFilter,
  onLongPressStart,
  onLongPressEnd,
}: Props) {
  const router = useRouter();
  const flowerSize = flowerSizeForEntry(entry);
  const plotHeight = flowerSize * 1.15;
  const baseScale = position.scale;
  const baseRotate = position.rotation;

  return (
    <motion.button
      type="button"
      data-garden-interactive
      className="garden-flower absolute flex flex-col items-center justify-end border-0 bg-transparent p-0"
      style={{
        left: position.x - worldOffsetX - flowerSize / 2,
        top: position.y - plotHeight,
        width: flowerSize,
        height: plotHeight,
        zIndex: isHighlighted ? 9999 : position.z,
      }}
      animate={{
        scale: isHighlighted ? baseScale * 1.08 : baseScale,
        rotate: baseRotate,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={(e) => {
        if (e.shiftKey) {
          onOpenFilter(entry, monthKey);
          return;
        }
        router.push(`/entry/${entry.id}`);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        onOpenFilter(entry, monthKey);
      }}
      onPointerDown={() => onLongPressStart(entry, monthKey)}
      onPointerUp={onLongPressEnd}
      onPointerLeave={onLongPressEnd}
      onPointerCancel={onLongPressEnd}
      title={entry.title ?? 'Memory'}
    >
      <motion.div
        className={cn('rounded-full', isHighlighted && 'ring-4 ring-sage/60')}
        animate={
          isHighlighted
            ? {
                boxShadow: '0 0 28px rgba(143,168,138,0.7)',
              }
            : { boxShadow: '0 0 0px rgba(143,168,138,0)' }
        }
        transition={{ duration: 0.35 }}
      >
        <FlowerSvg
          entry={entry}
          size={flowerSize}
          animateSway={animateSway}
          animateBloom={isHighlighted}
          daysSinceLastEntry={daysSince}
          entryIndex={index}
          totalEntries={totalEntries}
        />
      </motion.div>
      {isAnniversaryBlossom(entry.createdAt) ? (
        <span className="mt-0.5 text-[9px] italic text-ink-muted">✦ anniversary</span>
      ) : null}
    </motion.button>
  );
}

export const GardenFlower = memo(GardenFlowerInner);
