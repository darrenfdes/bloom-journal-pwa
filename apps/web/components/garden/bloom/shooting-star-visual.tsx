'use client';

/**
 * Shared shooting-star visual, used by both the ambient/special stars (BloomMeadow) and the
 * world-event meteor shower (EventEffectsLayer) so the two read identically. The look follows
 * delroyprithvi's pure-CSS "Shooting Star" effect — a pill-shaped streak whose tail draws out
 * behind a glowing head and then retracts to a point, plus a twinkling head sparkle — kept in
 * the meadow's warm-cream palette.
 *
 * Three animations run on nested elements so each only drives its own `transform`:
 *   • mover  — translateX along the local (rotated) axis: the travel.
 *   • tail   — scaleX 0→1→0 from the head outward: draws out then retracts.
 *   • shine  — head sparkle scale/opacity pulse.
 *
 * Callers include `SHOOTING_STAR_KEYFRAMES` in their own <style> (keeps each layer self-contained).
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { mulberry32 } from '@/lib/garden/bloom/rng';

/**
 * One fixed travel angle (deg) shared by every shooting star / meteor so a shower reads as a
 * single parallel direction rather than a scatter of angles.
 */
export const SHOOTING_STAR_ANGLE = 40;

/** Shallow arc for comet apparitions (meteors use SHOOTING_STAR_ANGLE). */
export const COMET_ANGLE = 9;

/** Travel distance (px) so the comet head reaches the near-hill crest at `angleDeg`. */
export function cometTravelPx(
  vh: number,
  angleDeg: number,
  startYPercent = -18,
  hillLineFromBottom = 134,
): number {
  const rad = (angleDeg * Math.PI) / 180;
  const startY = (startYPercent / 100) * vh;
  const targetY = vh - hillLineFromBottom - 36;
  const deltaY = targetY - startY;
  return Math.ceil(deltaY / Math.sin(rad));
}

const COMET_LEN = 920;

/**
 * Spawn so the nucleus is inside the upper-left sky at t=0 (not above/off-screen).
 * `x`/`y` are % of the sky box; travel distance still arcs down to the hill crest.
 */
export function cometSpawnGeom(vw: number, vh: number): { x: number; y: number; dist: number } {
  const rad = (COMET_ANGLE * Math.PI) / 180;
  const headLeadX = COMET_LEN * Math.cos(rad);
  const headDropY = 24 + COMET_LEN * Math.sin(rad);
  const targetHeadX = vw * 0.08;
  const targetHeadY = vh * 0.11;
  const anchorX = targetHeadX - headLeadX;
  const anchorY = targetHeadY - headDropY;
  const y = (anchorY / vh) * 100;
  return {
    x: (anchorX / vw) * 100,
    y,
    dist: cometTravelPx(vh, COMET_ANGLE, y),
  };
}

/** Geometry for one streak (BloomMeadow `Streak` is a structural superset). */
export type StarGeom = {
  x: number; // % left of the sky
  y: number; // % top of the sky
  ang: number; // travel angle (deg)
  len: number; // streak length (px) when fully drawn
  dur: number; // lifetime (s)
  delay: number; // start delay (s)
  dist?: number; // travel distance (px); defaults to len * 3.5
};

export const SHOOTING_STAR_KEYFRAMES = `
  @keyframes ss-shoot{0%{transform:translateX(0);opacity:0}6%{opacity:1}80%{opacity:1}100%{transform:translateX(var(--ss-d,560px));opacity:0}}
  @keyframes ss-tail{0%{transform:scaleX(0)}18%{transform:scaleX(1)}68%{transform:scaleX(1)}100%{transform:scaleX(0)}}
  @keyframes ss-shine{0%,100%{opacity:0;transform:translate(-50%,-50%) scale(.3)}50%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
`;

export const COMET_KEYFRAMES = `
  @keyframes comet-shoot{0%{transform:translateX(0);opacity:1}98%{opacity:1}100%{transform:translateX(var(--comet-d,960px));opacity:0}}
  @keyframes comet-tail{0%{transform:scaleX(0)}0.08%{transform:scaleX(1)}100%{transform:scaleX(1)}}
  @keyframes comet-coma{0%,100%{transform:scale(1);opacity:.86}50%{transform:scale(1.06);opacity:1}}
`;

type TrailSparkle = {
  id: number;
  x: number;
  y: number;
  sz: number;
  warm: boolean;
  d: number;
  dl: number;
};

const MAX_TRAIL_SPARKLES = 24;
const TRAIL_SPAWN_MS = 4000;

const sparkleBar: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(255,244,200,0), rgba(255,252,236,.95), rgba(255,244,200,0))',
};

export function ShootingStar({ geom, loop }: { geom: StarGeom; loop: boolean }) {
  const { x, y, ang, len, dur, delay, dist } = geom;
  const timing = loop ? 'linear infinite' : 'cubic-bezier(.25,.55,.45,1) both';

  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `rotate(${ang}deg)`, pointerEvents: 'none' }}>
      <div
        style={
          {
            position: 'relative',
            width: len,
            height: 2,
            '--ss-d': `${dist ?? len * 3.5}px`,
            animation: `ss-shoot ${dur}s ${delay}s ${timing}`,
          } as React.CSSProperties
        }
      >
        {/* tail: warm-cream pill that draws out from the head and retracts */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            transformOrigin: '100% 50%',
            background:
              'linear-gradient(90deg, rgba(255,244,214,0) 0%, rgba(255,246,222,.55) 55%, rgba(255,250,236,.98) 100%)',
            filter: 'drop-shadow(0 0 6px rgba(255,232,168,.85))',
            animation: `ss-tail ${dur}s ${delay}s ${timing}`,
          }}
        />
        {/* head: glowing core dot + crossing sparkle */}
        <div
          style={{
            position: 'absolute',
            right: -2,
            top: '50%',
            width: 6,
            height: 6,
            transform: 'translateY(-50%)',
            borderRadius: '50%',
            background: '#fffdf2',
            boxShadow: '0 0 10px 3px rgba(255,244,196,.95), 0 0 22px 7px rgba(255,226,150,.5)',
          }}
        >
          <div style={{ ...sparkleBar, width: 18, height: 1.5, animation: `ss-shine ${dur}s ${delay}s ${timing}` }} />
          <div
            style={{
              ...sparkleBar,
              width: 1.5,
              height: 8,
              background: 'linear-gradient(0deg, rgba(255,244,200,0), rgba(255,252,236,.95), rgba(255,244,200,0))',
              animation: `ss-shine ${dur}s ${delay}s ${timing}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

const COMET_EASE = 'linear';

function CometCrossSparkle({ s }: { s: TrailSparkle }) {
  const bar = s.warm
    ? 'linear-gradient(90deg, rgba(255,180,100,0), rgba(255,230,190,.95), rgba(255,180,100,0))'
    : 'linear-gradient(90deg, rgba(140,190,255,0), rgba(230,245,255,.95), rgba(140,190,255,0))';
  const barV = s.warm
    ? 'linear-gradient(0deg, rgba(255,180,100,0), rgba(255,230,190,.95), rgba(255,180,100,0))'
    : 'linear-gradient(0deg, rgba(140,190,255,0), rgba(230,245,255,.95), rgba(140,190,255,0))';
  return (
    <div
      style={{
        position: 'absolute',
        left: s.x,
        top: `calc(50% + ${s.y}px)`,
        width: s.sz,
        height: s.sz,
        marginLeft: -s.sz / 2,
        marginTop: -s.sz / 2,
        pointerEvents: 'none',
        animation: `bj-spark ${s.d}s ${s.dl}s ease-in-out infinite`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: s.sz,
          height: 1.5,
          transform: 'translate(-50%, -50%)',
          borderRadius: 999,
          background: bar,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: 1.5,
          height: s.sz * 0.7,
          transform: 'translate(-50%, -50%)',
          borderRadius: 999,
          background: barV,
        }}
      />
    </div>
  );
}

export function CometVisual({
  geom,
  loop,
  twinkleKeyframes = 'bj-twinkle',
}: {
  geom: StarGeom;
  loop: boolean;
  twinkleKeyframes?: string;
}) {
  const { x, y, ang, len, dur, delay, dist } = geom;
  const travel = dist ?? len * 3.5;
  const travelTiming = loop ? `${COMET_EASE} infinite` : `${COMET_EASE} both`;
  const tailTiming = loop ? 'linear infinite' : 'linear both';
  const startAtRef = useRef(performance.now());
  const nextSparkleId = useRef(0);
  const lastSpawnRef = useRef(performance.now());
  const prevElapsedRef = useRef(0);
  const [trailSparkles, setTrailSparkles] = useState<TrailSparkle[]>([]);

  const embers = useMemo(() => {
    const r = mulberry32(7321);
    return Array.from({ length: 22 }, (_, i) => {
      const f = r();
      return {
        id: i,
        x: -6 - f * (len * 0.92),
        y: (r() * 2 - 1) * (4 + (1 - f) * 12),
        s: 2 + r() * 3.5,
        warm: r() > 0.42,
        d: 2.4 + r() * 3.6,
        dl: r() * 4,
      };
    });
  }, [len]);

  useEffect(() => {
    startAtRef.current = performance.now();
    lastSpawnRef.current = performance.now() - TRAIL_SPAWN_MS;
    prevElapsedRef.current = 0;
    setTrailSparkles([]);
  }, [geom.x, geom.y, geom.ang, geom.len, geom.dur, geom.dist]);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;

    const maxTrailDist = len * 0.38;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = (((now - startAtRef.current) / 1000) - delay) % dur;
      const headX = (elapsed / dur) * travel;
      const wrapped = elapsed < prevElapsedRef.current;

      setTrailSparkles((prev) => {
        let next = wrapped
          ? []
          : prev.filter((p) => {
              const behind = headX - p.x;
              return behind >= -20 && behind <= maxTrailDist;
            });

        if (now - lastSpawnRef.current >= TRAIL_SPAWN_MS && next.length < MAX_TRAIL_SPARKLES) {
          lastSpawnRef.current = now;
          const r = mulberry32((now | 0) ^ nextSparkleId.current);
          next = [
            ...next,
            {
              id: nextSparkleId.current++,
              x: headX - len * (0.78 + r() * 0.18),
              y: (r() * 2 - 1) * 18,
              sz: 6 + r() * 10,
              warm: r() > 0.5,
              d: 2.8 + r() * 4.2,
              dl: r() * 5,
            },
          ];
        }
        return next;
      });

      prevElapsedRef.current = elapsed;
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [dur, delay, travel, len]);

  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `rotate(${ang}deg)`, pointerEvents: 'none' }}>
      <div style={{ position: 'relative' }}>
        <div
          style={
            {
              position: 'relative',
              width: len,
              height: 48,
              '--comet-d': `${travel}px`,
              animation: `comet-shoot ${dur}s ${delay}s ${travelTiming}`,
            } as React.CSSProperties
          }
        >
          {/* warm dust envelope — amber/orange outer fringe */}
          <div style={{ position: 'absolute', right: 0, top: '50%', marginTop: -23, width: len, height: 46 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: '100% 50%',
                background:
                  'linear-gradient(90deg, rgba(255,140,60,0) 0%, rgba(255,170,90,.18) 35%, rgba(255,200,130,.42) 72%, rgba(255,220,160,.55) 100%)',
                clipPath: 'polygon(0 50%, 100% 42%, 100% 58%)',
                borderRadius: 999,
                filter: 'blur(10px)',
                animation: `comet-tail ${dur}s ${delay}s ${tailTiming}`,
              }}
            />
          </div>
          {/* cool ion envelope — blue outer glow */}
          <div style={{ position: 'absolute', right: 0, top: '50%', marginTop: -19, width: len, height: 38 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: '100% 50%',
                background:
                  'linear-gradient(90deg, rgba(80,140,255,0) 0%, rgba(120,175,255,.28) 45%, rgba(170,210,255,.58) 100%)',
                clipPath: 'polygon(0 50%, 100% 43%, 100% 57%)',
                borderRadius: 999,
                filter: 'blur(8px)',
                animation: `comet-tail ${dur}s ${delay}s ${tailTiming}`,
              }}
            />
          </div>
          {/* soft glow halo */}
          <div style={{ position: 'absolute', right: 0, top: '50%', marginTop: -16, width: len, height: 31 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: '100% 50%',
                background:
                  'linear-gradient(90deg, rgba(150,195,255,0) 0%, rgba(168,205,255,.32) 50%, rgba(206,232,255,.65) 100%)',
                clipPath: 'polygon(0 50%, 100% 43%, 100% 57%)',
                borderRadius: 999,
                filter: 'blur(7px)',
                animation: `comet-tail ${dur}s ${delay}s ${tailTiming}`,
              }}
            />
          </div>
          {/* warm dust streak */}
          <div style={{ position: 'absolute', right: 0, top: '50%', marginTop: -9, width: len, height: 17 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: '100% 50%',
                background:
                  'linear-gradient(90deg, rgba(255,150,70,0) 0%, rgba(255,175,100,.35) 50%, rgba(255,210,150,.72) 100%)',
                clipPath: 'polygon(0 50%, 100% 44%, 100% 56%)',
                filter: 'drop-shadow(0 0 8px rgba(255,160,90,.4))',
                animation: `comet-tail ${dur}s ${delay}s ${tailTiming}`,
              }}
            />
          </div>
          {/* main ion tail — cool blue-white core streak */}
          <div style={{ position: 'absolute', right: 0, top: '50%', marginTop: -5, width: len, height: 10 }}>
            <div
              style={{
                width: '100%',
                height: '100%',
                transformOrigin: '100% 50%',
                background:
                  'linear-gradient(90deg, rgba(120,180,255,0) 0%, rgba(170,215,255,.55) 35%, rgba(230,245,255,.95) 78%, #ffffff 100%)',
                clipPath: 'polygon(0 50%, 100% 45%, 100% 55%)',
                filter: 'drop-shadow(0 0 6px rgba(100,170,255,.7)) drop-shadow(0 0 10px rgba(255,170,90,.28))',
                animation: `comet-tail ${dur}s ${delay}s ${tailTiming}`,
              }}
            />
          </div>
          {/* embers along the rigid tail */}
          {embers.map((b) => (
            <div
              key={b.id}
              style={{
                position: 'absolute',
                left: b.x,
                top: `calc(50% + ${b.y}px)`,
                width: b.s,
                height: b.s,
                marginLeft: -b.s / 2,
                marginTop: -b.s / 2,
                borderRadius: '50%',
                background: b.warm ? 'rgba(255,230,190,.98)' : 'rgba(230,245,255,.98)',
                boxShadow: b.warm
                  ? '0 0 6px 2px rgba(255,180,100,.95), 0 0 14px 3px rgba(255,140,60,.4)'
                  : '0 0 6px 2px rgba(180,220,255,.95), 0 0 14px 3px rgba(100,160,255,.45)',
                animation: `${twinkleKeyframes} ${b.d}s ${b.dl}s ease-in-out infinite`,
              }}
            />
          ))}
          {/* head: dual-tone coma — compact nucleus */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '50%',
              width: 16,
              height: 16,
              transform: 'translate(50%, -50%)',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, #ffffff 0%, #dceeff 32%, #ffd8a8 62%, rgba(255,150,70,0) 80%)',
                boxShadow:
                  '0 0 8px 3px rgba(255,255,255,.95), 0 0 16px 5px rgba(160,210,255,.65), 0 0 28px 8px rgba(255,170,90,.4), 0 0 44px 12px rgba(100,160,255,.22)',
                animation: 'comet-coma 20s ease-in-out infinite',
              }}
            />
          </div>
        </div>
        {/* debris sparkles — fixed along the path, sibling of the mover */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 48,
            overflow: 'visible',
            pointerEvents: 'none',
          }}
        >
          {trailSparkles.map((s) => (
            <CometCrossSparkle key={s.id} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}
