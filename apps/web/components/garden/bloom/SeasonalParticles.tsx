'use client';

/**
 * Ambient seasonal particles for the Bloom Meadow sky layer: tumbling leaves in
 * autumn, drifting petals in spring. Deterministic per day (like the ram roll),
 * day-gated via `intensity` (the phase's pollen level) and cleared from the sky
 * while it rains or snows via `hidden`.
 */
import React, { useMemo } from 'react';

import { buildSeasonParticles, type SeasonParticleKind } from '@/lib/garden/bloom/season';

/** Injected into the meadow's inline <style> block, above the reduced-motion kill rule. */
export const SEASON_PARTICLE_KEYFRAMES = `
@keyframes bj-leaf{
  0%{transform:translate(0,-4vh) rotate(0deg)}
  25%{transform:translate(var(--sw),24vh) rotate(95deg)}
  50%{transform:translate(calc(var(--sw)*-.6),50vh) rotate(200deg)}
  75%{transform:translate(var(--sw),76vh) rotate(290deg)}
  100%{transform:translate(0,108vh) rotate(380deg)}
}
@keyframes bj-petal{
  0%{transform:translate(0,0) rotate(0deg);opacity:0}
  12%{opacity:.9}
  50%{transform:translate(calc(var(--sw)*1.6),12vh) rotate(150deg)}
  88%{opacity:.9}
  100%{transform:translate(calc(var(--sw)*3),26vh) rotate(310deg);opacity:0}
}
`;

const COUNT: Record<SeasonParticleKind, number> = { leaves: 14, petals: 12 };

export function SeasonalParticles({
  kind,
  intensity,
  hidden,
  dayIso,
  colors,
}: {
  kind: SeasonParticleKind;
  /** 0-1 visibility (the phase's ambient-particle level, like pollen). */
  intensity: number;
  /** True while precipitation owns the sky. */
  hidden: boolean;
  dayIso: string;
  colors: string[];
}) {
  const parts = useMemo(() => buildSeasonParticles(kind, dayIso, COUNT[kind], colors), [kind, dayIso, colors]);
  return (
    <div
      data-testid="season-particles"
      data-kind={kind}
      style={{ position: 'absolute', inset: 0, opacity: hidden ? 0 : intensity, transition: 'opacity 1.6s ease', pointerEvents: 'none' }}
    >
      {parts.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: kind === 'leaves' ? p.s * 1.4 : p.s + 2,
            height: p.s,
            borderRadius: kind === 'leaves' ? '0 60% 0 60%' : '50%',
            background: p.color,
            opacity: 0.85,
            ['--sw' as string]: `${p.sway}px`,
            animation: `${kind === 'leaves' ? 'bj-leaf' : 'bj-petal'} ${p.d}s ${p.dl}s linear infinite`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
