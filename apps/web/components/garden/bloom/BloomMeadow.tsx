'use client';

/**
 * Bloom Meadow — a faithful port of the reference artifact
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`, spec `bloom-meadow-spec.md`),
 * wired to the user's real journal entries. Differences from the reference, per product
 * decisions on branch feature/ui-2:
 *   · Sky phase defaults from the local clock with manual phase pills + rain toggle
 *     (no live geolocation/weather).
 *   · Ambient creatures (butterflies, fox, shooting stars, cloud shadow) are omitted.
 *   · The memory-card modal is extended with Open / Favourite / Revisit / Delete actions.
 */
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { EntryRecord } from '@bloom/core';

import { FlowerArt } from '@/components/garden/bloom/species';
import { GrassTuft, makeHill, RainIcon, SunIcon, Tree } from '@/components/garden/bloom/scenery';
import { buildMeadowLayout, type PlacedEntry } from '@/lib/garden/bloom/layout';
import { MOODS } from '@/lib/garden/bloom/moods';
import {
  agoLabel,
  fmtFull,
  fmtShort,
  isAnniv,
  MONTH_ABBR,
  MONTH_NAMES,
  PHASE_ORDER,
  PHASE_PRETTY,
  PHASES,
  phaseFromHour,
  type PhaseKey,
} from '@/lib/garden/bloom/phases';
import { mulberry32 } from '@/lib/garden/bloom/rng';
import { softDelete, toggleFavourite } from '@/lib/db/repositories/entries';
import { useBloomStore } from '@/stores/useBloomStore';

const serif = "var(--font-display), Georgia, 'Times New Roman', serif";
const sans = "var(--font-body), 'Segoe UI', sans-serif";
const glass: React.CSSProperties = {
  background: 'rgba(22,27,36,.38)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(247,241,227,.16)',
  color: '#f7f1e3',
};

const G = 150; // ground strip height

/** Join time/weather/place into the reference's ` · `-separated snapshot line. */
const snapshotLine = (timePhase: PhaseKey, weather: string, place: string | null) =>
  [PHASE_PRETTY[timePhase], weather, place].filter(Boolean).join(' · ');

export function BloomMeadow({ entries, preview = false }: { entries: EntryRecord[]; preview?: boolean }) {
  const router = useRouter();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);

  const [phaseKey, setPhaseKey] = useState<PhaseKey>(() => phaseFromHour(new Date().getHours()));
  const [weather, setWeather] = useState<'clear' | 'rain'>('clear');
  const [active, setActive] = useState<PlacedEntry | null>(null);
  const [activeFav, setActiveFav] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState(0);
  const [replay, setReplay] = useState<PlacedEntry | null>(null);
  const [vw, setVw] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  const [grabbing, setGrabbing] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const hillRefs = [useRef<SVGSVGElement>(null), useRef<SVGSVGElement>(null), useRef<SVGSVGElement>(null)];
  const drag = useRef({ down: false, x: 0, sl: 0, moved: 0 });
  const ticking = useRef(false);

  const phase = PHASES[phaseKey];

  const layout = useMemo(() => buildMeadowLayout(entries), [entries]);
  // The meadow world is at least as wide as the viewport so the ground/grass span
  // the full screen even when there are only a few months of entries.
  const worldW = Math.max(layout.W, vw);

  /* ambient particle fields (deterministic) */
  const stars = useMemo(() => {
    const r = mulberry32(777);
    return [...Array(90)].map((_, i) => ({ id: i, x: r() * 100, y: r() * 62, s: 1 + r() * 1.6, d: 2.2 + r() * 3.4, dl: -r() * 5 }));
  }, []);
  const fireflies = useMemo(() => {
    const r = mulberry32(424);
    return [...Array(12)].map((_, i) => ({ id: i, x: 6 + r() * 88, y: 48 + r() * 38, d: 5 + r() * 6, dl: -r() * 8 }));
  }, []);
  const pollen = useMemo(() => {
    const r = mulberry32(909);
    return [...Array(14)].map((_, i) => ({ id: i, x: r() * 100, y: 35 + r() * 50, s: 2.4 + r() * 2.6, d: 9 + r() * 8, dl: -r() * 12 }));
  }, []);
  const drops = useMemo(() => {
    const r = mulberry32(313);
    return [...Array(70)].map((_, i) => ({ id: i, x: r() * 100, h: 22 + r() * 26, d: 0.85 + r() * 0.65, dl: -r() * 2 }));
  }, []);
  const clouds = useMemo(() => {
    const r = mulberry32(551);
    return [...Array(5)].map((_, i) => ({ id: i, top: 4 + r() * 26, w: 180 + r() * 150, d: 90 + r() * 80, dl: -r() * 120, o: 0.55 + r() * 0.3 }));
  }, []);
  const tufts = useMemo(() => {
    const r = mulberry32(212);
    const n = Math.floor(worldW / 46);
    return [...Array(n)].map((_, i) => {
      const bottom = r() * 26;
      return { id: i, left: i * 46 + r() * 30, bottom, sc: 0.7 + r() * 0.75, dur: 2.6 + r() * 2.4, dl: -r() * 4, z: 100 + Math.round((26 - bottom) * 1.8) };
    });
  }, [worldW]);

  /* hills (sized to viewport + parallax factor) */
  const hills = useMemo(() => {
    const defs = [
      { f: 0.16, base: 168, amp: 50, seed: 11 },
      { f: 0.32, base: 116, amp: 64, seed: 23 },
      { f: 0.55, base: 64, amp: 72, seed: 37 },
    ];
    return defs.map((h) => {
      const Wl = layout.W * h.f + vw + 500;
      const built = makeHill(h.seed, Wl, 340, h.base, h.amp);
      const tr = mulberry32(h.seed * 7);
      const trees =
        h.f > 0.2
          ? [...Array(h.f > 0.4 ? 6 : 4)].map((_, i) => {
              const x = 140 + tr() * (Wl - 280);
              return { id: i, x, y: built.yAt(x) + 4, sc: h.f > 0.4 ? 0.85 + tr() * 0.5 : 0.5 + tr() * 0.3 };
            })
          : [];
      return { ...h, Wl, d: built.d, trees };
    });
  }, [layout.W, vw]);

  const syncScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const sx = el.scrollLeft;
    hills.forEach((h, i) => {
      const node = hillRefs[i]?.current;
      if (node) node.style.transform = `translateX(${-sx * h.f}px)`;
    });
    const mi = Math.round((sx + window.innerWidth / 2 - layout.PL - layout.MW / 2) / layout.MW);
    const clamped = Math.max(0, Math.min(layout.months.length - 1, mi));
    setActiveMonth((p) => (p === clamped ? p : clamped));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hills, layout]);

  /* memory replay: same day, prior year */
  useEffect(() => {
    const now = new Date();
    const cands = layout.entries.filter(
      (e) => e.createdAt.getDate() === now.getDate() && e.createdAt.getMonth() === now.getMonth() && e.createdAt.getFullYear() < now.getFullYear()
    );
    if (cands.length) {
      cands.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      const top = cands[0]!;
      const t = setTimeout(() => setReplay(top), 1100);
      return () => clearTimeout(t);
    }
    setReplay(null);
  }, [layout]);

  /* start at the most recent month + track viewport width */
  const initialised = useRef(false);
  useEffect(() => {
    const el = scrollerRef.current;
    if (el && !initialised.current) {
      initialised.current = true;
      el.scrollLeft = el.scrollWidth;
      syncScroll();
    }
    const onR = () => setVw(window.innerWidth);
    window.addEventListener('resize', onR);
    return () => window.removeEventListener('resize', onR);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (active) setActiveFav(active.isFavourited);
  }, [active]);

  const onScroll = () => {
    if (ticking.current) return;
    ticking.current = true;
    requestAnimationFrame(() => {
      syncScroll();
      ticking.current = false;
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    const el = scrollerRef.current;
    if (el && Math.abs(e.deltaY) > Math.abs(e.deltaX)) el.scrollLeft += e.deltaY;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollerRef.current) return;
    drag.current = { down: true, x: e.clientX, sl: scrollerRef.current.scrollLeft, moved: 0 };
    setGrabbing(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current.down || e.pointerType !== 'mouse' || !scrollerRef.current) return;
    const dx = e.clientX - drag.current.x;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx));
    scrollerRef.current.scrollLeft = drag.current.sl - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
    setGrabbing(false);
  };

  const scrollToX = (x: number) => {
    scrollerRef.current?.scrollTo({ left: Math.max(0, x - window.innerWidth / 2), behavior: 'smooth' });
  };
  const visitEntry = (e: PlacedEntry) => {
    scrollToX(e.x);
    setTimeout(() => setActive(e), 650);
  };

  const parentOf = (e: PlacedEntry | null) =>
    e && e.revisitOf ? layout.entries.find((x) => x.id === e.revisitOf) ?? null : null;
  const childrenOf = (e: PlacedEntry | null) => (e ? layout.entries.filter((x) => x.revisitOf === e.id) : []);

  /* ---------- card actions ---------- */
  const handleFavourite = async () => {
    if (!active) return;
    setActiveFav((v) => !v);
    await toggleFavourite(active.id);
    await refreshEntries();
  };
  const handleDelete = async () => {
    if (!active) return;
    const id = active.id;
    setActive(null);
    await softDelete(id);
    await refreshEntries();
  };

  const moodMeta = active?.mood ? MOODS[active.mood] : null;

  const pill: React.CSSProperties = {
    border: '1px solid #d8c9a4',
    background: '#f0e6cd',
    color: '#5c5236',
    borderRadius: 999,
    padding: '7px 15px',
    fontFamily: sans,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    cursor: 'pointer',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', fontFamily: sans, background: '#0a0f2a', userSelect: grabbing ? 'none' : 'auto' }}>
      <style>{`
        .bj-scroll::-webkit-scrollbar{display:none}
        @keyframes bj-sway{0%{transform:rotate(-1.7deg)}100%{transform:rotate(1.9deg)}}
        @keyframes bj-grass{0%{transform:rotate(-3deg)}100%{transform:rotate(3deg)}}
        @keyframes bj-bloom{0%{transform:scale(0);opacity:0}62%{transform:scale(1.07)}100%{transform:scale(1);opacity:1}}
        @keyframes bj-drift{from{transform:translateX(-360px)}to{transform:translateX(calc(100vw + 360px))}}
        @keyframes bj-twinkle{0%,100%{opacity:.12}50%{opacity:.95}}
        @keyframes bj-pollen{0%{transform:translate(0,0);opacity:0}12%{opacity:.7}85%{opacity:.45}100%{transform:translate(80px,-140px);opacity:0}}
        @keyframes bj-fire{0%,100%{transform:translate(0,0);opacity:.1}28%{opacity:.95}52%{transform:translate(26px,-22px);opacity:.55}76%{opacity:.9}}
        @keyframes bj-rain{from{transform:translateY(-14vh)}to{transform:translateY(112vh)}}
        @keyframes bj-card{from{opacity:0;transform:translateY(18px) scale(.975)}to{opacity:1;transform:none}}
        @keyframes bj-spark{0%,100%{transform:translateY(0);opacity:.45}50%{transform:translateY(-7px);opacity:1}}
        @keyframes bj-replay{from{opacity:0;transform:translate(-50%,-14px)}to{opacity:1;transform:translate(-50%,0)}}
        @media (prefers-reduced-motion: reduce){*{animation-duration:.01s !important;animation-iteration-count:1 !important;transition-duration:.01s !important}}
      `}</style>

      {/* ===== SKY (fixed) ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {PHASE_ORDER.map((k) => (
          <div key={k} style={{ position: 'absolute', inset: 0, background: PHASES[k].sky, opacity: k === phaseKey ? 1 : 0, transition: 'opacity 1.6s ease' }} />
        ))}

        {/* stars */}
        <div style={{ position: 'absolute', inset: 0, opacity: phase.stars, transition: 'opacity 1.6s ease' }}>
          {stars.map((st) => (
            <div key={st.id} style={{ position: 'absolute', left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s, borderRadius: '50%', background: '#fdf6e3', animation: `bj-twinkle ${st.d}s ${st.dl}s ease-in-out infinite` }} />
          ))}
        </div>

        {/* sun */}
        <div
          style={{
            position: 'absolute',
            left: `${phase.sun.x}%`,
            top: `${phase.sun.y}%`,
            width: phase.sun.size,
            height: phase.sun.size,
            marginLeft: -phase.sun.size / 2,
            marginTop: -phase.sun.size / 2,
            borderRadius: '50%',
            background: phase.sun.core,
            boxShadow: `0 0 60px 30px ${phase.sun.glow}, 0 0 140px 80px ${phase.sun.glow}`,
            opacity: phase.sun.o,
            transition: 'all 1.8s ease',
          }}
        />

        {/* moon */}
        <div style={{ position: 'absolute', left: `${phase.moon.x}%`, top: `${phase.moon.y}%`, opacity: phase.moon.o, transition: 'all 1.8s ease', filter: 'drop-shadow(0 0 26px rgba(240,238,210,.45))' }}>
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="24" fill="#f2eed6" />
            <circle cx="28" cy="32" r="3.4" fill="rgba(180,176,150,.5)" />
            <circle cx="40" cy="44" r="2.4" fill="rgba(180,176,150,.45)" />
            <circle cx="42" cy="28" r="1.8" fill="rgba(180,176,150,.4)" />
          </svg>
        </div>

        {/* clouds */}
        {clouds.map((c) => (
          <div key={c.id} style={{ position: 'absolute', top: `${c.top}%`, left: 0, opacity: c.o, animation: `bj-drift ${c.d}s linear infinite`, animationDelay: `${c.dl}s`, pointerEvents: 'none' }}>
            <div style={{ position: 'relative', width: c.w, height: 54 }}>
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${i * 22}%`,
                    top: i % 2 ? 12 : 0,
                    width: c.w * 0.42,
                    height: 38 + (i % 2) * 10,
                    borderRadius: '50%',
                    background: phase.clouds,
                    filter: 'blur(11px)',
                    transition: 'background 1.6s ease',
                  }}
                />
              ))}
            </div>
          </div>
        ))}

        {/* parallax hills */}
        {hills.map((h, i) => (
          <svg key={i} ref={hillRefs[i]} width={h.Wl} height="340" style={{ position: 'absolute', bottom: G - 16, left: 0, display: 'block', willChange: 'transform' }}>
            <path d={h.d} fill={phase.hills[i]} style={{ transition: 'fill 1.6s ease' }} />
            {h.trees.map((t) => (
              <Tree key={t.id} x={t.x} y={t.y} sc={t.sc} fill={phase.tree} />
            ))}
          </svg>
        ))}

        {/* pollen + fireflies */}
        <div style={{ position: 'absolute', inset: 0, opacity: phase.pollen, transition: 'opacity 1.6s ease', pointerEvents: 'none' }}>
          {pollen.map((p) => (
            <div key={p.id} style={{ position: 'absolute', left: `${p.x}%`, top: `${p.y}%`, width: p.s, height: p.s, borderRadius: '50%', background: 'rgba(255,250,225,.85)', filter: 'blur(.6px)', animation: `bj-pollen ${p.d}s ${p.dl}s linear infinite` }} />
          ))}
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: phase.fire, transition: 'opacity 1.6s ease', pointerEvents: 'none' }}>
          {fireflies.map((f) => (
            <div key={f.id} style={{ position: 'absolute', left: `${f.x}%`, top: `${f.y}%`, width: 4, height: 4, borderRadius: '50%', background: '#ffe98a', boxShadow: '0 0 10px 3px rgba(255,228,130,.65)', animation: `bj-fire ${f.d}s ${f.dl}s ease-in-out infinite` }} />
          ))}
        </div>
      </div>

      {/* ===== MEADOW (scrolls) ===== */}
      <div
        ref={scrollerRef}
        className="bj-scroll"
        onScroll={onScroll}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        style={{ position: 'absolute', inset: 0, zIndex: 10, overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none', cursor: grabbing ? 'grabbing' : 'grab' }}
      >
        <div style={{ position: 'relative', width: worldW, height: '100%', filter: phase.filter, transition: 'filter 1.4s ease' }}>
          {/* ground */}
          {PHASE_ORDER.map((k) => (
            <div key={k} style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: G, background: PHASES[k].ground, opacity: k === phaseKey ? 1 : 0, transition: 'opacity 1.6s ease' }} />
          ))}

          {/* month labels */}
          {layout.months.map((m, i) => (
            <div key={m.key} style={{ position: 'absolute', left: m.cx, bottom: G - 34, transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none', opacity: activeMonth === i ? 1 : 0.55, transition: 'opacity .5s' }}>
              <div style={{ fontFamily: sans, fontSize: 11, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', color: 'rgba(250,246,232,.85)', textShadow: '0 1px 8px rgba(20,30,25,.35)' }}>
                {MONTH_NAMES[m.m]}
              </div>
              <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 13, color: 'rgba(250,246,232,.6)' }}>{m.y}</div>
            </div>
          ))}

          {/* grass */}
          <div style={{ position: 'absolute', inset: 0, color: phase.grass, transition: 'color 1.6s ease', pointerEvents: 'none' }}>
            {tufts.map((t) => (
              <GrassTuft key={t.id} left={t.left} bottom={t.bottom} sc={t.sc} dur={t.dur} delay={t.dl} z={t.z} />
            ))}
          </div>

          {/* flowers */}
          {layout.entries.map((e, i) => {
            const anniv = isAnniv(e.createdAt);
            return (
              <button
                key={e.id}
                onClick={() => {
                  if (drag.current.moved > 6) return;
                  setActive(e);
                }}
                onMouseEnter={() => setHovered(e.id)}
                onMouseLeave={() => setHovered((h) => (h === e.id ? null : h))}
                aria-label={`${e.title}, ${fmtFull(e.createdAt)}`}
                style={{
                  position: 'absolute',
                  left: e.x,
                  bottom: e.yB,
                  zIndex: hovered === e.id ? 200 : e.z,
                  width: 120,
                  height: 170,
                  marginLeft: -60,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  transform: `scale(${e.scale})`,
                  transformOrigin: 'bottom center',
                  opacity: e.fade,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {/* ground shadow */}
                <div style={{ position: 'absolute', left: '50%', bottom: -4, width: 64, height: 14, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(15,35,20,.28), transparent 70%)' }} />
                {/* favourite halo */}
                {e.isFavourited && (
                  <div style={{ position: 'absolute', left: '50%', top: 22, width: 110, height: 110, transform: 'translateX(-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,219,140,.4), transparent 68%)', pointerEvents: 'none' }} />
                )}
                <div style={{ animation: `bj-bloom .9s cubic-bezier(.18,.9,.32,1.2) both`, animationDelay: `${0.15 + i * 0.04}s`, transformOrigin: 'bottom center' }}>
                  <div style={{ transition: 'transform .35s ease', transform: hovered === e.id ? 'scale(1.07)' : 'scale(1)', transformOrigin: 'bottom center' }}>
                    <div style={{ animation: `bj-sway ${e.sway}s ease-in-out infinite alternate`, animationDelay: `${e.delay}s`, transformOrigin: '60px 170px' }}>
                      <FlowerArt entry={e} />
                    </div>
                  </div>
                </div>
                {anniv && (
                  <>
                    <div style={{ position: 'absolute', left: 16, top: 28, color: '#ffe49a', fontSize: 13, textShadow: '0 0 8px rgba(255,220,140,.8)', animation: 'bj-spark 3.2s ease-in-out infinite', pointerEvents: 'none' }}>✦</div>
                    <div style={{ position: 'absolute', right: 18, top: 50, color: '#ffe9b0', fontSize: 9, textShadow: '0 0 6px rgba(255,220,140,.8)', animation: 'bj-spark 2.6s 1.1s ease-in-out infinite', pointerEvents: 'none' }}>✦</div>
                  </>
                )}
                {/* hover tooltip */}
                {hovered === e.id && (
                  <div style={{ position: 'absolute', left: '50%', top: -6, transform: 'translate(-50%,-100%)', whiteSpace: 'nowrap', background: 'rgba(251,246,236,.96)', border: '1px solid #e3d6bd', borderRadius: 999, padding: '5px 14px', boxShadow: '0 6px 18px rgba(25,35,30,.22)', pointerEvents: 'none' }}>
                    <span style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 14, color: '#3d4438' }}>{e.title}</span>
                    <span style={{ fontFamily: sans, fontSize: 10.5, color: '#8a8270', marginLeft: 8, fontWeight: 700 }}>{fmtShort(e.createdAt)}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== RAIN ===== */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', opacity: weather === 'rain' ? 1 : 0, transition: 'opacity 1s ease' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(70,92,122,.16)' }} />
        <div style={{ position: 'absolute', inset: '-10% 0', transform: 'rotate(7deg)' }}>
          {drops.map((d) => (
            <div key={d.id} style={{ position: 'absolute', left: `${d.x}%`, top: 0, width: 1.5, height: d.h, background: 'linear-gradient(to bottom, transparent, rgba(205,220,240,.55))', animation: weather === 'rain' ? `bj-rain ${d.d}s ${d.dl}s linear infinite` : 'none' }} />
          ))}
        </div>
      </div>

      {/* ===== HEADER ===== */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '18px 22px', pointerEvents: 'none' }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{ fontFamily: serif, fontStyle: 'italic', fontWeight: 500, fontSize: 30, color: '#faf6e9', textShadow: '0 2px 16px rgba(15,25,35,.45)', lineHeight: 1 }}>Bloom</div>
          <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 2.6, textTransform: 'uppercase', color: 'rgba(250,246,233,.78)', textShadow: '0 1px 10px rgba(15,25,35,.5)', marginTop: 6 }}>
            a living journal · {layout.entries.length} memories
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, pointerEvents: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div style={{ ...glass, borderRadius: 999, padding: 4, display: 'flex', gap: 2 }}>
            {PHASE_ORDER.map((k) => (
              <button
                key={k}
                onClick={() => setPhaseKey(k)}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 999,
                  padding: '6px 11px',
                  fontFamily: sans,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.4,
                  textTransform: 'uppercase',
                  color: phaseKey === k ? '#2c3328' : 'rgba(247,241,227,.85)',
                  background: phaseKey === k ? '#f3ecd9' : 'transparent',
                  transition: 'all .3s',
                }}
              >
                {PHASES[k].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setWeather((w) => (w === 'rain' ? 'clear' : 'rain'))}
            aria-label="Toggle rain"
            style={{ ...glass, borderRadius: 999, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase', background: weather === 'rain' ? '#f3ecd9' : glass.background, color: weather === 'rain' ? '#2c3328' : '#f7f1e3' }}
          >
            {weather === 'rain' ? <RainIcon /> : <SunIcon />}
            {weather === 'rain' ? 'Rain' : 'Clear'}
          </button>
        </div>
      </div>

      {/* ===== REPLAY CARD ===== */}
      {replay && !active && (
        <div style={{ position: 'absolute', top: 86, left: '50%', zIndex: 52, width: 'min(420px, calc(100vw - 36px))', animation: 'bj-replay .7s ease both', transform: 'translateX(-50%)' }}>
          <div style={{ background: 'rgba(251,246,236,.97)', border: '1px solid #e6d9bf', borderRadius: 16, padding: '14px 16px', boxShadow: '0 14px 40px rgba(20,30,28,.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: sans, fontSize: 10, fontWeight: 800, letterSpacing: 2.2, textTransform: 'uppercase', color: '#a98c4a' }}>✦ This day in your garden</div>
              <button onClick={() => setReplay(null)} aria-label="Dismiss" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9181', fontSize: 15, lineHeight: 1, padding: 4 }}>✕</button>
            </div>
            <div style={{ fontFamily: serif, fontStyle: 'italic', fontSize: 19, color: '#3a4136', margin: '6px 0 3px' }}>“{replay.title}”</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: '#8b8370' }}>
              {snapshotLine(replay.timePhase, replay.weather.toLowerCase(), replay.place)} · {agoLabel(replay.createdAt)}
            </div>
            <button
              onClick={() => { visitEntry(replay); setReplay(null); }}
              style={{ marginTop: 10, border: '1px solid #d8c9a4', background: '#f0e6cd', color: '#5c5236', borderRadius: 999, padding: '6px 16px', fontFamily: sans, fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', cursor: 'pointer' }}
            >
              Visit this memory
            </button>
          </div>
        </div>
      )}

      {/* ===== TIMELINE SCRUBBER ===== (raised above the global bottom dock) */}
      <div style={{ position: 'absolute', bottom: 96, left: '50%', transform: 'translateX(-50%)', zIndex: 50, maxWidth: 'calc(100vw - 28px)' }}>
        <div style={{ ...glass, borderRadius: 999, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {layout.months.map((m, i) => (
            <button
              key={m.key}
              onClick={() => scrollToX(m.cx)}
              style={{
                border: 'none',
                cursor: 'pointer',
                background: 'transparent',
                padding: '3px 7px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                color: activeMonth === i ? '#ffe1a0' : 'rgba(247,241,227,.62)',
                transition: 'color .3s',
              }}
            >
              <span style={{ width: activeMonth === i ? 7 : 5, height: activeMonth === i ? 7 : 5, borderRadius: '50%', background: 'currentColor', transition: 'all .3s' }} />
              <span style={{ fontFamily: sans, fontSize: 9, fontWeight: 800, letterSpacing: 1.1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {MONTH_ABBR[m.m]}{m.m === 0 || i === 0 ? ` '${String(m.y).slice(2)}` : ''}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* hint */}
      <div style={{ position: 'absolute', bottom: 76, left: 22, zIndex: 50, fontFamily: serif, fontStyle: 'italic', fontSize: 14, color: 'rgba(250,246,233,.72)', textShadow: '0 1px 10px rgba(15,25,35,.5)', pointerEvents: 'none' }}>
        drag to wander · tap a bloom to remember
      </div>

      {/* ===== MEMORY CARD ===== */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(12,16,24,.22)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 16px 92px' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ width: 'min(440px, 100%)', background: '#fbf6ec', border: '1px solid #e6d9bf', borderRadius: 20, padding: '20px 22px 18px', boxShadow: '0 24px 70px rgba(15,22,20,.4)', animation: 'bj-card .45s cubic-bezier(.2,.8,.3,1) both' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: moodMeta?.chip || '#999' }} />
                <span style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', color: '#7d7561' }}>{moodMeta?.label || active.mood}</span>
                {activeFav && <span style={{ color: '#d4a23c', fontSize: 13 }}>♥</span>}
                {active.bloom === 'pumpkin' && <span style={{ fontSize: 12 }} title="rare bloom">🎃</span>}
              </div>
              <button onClick={() => setActive(null)} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#9a9181', fontSize: 16, lineHeight: 1, padding: 4 }}>✕</button>
            </div>

            <div style={{ fontFamily: serif, fontWeight: 500, fontSize: 26, lineHeight: 1.15, color: '#33392f', margin: '10px 0 4px' }}>{active.title}</div>
            <div style={{ fontFamily: sans, fontSize: 11.5, color: '#8b8370', marginBottom: 12 }}>
              {fmtFull(active.createdAt)} · {agoLabel(active.createdAt)}{isAnniv(active.createdAt) ? ' ✦' : ''}
            </div>

            <div style={{ fontFamily: serif, fontSize: 17.5, lineHeight: 1.55, color: '#474e42', borderLeft: '2px solid #e3d3ac', paddingLeft: 14, fontStyle: 'italic' }}>
              {active.content}
            </div>

            <div style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: '#a39a83', marginTop: 14 }}>
              {snapshotLine(active.timePhase, active.weather, active.place)}
            </div>

            {(active.tags?.length || 0) > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                {active.tags.map((t) => (
                  <span key={t} style={{ fontFamily: sans, fontSize: 10.5, fontWeight: 700, color: '#6f7a64', background: '#eee6d0', border: '1px solid #e0d3b3', borderRadius: 999, padding: '3px 10px' }}>#{t}</span>
                ))}
              </div>
            )}

            {parentOf(active) && (
              <button onClick={() => setActive(parentOf(active))} style={{ marginTop: 12, display: 'block', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#8a6f3c', textAlign: 'left' }}>
                ↩ revisits “{parentOf(active)!.title}”
              </button>
            )}
            {childrenOf(active).map((c) => (
              <button key={c.id} onClick={() => setActive(c)} style={{ marginTop: 8, display: 'block', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, fontFamily: sans, fontSize: 12, fontWeight: 700, color: '#8a6f3c', textAlign: 'left' }}>
                ↪ revisited on {fmtShort(c.createdAt)} — “{c.title}”
              </button>
            ))}

            {/* actions (hidden in the standalone preview, which has no real entries to act on) */}
            {!preview && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                <button onClick={() => router.push(`/entry/${active.id}`)} style={pill}>Open full memory</button>
                <button
                  onClick={() => void handleFavourite()}
                  style={{ ...pill, background: activeFav ? '#f7e4b0' : '#f6f1e4', borderColor: activeFav ? '#e2c98a' : '#e0d3b3', color: activeFav ? '#9a6f1e' : '#6f6650' }}
                >
                  {activeFav ? '♥ Favourited' : '♡ Favourite'}
                </button>
                <button onClick={() => router.push(`/revisit/${active.id}`)} style={{ ...pill, background: '#f6f1e4', borderColor: '#e0d3b3', color: '#6f6650' }}>↻ Revisit</button>
                <button onClick={() => void handleDelete()} style={{ ...pill, background: '#f6e6df', borderColor: '#e3c4b8', color: '#a8553f' }}>Delete</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* paper grain + vignette */}
      <svg style={{ position: 'absolute', inset: 0, zIndex: 70, width: '100%', height: '100%', opacity: 0.05, mixBlendMode: 'multiply', pointerEvents: 'none' }}>
        <filter id="bj-grain"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" /></filter>
        <rect width="100%" height="100%" filter="url(#bj-grain)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, zIndex: 65, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 58%, rgba(18,22,30,.2) 100%)' }} />
    </div>
  );
}

export default BloomMeadow;
