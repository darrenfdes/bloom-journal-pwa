'use client';

import { useMemo } from 'react';

import { SeededRNG } from '@bloom/core/flowers/seeded-rng';

type SparkleData = {
  key: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  driftX: number;
};

type Props = {
  width: number;
  height: number;
  count?: number;
  seed?: number;
};

export function PollenSparkles({ width, height, count = 10, seed = 4242 }: Props) {
  const sparkles = useMemo(() => {
    const rng = new SeededRNG(seed);
    return Array.from({ length: count }, (_, i) => ({
      key: i,
      x: rng.range(0, width),
      y: rng.range(height * 0.15, height * 0.85),
      delay: Math.floor(rng.range(0, 4000)),
      duration: Math.floor(rng.range(6000, 12000)),
      driftX: rng.range(-18, 18),
    }));
  }, [count, height, seed, width]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {sparkles.map((s) => {
        const { key, ...rest } = s;
        return <Sparkle key={key} {...rest} />;
      })}
    </div>
  );
}

function Sparkle({ x, y, delay, duration, driftX }: Omit<SparkleData, 'key'>) {
  return (
    <span
      className="pollen-sparkle absolute h-1 w-1 rounded-full bg-[rgba(255,240,200,0.85)] shadow-[0_0_4px_#FFE9A6]"
      style={
        {
          left: x,
          top: y,
          '--pollen-delay': `${delay}ms`,
          '--pollen-duration': `${duration}ms`,
          '--pollen-drift': `${driftX}px`,
        } as React.CSSProperties
      }
    />
  );
}
