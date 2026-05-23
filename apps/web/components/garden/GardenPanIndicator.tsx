'use client';

import { useCallback, useRef } from 'react';

type Props = {
  scrollLeft: number;
  scrollWidth: number;
  clientWidth: number;
  onScrollTo: (scrollX: number) => void;
};

export function GardenPanIndicator({
  scrollLeft,
  scrollWidth,
  clientWidth,
  onScrollTo,
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const maxScroll = Math.max(0, scrollWidth - clientWidth);

  const scrollFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track || maxScroll <= 0) return;
      const rect = track.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      onScrollTo(ratio * maxScroll);
    },
    [maxScroll, onScrollTo]
  );

  if (maxScroll <= 0) return null;

  const progress = scrollLeft / maxScroll;
  const thumbRatio = clientWidth / scrollWidth;
  const thumbPercent = Math.min(100, Math.max(8, thumbRatio * 100));
  const travel = 100 - thumbPercent;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-6"
      aria-hidden
    >
      <div
        ref={trackRef}
        role="slider"
        aria-label="Garden timeline position"
        aria-valuemin={0}
        aria-valuemax={maxScroll}
        aria-valuenow={scrollLeft}
        className="pointer-events-auto relative h-1 w-full max-w-md cursor-pointer rounded-full bg-ink/10"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          scrollFromClientX(e.clientX);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          scrollFromClientX(e.clientX);
        }}
      >
        <div
          className="absolute top-0 h-full rounded-full bg-sage/75"
          style={{
            width: `${thumbPercent}%`,
            left: `${progress * travel}%`,
          }}
        />
      </div>
    </div>
  );
}
