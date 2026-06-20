import React from 'react';

import { nsId } from '@/components/flower/blooms/bloomTypes';
import { createRng, rngRange } from '@bloom/core/flowers/prng';
import type { BouquetGreenery as BouquetGreeneryKind } from '@bloom/core';

/**
 * Bespoke greenery accents for a tied bouquet, drawn bold enough to frame the flowers rather than
 * sit behind them as a faint sliver. Each accent fills most of the `0 0 100 140` viewBox and matches
 * the bloom art's polish — vertical/diagonal gradients (unique ids via {@link nsId}), layered
 * front/back shapes, outline strokes for definition, and soft highlights. A single
 * {@link renderBouquetGreenery} entry point keeps the live preview and the PNG builder in sync.
 */

/** Deep, saturated foliage green — reeds and fern. */
const FOLIAGE = {
  light: '#C7DDA6',
  mid: '#9BBE72',
  wash: '#73A050',
  dark: '#4E7B37',
  deep: '#345A22',
  line: '#2B4A1A',
} as const;

/** Cooler dusty silver-green with a woody stem — eucalyptus sprigs. */
const EUCALYPTUS = {
  light: '#DCE8D5',
  wash: '#9FBC9A',
  dark: '#6C8E6C',
  deep: '#48684C',
  line: '#39543F',
  stem: '#7A6048',
} as const;

/** Warm saturated wheat gold. */
const WHEAT = {
  light: '#F5E5A4',
  mid: '#E8C86A',
  wash: '#D7AA40',
  dark: '#B6861F',
  deep: '#8A6315',
  line: '#6E4E11',
  stem: '#CBA64D',
} as const;

/** Soft white blossoms on a dusty sage stem — baby's breath. A cool shade ring + shadow give the
 *  florets definition against the warm cream card. */
const BREATH = {
  petal: '#FDFCF8',
  shade: '#C4CEBA',
  center: '#E7D6A4',
  stem: '#A6B991',
  shadow: '#9CAB92',
} as const;

/** Tawny seed-head brown for the reed spikes. */
const SEED = { base: '#5A3E22', top: '#825C32' } as const;

type Props = {
  kind: BouquetGreeneryKind;
  /** Stable per-accent seed so the shapes don't reshuffle on every render. */
  seed: number;
  /** Ground anchor in the parent's viewBox coordinates; the accent grows up from here. */
  cx?: number;
  baseY?: number;
};

type Sub = { ns: string; seed: number; cx: number; baseY: number };

const f1 = (n: number) => n.toFixed(1);

/* ------------------------------ quad helpers ------------------------------ */
type Pt = { x: number; y: number };
function qPoint(p0: Pt, c: Pt, p1: Pt, t: number): Pt {
  const m = 1 - t;
  return { x: m * m * p0.x + 2 * m * t * c.x + t * t * p1.x, y: m * m * p0.y + 2 * m * t * c.y + t * t * p1.y };
}
function qAngle(p0: Pt, c: Pt, p1: Pt, t: number): number {
  const m = 1 - t;
  const dx = 2 * m * (c.x - p0.x) + 2 * t * (p1.x - c.x);
  const dy = 2 * m * (c.y - p0.y) + 2 * t * (p1.y - c.y);
  return Math.atan2(dy, dx);
}
/** A pointed lens leaf from base (bx,by) to tip (tx,ty) with half-width `w`. */
function lens(bx: number, by: number, tx: number, ty: number, w: number): string {
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const dx = tx - bx;
  const dy = ty - by;
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * w;
  const py = (dx / len) * w;
  return `M ${f1(bx)} ${f1(by)} Q ${f1(mx + px)} ${f1(my + py)} ${f1(tx)} ${f1(ty)} Q ${f1(mx - px)} ${f1(my - py)} ${f1(bx)} ${f1(by)} Z`;
}
/** A soft shadow puddle to ground the accent at the tie. */
function groundShadow(cx: number, baseY: number): React.ReactElement {
  return <ellipse key="ground" cx={cx} cy={baseY - 0.5} rx={17} ry={2.6} fill="#2B4A1A" fillOpacity={0.12} />;
}

export function renderBouquetGreenery(props: Props): React.ReactElement {
  const cx = props.cx ?? 50;
  const baseY = props.baseY ?? 138;
  const sub: Sub = { ns: `bqg-${props.kind}-${props.seed}`, seed: props.seed, cx, baseY };

  switch (props.kind) {
    case 'reeds':
      return <Reeds {...sub} />;
    case 'sprigs':
      return <Sprigs {...sub} />;
    case 'fern':
      return <Fern {...sub} />;
    case 'babys-breath':
      return <BabysBreath {...sub} />;
    case 'wheat':
      return <Wheat {...sub} />;
  }
}

/* ------------------------------ Reeds ------------------------------ */
function Reeds({ ns, seed, cx, baseY }: Sub) {
  const rng = createRng(seed ^ 0x9eed);
  const blade = nsId(ns, 'blade');
  const spike = nsId(ns, 'spike');
  const els: React.ReactElement[] = [groundShadow(cx, baseY)];

  const count = 9;
  const tips: Pt[] = [];
  const angles: number[] = [];
  for (let i = 0; i < count; i++) {
    const dir = (i / (count - 1)) * 2 - 1; // -1 .. 1
    const len = 96 - Math.abs(dir) * 24 + rngRange(rng, -4, 6);
    const tipX = cx + dir * 36 + rngRange(rng, -1.5, 1.5);
    const tipY = baseY - len;
    const ctrlX = cx + dir * 16 + dir * 8;
    const ctrlY = baseY - len * 0.55;
    const w = 2.5 - Math.abs(dir) * 0.8;
    els.push(
      <path
        key={`reed-${i}`}
        d={`M ${f1(cx)} ${f1(baseY)} Q ${f1(ctrlX)} ${f1(ctrlY)} ${f1(tipX)} ${f1(tipY)}`}
        stroke={`url(#${blade})`}
        strokeWidth={w}
        strokeLinecap="round"
        fill="none"
      />,
    );
    tips.push({ x: tipX, y: tipY });
    angles.push(Math.atan2(tipY - ctrlY, tipX - ctrlX));
  }

  // Short front blades for a fuller base.
  for (let i = 0; i < 5; i++) {
    const dir = rngRange(rng, -1, 1);
    const len = 34 + rngRange(rng, 0, 16);
    els.push(
      <path
        key={`reed-short-${i}`}
        d={`M ${f1(cx)} ${f1(baseY)} Q ${f1(cx + dir * 10)} ${f1(baseY - len * 0.6)} ${f1(cx + dir * 22)} ${f1(baseY - len)}`}
        stroke={FOLIAGE.dark}
        strokeWidth={1.6}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }

  // Cattail seed heads on a few central blades — a rounded capsule down the stalk top, a fine tip,
  // and a gloss highlight.
  for (const i of [3, 4, 5]) {
    const tip = tips[i]!;
    const ang = angles[i]!;
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const capLen = 18;
    const bx = tip.x - ux * capLen;
    const by = tip.y - uy * capLen;
    els.push(
      <line
        key={`reed-cap-${i}`}
        x1={f1(tip.x)}
        y1={f1(tip.y)}
        x2={f1(bx)}
        y2={f1(by)}
        stroke={`url(#${spike})`}
        strokeWidth={3.6}
        strokeLinecap="round"
      />,
      <line
        key={`reed-tip-${i}`}
        x1={f1(tip.x)}
        y1={f1(tip.y)}
        x2={f1(tip.x + ux * 6)}
        y2={f1(tip.y + uy * 6)}
        stroke={SEED.base}
        strokeWidth={0.8}
        strokeLinecap="round"
      />,
      <line
        key={`reed-gloss-${i}`}
        x1={f1(tip.x - uy * 0.9 - ux * 3)}
        y1={f1(tip.y + ux * 0.9 - uy * 3)}
        x2={f1(bx - uy * 0.9 + ux * 3)}
        y2={f1(by + ux * 0.9 + uy * 3)}
        stroke="#FFFFFF"
        strokeWidth={0.7}
        strokeOpacity={0.3}
        strokeLinecap="round"
      />,
    );
  }

  return (
    <g>
      <defs>
        <linearGradient id={blade} gradientUnits="userSpaceOnUse" x1={cx} y1={baseY} x2={cx} y2={30}>
          <stop offset="0%" stopColor={FOLIAGE.deep} />
          <stop offset="45%" stopColor={FOLIAGE.dark} />
          <stop offset="100%" stopColor={FOLIAGE.mid} />
        </linearGradient>
        <linearGradient id={spike} gradientUnits="userSpaceOnUse" x1={cx} y1={baseY} x2={cx} y2={40}>
          <stop offset="0%" stopColor={SEED.base} />
          <stop offset="100%" stopColor={SEED.top} />
        </linearGradient>
      </defs>
      {els}
    </g>
  );
}

/* ------------------------------ Sprigs (eucalyptus) ------------------------------ */
function Sprigs({ ns, seed, cx, baseY }: Sub) {
  const rng = createRng(seed ^ 0x59412);
  const leaf = nsId(ns, 'leaf');
  const els: React.ReactElement[] = [groundShadow(cx, baseY)];

  const branches = [
    { tip: { x: cx - 16, y: 48 }, ctrl: { x: cx - 17, y: 96 }, leaves: 7 },
    { tip: { x: cx + 17, y: 40 }, ctrl: { x: cx + 16, y: 92 }, leaves: 8 },
  ];

  branches.forEach((br, bi) => {
    const p0 = { x: cx, y: baseY };
    els.push(
      <path
        key={`euc-stem-${bi}`}
        d={`M ${f1(p0.x)} ${f1(p0.y)} Q ${f1(br.ctrl.x)} ${f1(br.ctrl.y)} ${f1(br.tip.x)} ${f1(br.tip.y)}`}
        stroke={EUCALYPTUS.stem}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />,
    );

    for (let l = 1; l <= br.leaves; l++) {
      const t = 0.2 + (l / (br.leaves + 1)) * 0.78;
      const pt = qPoint(p0, br.ctrl, br.tip, t);
      const stemAng = qAngle(p0, br.ctrl, br.tip, t);
      const side = l % 2 === 0 ? 1 : -1;
      const leafAng = stemAng + side * (0.9 + rngRange(rng, -0.1, 0.1));
      const size = 7 - t * 2.6;
      const lx = pt.x + Math.cos(leafAng) * size * 0.95;
      const ly = pt.y + Math.sin(leafAng) * size * 0.95;
      const deg = (leafAng * 180) / Math.PI;
      const rot = `rotate(${f1(deg)} ${f1(lx)} ${f1(ly)})`;
      // Back leaf — darker, slightly larger, sits behind for depth.
      els.push(
        <ellipse
          key={`euc-back-${bi}-${l}`}
          cx={f1(lx + Math.cos(leafAng) * 0.6)}
          cy={f1(ly + Math.sin(leafAng) * 0.6)}
          rx={f1(size + 0.7)}
          ry={f1(size * 0.62)}
          fill={EUCALYPTUS.deep}
          fillOpacity={0.65}
          transform={rot}
        />,
      );
      // Front leaf — gradient fill, defining outline, rim highlight.
      els.push(
        <ellipse
          key={`euc-leaf-${bi}-${l}`}
          cx={f1(lx)}
          cy={f1(ly)}
          rx={f1(size)}
          ry={f1(size * 0.58)}
          fill={`url(#${leaf})`}
          stroke={EUCALYPTUS.line}
          strokeWidth={0.4}
          strokeOpacity={0.5}
          transform={rot}
        />,
        <ellipse
          key={`euc-hi-${bi}-${l}`}
          cx={f1(lx - size * 0.3)}
          cy={f1(ly - size * 0.22)}
          rx={f1(size * 0.4)}
          ry={f1(size * 0.2)}
          fill="#FFFFFF"
          fillOpacity={0.28}
          transform={rot}
        />,
      );
    }

    // A small bud at each branch tip.
    els.push(
      <circle key={`euc-bud-${bi}`} cx={f1(br.tip.x)} cy={f1(br.tip.y)} r={1.7} fill={EUCALYPTUS.wash} stroke={EUCALYPTUS.line} strokeWidth={0.3} strokeOpacity={0.5} />,
    );
  });

  return (
    <g>
      <defs>
        <linearGradient id={leaf} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={EUCALYPTUS.light} />
          <stop offset="55%" stopColor={EUCALYPTUS.wash} />
          <stop offset="100%" stopColor={EUCALYPTUS.deep} />
        </linearGradient>
      </defs>
      {els}
    </g>
  );
}

/* ------------------------------ Fern ------------------------------ */
function Fern({ ns, seed, cx, baseY }: Sub) {
  const rng = createRng(seed ^ 0xfe24);
  const frond = nsId(ns, 'frond');
  const els: React.ReactElement[] = [groundShadow(cx, baseY)];

  const fronds = [
    { tip: { x: cx - 26, y: 54 }, ctrl: { x: cx - 20, y: 96 } },
    { tip: { x: cx, y: 28 }, ctrl: { x: cx + 2, y: 84 } },
    { tip: { x: cx + 27, y: 50 }, ctrl: { x: cx + 21, y: 94 } },
  ];

  fronds.forEach((fr, fi) => {
    const p0 = { x: cx, y: baseY };
    els.push(
      <path
        key={`fern-rachis-${fi}`}
        d={`M ${f1(p0.x)} ${f1(p0.y)} Q ${f1(fr.ctrl.x)} ${f1(fr.ctrl.y)} ${f1(fr.tip.x)} ${f1(fr.tip.y)}`}
        stroke={`url(#${frond})`}
        strokeWidth={1.7}
        strokeLinecap="round"
        fill="none"
      />,
    );

    const pairs = 11;
    for (let l = 1; l <= pairs; l++) {
      const t = l / (pairs + 1);
      const pt = qPoint(p0, fr.ctrl, fr.tip, t);
      const ang = qAngle(p0, fr.ctrl, fr.tip, t);
      const len = 12 * (1 - t * 0.62) + rngRange(rng, -0.6, 0.6);
      for (const side of [-1, 1]) {
        const pinnaAng = ang + side * 0.72;
        const tx = pt.x + Math.cos(pinnaAng) * len;
        const ty = pt.y + Math.sin(pinnaAng) * len;
        els.push(
          <path
            key={`fern-pinna-${fi}-${l}-${side}`}
            d={lens(pt.x, pt.y, tx, ty, len * 0.2)}
            fill={`url(#${frond})`}
            fillOpacity={0.92}
            stroke={FOLIAGE.deep}
            strokeWidth={0.25}
            strokeOpacity={0.4}
          />,
        );
      }
    }
  });

  return (
    <g>
      <defs>
        <linearGradient id={frond} gradientUnits="userSpaceOnUse" x1={cx} y1={baseY} x2={cx} y2={28}>
          <stop offset="0%" stopColor={FOLIAGE.deep} />
          <stop offset="50%" stopColor={FOLIAGE.wash} />
          <stop offset="100%" stopColor={FOLIAGE.light} />
        </linearGradient>
      </defs>
      {els}
    </g>
  );
}

/* ------------------------------ Baby's breath ------------------------------ */
function BabysBreath({ seed, cx, baseY }: Omit<Sub, 'ns'>) {
  const rng = createRng(seed ^ 0xb4b9);
  const els: React.ReactElement[] = [groundShadow(cx, baseY)];

  // Soft out-of-focus background dots for cloud volume.
  for (let i = 0; i < 16; i++) {
    els.push(
      <circle
        key={`bb-bg-${i}`}
        cx={f1(cx + rngRange(rng, -30, 30))}
        cy={f1(rngRange(rng, 38, 82))}
        r={f1(2.8 + rngRange(rng, 0, 1.8))}
        fill={BREATH.petal}
        fillOpacity={0.22}
      />,
    );
  }

  const stems = 8;
  for (let s = 0; s < stems; s++) {
    const dir = (s / (stems - 1)) * 2 - 1; // -1 .. 1
    const tipX = cx + dir * 33 + rngRange(rng, -2, 2);
    const tipY = 44 - (1 - Math.abs(dir)) * 12 + rngRange(rng, -3, 3);
    const ctrl = { x: cx + dir * 16, y: baseY - 46 };
    const p0 = { x: cx, y: baseY };
    const tip = { x: tipX, y: tipY };
    els.push(
      <path
        key={`bb-stem-${s}`}
        d={`M ${f1(p0.x)} ${f1(p0.y)} Q ${f1(ctrl.x)} ${f1(ctrl.y)} ${f1(tip.x)} ${f1(tip.y)}`}
        stroke={BREATH.stem}
        strokeWidth={0.7}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />,
    );

    // Branchlets + a cluster of tiny blossoms toward the top.
    const blossomSpots: Pt[] = [];
    for (const t of [0.62, 0.78, 0.9, 1]) {
      const pt = qPoint(p0, ctrl, tip, t);
      blossomSpots.push(pt);
      if (t < 1) {
        for (const side of [-1, 1]) {
          const bx = pt.x + side * (3 + rngRange(rng, 0, 2));
          const by = pt.y - (2 + rngRange(rng, 0, 2));
          els.push(
            <path
              key={`bb-br-${s}-${t}-${side}`}
              d={`M ${f1(pt.x)} ${f1(pt.y)} Q ${f1((pt.x + bx) / 2)} ${f1(pt.y - 1)} ${f1(bx)} ${f1(by)}`}
              stroke={BREATH.stem}
              strokeWidth={0.5}
              strokeOpacity={0.7}
              strokeLinecap="round"
              fill="none"
            />,
          );
          blossomSpots.push({ x: bx, y: by });
        }
      }
    }

    blossomSpots.forEach((b, bi) => {
      const r = 2.3 + rngRange(rng, 0, 1.1);
      els.push(
        // Soft halo for volume, a faint cool drop-shadow, then the defined floret.
        <circle key={`bb-halo-${s}-${bi}`} cx={f1(b.x)} cy={f1(b.y)} r={f1(r * 1.55)} fill={BREATH.petal} fillOpacity={0.22} />,
        <circle key={`bb-sh-${s}-${bi}`} cx={f1(b.x + 0.5)} cy={f1(b.y + 0.7)} r={f1(r)} fill={BREATH.shadow} fillOpacity={0.18} />,
        <circle key={`bb-bloom-${s}-${bi}`} cx={f1(b.x)} cy={f1(b.y)} r={f1(r)} fill={BREATH.petal} stroke={BREATH.shade} strokeWidth={0.5} />,
        <circle key={`bb-core-${s}-${bi}`} cx={f1(b.x)} cy={f1(b.y)} r={f1(r * 0.34)} fill={BREATH.center} fillOpacity={0.85} />,
        <circle key={`bb-hi-${s}-${bi}`} cx={f1(b.x - r * 0.32)} cy={f1(b.y - r * 0.32)} r={f1(r * 0.3)} fill="#FFFFFF" fillOpacity={0.8} />,
      );
    });
  }

  return <g>{els}</g>;
}

/* ------------------------------ Wheat ------------------------------ */
function Wheat({ ns, seed, cx, baseY }: Sub) {
  const rng = createRng(seed ^ 0x4e2);
  const grain = nsId(ns, 'grain');
  const els: React.ReactElement[] = [groundShadow(cx, baseY)];

  const stalks = [
    { tip: { x: cx - 22, y: 50 }, headFrac: 0.5 },
    { tip: { x: cx, y: 30 }, headFrac: 0.46 },
    { tip: { x: cx + 23, y: 48 }, headFrac: 0.5 },
  ];

  stalks.forEach((stk, si) => {
    const p0 = { x: cx, y: baseY };
    const ctrl = { x: cx + (stk.tip.x - cx) * 0.4, y: baseY - (baseY - stk.tip.y) * 0.55 };
    const headBase = qPoint(p0, ctrl, stk.tip, stk.headFrac);
    // Stalk up to the head.
    els.push(
      <path
        key={`wheat-stalk-${si}`}
        d={`M ${f1(p0.x)} ${f1(p0.y)} Q ${f1(ctrl.x)} ${f1(ctrl.y)} ${f1(headBase.x)} ${f1(headBase.y)}`}
        stroke={WHEAT.stem}
        strokeWidth={1.6}
        strokeLinecap="round"
        fill="none"
      />,
    );

    const rows = 7;
    for (let r = 0; r < rows; r++) {
      const t = stk.headFrac + (r / (rows - 1)) * (1 - stk.headFrac);
      const pt = qPoint(p0, ctrl, stk.tip, t);
      const ang = qAngle(p0, ctrl, stk.tip, t);
      const len = 8 - r * 0.5;
      for (const side of [-1, 1]) {
        const grainAng = ang + side * 0.55;
        const tx = pt.x + Math.cos(grainAng) * len;
        const ty = pt.y + Math.sin(grainAng) * len;
        els.push(
          // Awn behind the grain — a fine bristle, kept short so the grains read first.
          <line
            key={`wheat-awn-${si}-${r}-${side}`}
            x1={f1(tx)}
            y1={f1(ty)}
            x2={f1(tx + Math.cos(grainAng) * (3.4 - r * 0.3))}
            y2={f1(ty + Math.sin(grainAng) * (3.4 - r * 0.3))}
            stroke={WHEAT.dark}
            strokeWidth={0.4}
            strokeOpacity={0.55}
            strokeLinecap="round"
          />,
          // Plump grain.
          <path
            key={`wheat-grain-${si}-${r}-${side}`}
            d={lens(pt.x, pt.y, tx, ty, len * 0.46)}
            fill={`url(#${grain})`}
            stroke={WHEAT.line}
            strokeWidth={0.4}
            strokeOpacity={0.65}
          />,
        );
      }
    }

    // Crown grain + central awns at the very tip.
    els.push(
      <path
        key={`wheat-crown-${si}`}
        d={lens(stk.tip.x, stk.tip.y + 4, stk.tip.x, stk.tip.y - 4, 1.8)}
        fill={`url(#${grain})`}
        stroke={WHEAT.line}
        strokeWidth={0.35}
        strokeOpacity={0.6}
      />,
    );
    for (const dx of [-1.4, 0, 1.4]) {
      els.push(
        <line
          key={`wheat-crown-awn-${si}-${dx}`}
          x1={f1(stk.tip.x + dx * 0.4)}
          y1={f1(stk.tip.y - 3)}
          x2={f1(stk.tip.x + dx)}
          y2={f1(stk.tip.y - 7.5 + rngRange(rng, -1, 1))}
          stroke={WHEAT.dark}
          strokeWidth={0.4}
          strokeOpacity={0.6}
          strokeLinecap="round"
        />,
      );
    }
  });

  return (
    <g>
      <defs>
        <linearGradient id={grain} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={WHEAT.light} />
          <stop offset="50%" stopColor={WHEAT.mid} />
          <stop offset="100%" stopColor={WHEAT.dark} />
        </linearGradient>
      </defs>
      {els}
    </g>
  );
}
