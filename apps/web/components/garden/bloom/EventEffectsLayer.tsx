'use client';

/**
 * Renders the meadow visual treatment for a world event's `SceneEffect` token(s).
 * Self-contained: own keyframes (BloomMeadow's `bj-*` shooting-star keyframes are
 * gated to creatures/live mode, so this layer never relies on them) and deterministic
 * particle fields. Mounted inside the sky layer; positioned relative to the current
 * sun/moon coordinates so glows/eclipses line up with the real bodies.
 */

import React, { useMemo } from 'react';

import type { SceneEffect } from '@bloom/core/events';

import type { MoonTint, Planet } from '@/lib/garden/bloom/event-catalog';
import { mulberry32 } from '@/lib/garden/bloom/rng';
import { ShootingStar, SHOOTING_STAR_KEYFRAMES, SHOOTING_STAR_ANGLE } from '@/components/garden/bloom/shooting-star-visual';
import { FireworksCanvas } from '@/components/garden/bloom/FireworksCanvas';

type Pos = { x: number; y: number };
type SunPos = Pos & { size: number };

const fill: React.CSSProperties = { position: 'absolute', inset: 0, pointerEvents: 'none' };

/** Centre a fixed-size box on a percentage coordinate of the sky. */
const centred = (p: Pos, size: number): React.CSSProperties => ({
  position: 'absolute',
  left: `${p.x}%`,
  top: `${p.y}%`,
  width: size,
  height: size,
  marginLeft: -size / 2,
  marginTop: -size / 2,
  pointerEvents: 'none',
});

const MOON_GLOW: Record<string, { size: number; rgb: string; alpha: number }> = {
  moonGlow: { size: 360, rgb: '247,243,214', alpha: 0.5 },
  moonGlowStrong: { size: 540, rgb: '255,250,225', alpha: 0.66 },
  moonGlowFaint: { size: 240, rgb: '240,238,210', alpha: 0.32 },
  moonGlowBlue: { size: 440, rgb: '172,202,255', alpha: 0.6 },
};

// Each planet at opposition sits in roughly the same patch of sky, slightly offset so a
// viewer scanning the meadow reads them as distinct bodies rather than one fixed point.
const PLANET_POS: Record<Planet, Pos> = {
  Saturn: { x: 27, y: 44 },
  Jupiter: { x: 33, y: 38 },
  Mars: { x: 23, y: 49 },
};

export function EventEffectsLayer({
  effects,
  moonPos,
  sunPos,
  planet = null,
  apsis = null,
  moonTint = null,
}: {
  effects: SceneEffect[];
  moonPos: Pos;
  sunPos: SunPos;
  /** Which planet (planetOpposition → distinct bright-star look). */
  planet?: Planet | null;
  /** Near vs far Earth-apsis (sun shift warmth/size). */
  apsis?: 'perihelion' | 'aphelion' | null;
  /** Named-full-moon tint (e.g. Strawberry Moon) for the moon halo. */
  moonTint?: MoonTint | null;
}) {
  const has = (e: SceneEffect) => effects.includes(e);

  // Deterministic particle fields (regenerated only when the active effect set changes).
  const key = effects.join(',');
  const starfield = useMemo(() => {
    const r = mulberry32(9123);
    return Array.from({ length: 80 }, (_, i) => ({
      id: i, x: r() * 100, y: r() * 56, s: 1 + r() * 1.8, d: 2 + r() * 3, dl: r() * 4,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const meteors = useMemo(() => {
    const r = mulberry32(4477);
    // All share one direction (SHOOTING_STAR_ANGLE) and start well above/left of the viewport
    // so they fade in off-screen and streak in — never popping into view mid-sky.
    return Array.from({ length: 9 }, (_, i) => ({
      id: i,
      x: -18 + (i + r() * 0.6) * (104 / 9),
      y: -30 + r() * 16,
      len: 140 + r() * 80,
      dist: 820 + r() * 320,
      dur: 2.4 + r() * 1.6,
      dl: r() * 8,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const leaves = useMemo(() => {
    const r = mulberry32(2025);
    const palette = ['#caa24a', '#c4783a', '#a8542f', '#b9943f'];
    return Array.from({ length: 16 }, (_, i) => ({
      id: i, x: r() * 100, w: 7 + r() * 7, h: 4 + r() * 4,
      c: palette[Math.floor(r() * palette.length)] ?? '#caa24a',
      d: 6 + r() * 5, dl: r() * 7,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const sparkles = useMemo(() => {
    const r = mulberry32(2902);
    return Array.from({ length: 14 }, (_, i) => ({
      id: i, x: r() * 100, y: r() * 60, sz: 10 + r() * 12, d: 2 + r() * 2.4, dl: r() * 3,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div style={fill} aria-hidden>
      <style>{`
        @keyframes ev-glow{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:.92;transform:scale(1.06)}}
        @keyframes ev-twinkle{0%,100%{opacity:.15}50%{opacity:1}}
        ${SHOOTING_STAR_KEYFRAMES}
        @keyframes ev-leaf{0%{transform:translate(0,-8vh) rotate(0);opacity:0}12%{opacity:.9}88%{opacity:.8}100%{transform:translate(46px,96vh) rotate(240deg);opacity:0}}
        @keyframes ev-spark{0%,100%{transform:translateY(0) scale(.82);opacity:.35}50%{transform:translateY(-8px) scale(1.12);opacity:1}}
        @keyframes ev-pulse{0%,100%{opacity:.3}50%{opacity:.62}}
      `}</style>

      {/* ---- moon glows ---- */}
      {(['moonGlow', 'moonGlowStrong', 'moonGlowFaint', 'moonGlowBlue'] as const)
        .filter((t) => has(t))
        .map((t) => {
          const g = MOON_GLOW[t]!;
          const rgb = moonTint ? moonTint.glow : g.rgb; // named full moons (e.g. Strawberry) warm the halo
          return (
            <div
              key={t}
              style={{
                ...centred(moonPos, g.size),
                borderRadius: '50%',
                background: `radial-gradient(circle, rgba(${rgb},${g.alpha}) 0%, rgba(${rgb},${g.alpha * 0.35}) 38%, transparent 70%)`,
                filter: 'blur(2px)',
                animation: 'ev-glow 6s ease-in-out infinite',
              }}
            />
          );
        })}

      {/* ---- new-moon starfield ---- */}
      {has('starfield') && (
        <div style={fill}>
          {starfield.map((st) => (
            <div
              key={st.id}
              style={{
                position: 'absolute', left: `${st.x}%`, top: `${st.y}%`,
                width: st.s, height: st.s, borderRadius: '50%', background: '#fdf6e3',
                animation: `ev-twinkle ${st.d}s ${st.dl}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
      )}

      {/* ---- meteor shower ---- */}
      {has('shootingStars') &&
        meteors.map((m) => (
          <ShootingStar
            key={m.id}
            geom={{ x: m.x, y: m.y, ang: SHOOTING_STAR_ANGLE, len: m.len, dur: m.dur, delay: m.dl, dist: m.dist }}
            loop
          />
        ))}

      {/* ---- solar eclipse (dim daylight + bite + corona) ---- */}
      {has('dimDaylight') && (
        <>
          <div style={{ ...fill, background: 'rgba(18,22,44,.5)', mixBlendMode: 'multiply', animation: 'ev-pulse 7s ease-in-out infinite' }} />
          <div
            style={{
              ...centred(sunPos, sunPos.size * 1.7), borderRadius: '50%',
              background: 'radial-gradient(circle, transparent 44%, rgba(255,240,205,.5) 50%, transparent 64%)',
              animation: 'ev-glow 5s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute', left: `${sunPos.x}%`, top: `${sunPos.y}%`,
              width: sunPos.size, height: sunPos.size, borderRadius: '50%', background: '#0b1024',
              transform: `translate(-50%,-50%) translate(${sunPos.size * -0.18}px, ${sunPos.size * -0.12}px)`,
              boxShadow: 'inset 0 0 18px 4px rgba(0,0,0,.6)', pointerEvents: 'none',
            }}
          />
        </>
      )}

      {/* ---- lunar eclipse (blood moon) ---- */}
      {has('bloodMoon') && (
        <>
          <div
            style={{
              ...centred(moonPos, 380), borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(190,45,32,.55) 0%, rgba(150,30,24,.2) 40%, transparent 70%)',
              filter: 'blur(2px)', animation: 'ev-glow 6s ease-in-out infinite',
            }}
          />
          <div
            style={{
              ...centred(moonPos, 96), borderRadius: '50%',
              background: 'rgb(188,58,42)', mixBlendMode: 'multiply', filter: 'blur(1px)',
            }}
          />
        </>
      )}

      {/* ---- season shift (warm wash + drifting leaves) ---- */}
      {has('seasonShift') && (
        <>
          <div style={{ ...fill, background: 'linear-gradient(180deg, rgba(255,178,92,.12) 0%, transparent 58%)', animation: 'ev-pulse 8s ease-in-out infinite' }} />
          {leaves.map((l) => (
            <div
              key={l.id}
              style={{
                position: 'absolute', left: `${l.x}%`, top: 0, width: l.w, height: l.h,
                borderRadius: '60% 40% 55% 45%', background: l.c, opacity: 0.85,
                animation: `ev-leaf ${l.d}s ${l.dl}s linear infinite`,
              }}
            />
          ))}
        </>
      )}

      {/* ---- planet opposition (a distinct "brightest" planet per body) ---- */}
      {has('brightStar') && (
        <div style={{ position: 'absolute', left: `${(planet ? PLANET_POS[planet] : { x: 27, y: 44 }).x}%`, top: `${(planet ? PLANET_POS[planet] : { x: 27, y: 44 }).y}%`, pointerEvents: 'none' }}>
          {planet === 'Saturn' ? (
            <>
              {/* pale-gold disc + a tilted ring — instantly "Saturn" */}
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 36, height: 13,
                  transform: 'translate(-50%,-50%) rotate(-18deg)', borderRadius: '50%',
                  border: '1.5px solid rgba(234,217,166,.85)', boxShadow: '0 0 7px rgba(232,214,158,.5)',
                }}
              />
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 8, height: 8,
                  transform: 'translate(-50%,-50%)', borderRadius: '50%', background: '#ecd9a6',
                  boxShadow: '0 0 12px 4px rgba(232,214,158,.9), 0 0 30px 10px rgba(220,196,120,.35)',
                  animation: 'ev-twinkle 3s ease-in-out infinite',
                }}
              />
            </>
          ) : planet === 'Jupiter' ? (
            <>
              {/* the brightest — big cream disc flanked by two faint Galilean specks */}
              <div style={{ position: 'absolute', left: -15, top: '50%', width: 2.5, height: 2.5, transform: 'translateY(-50%)', borderRadius: '50%', background: 'rgba(255,250,235,.85)' }} />
              <div style={{ position: 'absolute', left: 17, top: '50%', width: 2.5, height: 2.5, transform: 'translateY(-50%)', borderRadius: '50%', background: 'rgba(255,250,235,.85)' }} />
              <div
                style={{
                  position: 'absolute', left: '50%', top: '50%', width: 11, height: 11,
                  transform: 'translate(-50%,-50%)', borderRadius: '50%', background: '#fff6e0',
                  boxShadow: '0 0 18px 6px rgba(255,248,224,.98), 0 0 52px 20px rgba(240,228,190,.5)',
                  animation: 'ev-twinkle 2.4s ease-in-out infinite',
                }}
              />
            </>
          ) : planet === 'Mars' ? (
            <div
              style={{
                position: 'absolute', left: '50%', top: '50%', width: 7, height: 7,
                transform: 'translate(-50%,-50%)', borderRadius: '50%', background: '#ff8a5c',
                boxShadow: '0 0 13px 4px rgba(255,120,80,.92), 0 0 34px 12px rgba(220,90,60,.4)',
                animation: 'ev-twinkle 2.8s ease-in-out infinite',
              }}
            />
          ) : (
            <div
              style={{
                position: 'absolute', left: '50%', top: '50%', width: 8, height: 8,
                transform: 'translate(-50%,-50%)', borderRadius: '50%', background: '#fffdf2',
                boxShadow: '0 0 14px 5px rgba(255,250,220,.95), 0 0 44px 16px rgba(200,220,255,.4)',
                animation: 'ev-twinkle 2.6s ease-in-out infinite',
              }}
            />
          )}
        </div>
      )}

      {/* ---- earth apsis (perihelion = bigger & warmer; aphelion = smaller & cooler) ---- */}
      {has('subtleSunShift') && (
        <div
          style={{
            ...centred(sunPos, sunPos.size * (apsis === 'perihelion' ? 2.4 : apsis === 'aphelion' ? 1.6 : 2)),
            borderRadius: '50%',
            background:
              apsis === 'perihelion'
                ? 'radial-gradient(circle, rgba(255,196,120,.34) 0%, rgba(255,170,90,.12) 42%, transparent 66%)'
                : apsis === 'aphelion'
                  ? 'radial-gradient(circle, rgba(214,230,255,.2) 0%, transparent 60%)'
                  : 'radial-gradient(circle, rgba(255,212,142,.24) 0%, transparent 64%)',
            animation: 'ev-glow 7s ease-in-out infinite',
          }}
        />
      )}

      {/* ---- friday the 13th (spooky tint) ---- */}
      {has('spookyTint') && (
        <>
          <div style={{ ...fill, background: 'radial-gradient(circle at 50% 38%, transparent 32%, rgba(38,10,52,.55) 100%)', animation: 'ev-pulse 6s ease-in-out infinite' }} />
          <div style={{ ...fill, background: 'rgba(58,92,44,.12)', mixBlendMode: 'overlay' }} />
        </>
      )}

      {/* ---- leap day (rare sparkle) ---- */}
      {has('rareSparkle') &&
        sparkles.map((s) => (
          <div
            key={s.id}
            style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`, fontSize: s.sz, lineHeight: 1,
              color: '#fff4c8', textShadow: '0 0 10px rgba(255,236,160,.9)',
              animation: `ev-spark ${s.d}s ${s.dl}s ease-in-out infinite`, pointerEvents: 'none',
            }}
          >
            ✦
          </div>
        ))}

      {/* ---- fireworks (realistic gravity/drag/trails on a full-sky canvas) ---- */}
      {has('fireworks') && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          <FireworksCanvas />
        </div>
      )}

      {/* ---- Christmas star: a very bright core with subtle cross-shaped rays ---- */}
      {has('christmasStar') && (
        <div style={{ position: 'absolute', left: '52%', top: '17%', pointerEvents: 'none' }}>
          {/* bright core + halo */}
          <div
            style={{
              position: 'absolute', left: '50%', top: '50%', width: 16, height: 16,
              transform: 'translate(-50%,-50%)', borderRadius: '50%', background: '#fffefb',
              boxShadow: '0 0 24px 8px rgba(255,250,235,.98), 0 0 70px 28px rgba(255,240,205,.55), 0 0 140px 60px rgba(255,230,180,.22)',
              animation: 'ev-glow 5s ease-in-out infinite',
            }}
          />
          {/* cross rays — two crossed gradient bars, kept soft/subtle */}
          <div
            style={{
              position: 'absolute', left: '50%', top: '50%', width: 190, height: 2.5,
              transform: 'translate(-50%,-50%)',
              background: 'linear-gradient(90deg, transparent 0%, rgba(255,250,235,.55) 50%, transparent 100%)',
              filter: 'blur(1px)', animation: 'ev-twinkle 4s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute', left: '50%', top: '50%', width: 2.5, height: 150,
              transform: 'translate(-50%,-50%)',
              background: 'linear-gradient(180deg, transparent 0%, rgba(255,250,235,.55) 50%, transparent 100%)',
              filter: 'blur(1px)', animation: 'ev-twinkle 4s ease-in-out infinite',
            }}
          />
        </div>
      )}
    </div>
  );
}
