'use client';

import { useEffect, useMemo, useRef } from 'react';

import { useSceneContextOptional } from '@/lib/scene/SceneContext';
import { resolveClusterAtWorldX, type MonthCluster } from '@bloom/core/garden/layout';
import { isNightPhase } from '@bloom/core/scene';
import { getSeason, type Season } from '@bloom/core/theme/seasons';

type Props = {
  clusters: MonthCluster[];
  onJump: (scrollX: number) => void;
  /** Current world scroll — highlights the month under the viewport center. */
  scrollLeft?: number;
  viewportWidth?: number;
};

const SEASON_DOT: Record<Season, { core: string; glow: string }> = {
  spring: { core: '#E8A7B8', glow: 'rgba(232, 167, 184, 0.55)' },
  summer: { core: '#7FB069', glow: 'rgba(127, 176, 105, 0.55)' },
  autumn: { core: '#E09A4E', glow: 'rgba(224, 154, 78, 0.55)' },
  winter: { core: '#A8C3D8', glow: 'rgba(168, 195, 216, 0.55)' },
};

function splitKey(monthKey: string): { month: number; year: number } {
  const [y, m] = monthKey.split('-').map(Number);
  return { month: m ?? 1, year: y ?? 0 };
}

function shortLabel(monthKey: string, showYear: boolean): string {
  const { month, year } = splitKey(monthKey);
  const name = new Date(year, month - 1, 1).toLocaleString('en', { month: 'short' });
  return showYear ? `${name} ’${String(year).slice(-2)}` : name;
}

/**
 * A season-tinted journey line through the garden's months. Each month is
 * a bloom-dot on a vine; the month under the viewport center blooms open.
 */
export function TimelineScrubber({ clusters, onJump, scrollLeft, viewportWidth }: Props) {
  const scene = useSceneContextOptional();
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

  const activeKey = useMemo(() => {
    if (clusters.length === 0) return null;
    if (scrollLeft === undefined || !viewportWidth) {
      return clusters[clusters.length - 1]!.monthKey;
    }
    return (
      resolveClusterAtWorldX(scrollLeft + viewportWidth / 2, clusters)?.monthKey ??
      clusters[clusters.length - 1]!.monthKey
    );
  }, [clusters, scrollLeft, viewportWidth]);

  useEffect(() => {
    if (!activeKey) return;
    const container = containerRef.current;
    const node = nodeRefs.current.get(activeKey);
    if (!container || !node) return;
    container.scrollTo({
      left: node.offsetLeft - (container.clientWidth - node.clientWidth) / 2,
      behavior: 'smooth',
    });
  }, [activeKey]);

  if (clusters.length < 2) return null;

  // Skies range from pale noon blue to deep night — light text with a dark
  // feathered shadow stays readable across all of them
  const darkSky =
    scene?.status === 'ready' &&
    (isNightPhase(scene.timePhase) || scene.timePhase === 'dusk');
  const inkColor = 'rgba(255, 252, 244, 0.95)';
  const fadedInk = 'rgba(255, 252, 244, 0.62)';
  const vineColor = 'rgba(255, 252, 244, 0.28)';
  const textShadow = '0 1px 6px rgba(20, 26, 40, 0.55), 0 0 2px rgba(20, 26, 40, 0.4)';

  return (
    <div
      ref={containerRef}
      className="garden-pan z-10 mt-1 max-h-12 overflow-x-scroll overflow-y-hidden"
    >
      <div className="relative w-max px-6">
        {/* Vine — threads through every month dot */}
        <div
          className="pointer-events-none absolute left-2 right-2"
          style={{ top: 13, height: 1, background: vineColor }}
          aria-hidden
        />
        <div className="relative flex items-start gap-1">
          {clusters.map((c, i) => {
            const { month, year } = splitKey(c.monthKey);
            const prevYear = i > 0 ? splitKey(clusters[i - 1]!.monthKey).year : null;
            const showYear = i === 0 || year !== prevYear;
            const season = getSeason(month);
            const dot = SEASON_DOT[season];
            const active = c.monthKey === activeKey;

            return (
              <button
                key={c.monthKey}
                ref={(el) => {
                  if (el) nodeRefs.current.set(c.monthKey, el);
                  else nodeRefs.current.delete(c.monthKey);
                }}
                type="button"
                data-garden-interactive
                onClick={() => onJump(Math.max(0, c.groundX - 40))}
                className="flex shrink-0 flex-col items-center px-2.5 pb-1 pt-1.5 transition-transform duration-300"
                style={{ transform: active ? 'translateY(-1px)' : undefined }}
                aria-label={`Jump to ${c.label}`}
                aria-current={active ? 'true' : undefined}
              >
                <span
                  className="block rounded-full transition-all duration-300"
                  style={{
                    width: active ? 11 : 7,
                    height: active ? 11 : 7,
                    marginTop: active ? 0 : 2,
                    marginBottom: active ? 3 : 5,
                    background: dot.core,
                    boxShadow: active
                      ? `0 0 0 3px ${dot.glow}, 0 0 12px ${dot.glow}`
                      : `0 0 0 1.5px ${darkSky ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.5)'}`,
                    opacity: active ? 1 : 0.75,
                  }}
                  aria-hidden
                />
                <span
                  className="font-display whitespace-nowrap text-[11px] leading-none transition-all duration-300"
                  style={{
                    color: active ? inkColor : fadedInk,
                    letterSpacing: active ? '0.14em' : '0.08em',
                    fontStyle: active ? 'italic' : undefined,
                    fontWeight: active ? 600 : 400,
                    textShadow,
                  }}
                >
                  {shortLabel(c.monthKey, showYear)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
