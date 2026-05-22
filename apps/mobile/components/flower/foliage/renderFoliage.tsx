import React from 'react';
import { Ellipse, G, Path } from 'react-native-svg';

import type { FoliageVariant } from '@/lib/flowers/foliage';
import type { BloomPalette } from '@/lib/flowers/moodPalettes';
import { createRng, rngRange } from '@/lib/flowers/prng';

type Props = {
  variant: FoliageVariant;
  density: number;
  palette: BloomPalette;
  seed: number;
  /** Ground anchor for blade bases — the stem stands at (cx, baseY). */
  cx?: number;
  baseY?: number;
};

const DEFAULT_CX = 50;
const DEFAULT_BASE_Y = 138;

export function renderFoliage(props: Props): React.ReactElement {
  const cx = props.cx ?? DEFAULT_CX;
  const baseY = props.baseY ?? DEFAULT_BASE_Y;

  switch (props.variant) {
    case 0:
      return <Tuft {...props} cx={cx} baseY={baseY} />;
    case 1:
      return <Clump {...props} cx={cx} baseY={baseY} />;
    case 2:
      return <Wild {...props} cx={cx} baseY={baseY} />;
    case 3:
      return <Fern {...props} cx={cx} baseY={baseY} />;
    case 4:
      return <Reeds {...props} cx={cx} baseY={baseY} />;
    case 5:
      return <Moss {...props} cx={cx} baseY={baseY} />;
    case 6:
      return <Clover {...props} cx={cx} baseY={baseY} />;
    case 7:
      return <Sprigs {...props} cx={cx} baseY={baseY} />;
  }
}

type VariantProps = Required<Pick<Props, 'cx' | 'baseY'>> & Props;

/* ------------------------------ Tuft ------------------------------ */
function Tuft({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0x70f7);
  const count = Math.round(7 * density);
  const blades: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    const angle = -55 + t * 110 + rngRange(rng, -6, 6);
    const length = 10 + rngRange(rng, -2, 4);
    const a = (angle * Math.PI) / 180;
    const tipX = cx + Math.sin(a) * length;
    const tipY = baseY - Math.cos(a) * length;
    const midX = cx + Math.sin(a) * length * 0.55 + rngRange(rng, -1.5, 1.5);
    const midY = baseY - Math.cos(a) * length * 0.55;
    const d = `M ${cx.toFixed(2)} ${baseY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;
    blades.push(
      <Path
        key={`tuft-${i}`}
        d={d}
        stroke={palette.leaf}
        strokeWidth={1.1}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return <G>{blades}</G>;
}

/* ------------------------------ Clump ----------------------------- */
function Clump({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0xc1a3);
  const count = Math.round(11 * density);
  const blades: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const ox = rngRange(rng, -16, 16);
    const length = 5 + rngRange(rng, 0, 5);
    const lean = rngRange(rng, -4, 4);
    const tipX = cx + ox + lean;
    const tipY = baseY - length;
    const d = `M ${(cx + ox).toFixed(2)} ${baseY.toFixed(2)} Q ${(cx + ox + lean * 0.4).toFixed(2)} ${(baseY - length * 0.55).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;
    blades.push(
      <Path
        key={`clump-${i}`}
        d={d}
        stroke={i % 2 === 0 ? palette.leaf : palette.stem}
        strokeWidth={1.2}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return <G>{blades}</G>;
}

/* ------------------------------ Wild ------------------------------ */
function Wild({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0xa17d);
  const tallCount = 3;
  const shortCount = Math.round(5 * density);
  const blades: React.ReactElement[] = [];

  for (let i = 0; i < tallCount; i++) {
    const side = i === 0 ? 0 : i === 1 ? -1 : 1;
    const ox = side * (8 + rngRange(rng, -2, 2));
    const length = 16 + rngRange(rng, -2, 4);
    const bend = rngRange(rng, -7, 7) + side * 3;
    const tipX = cx + ox + bend;
    const tipY = baseY - length;
    const midX = cx + ox + bend * 0.4;
    const midY = baseY - length * 0.55;
    const d = `M ${(cx + ox).toFixed(2)} ${baseY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;
    blades.push(
      <Path
        key={`wild-tall-${i}`}
        d={d}
        stroke={palette.stem}
        strokeWidth={1.3}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
  }

  for (let i = 0; i < shortCount; i++) {
    const ox = rngRange(rng, -20, 20);
    const length = 4 + rngRange(rng, 0, 4);
    const tipX = cx + ox + rngRange(rng, -2, 2);
    const tipY = baseY - length;
    const d = `M ${(cx + ox).toFixed(2)} ${baseY.toFixed(2)} Q ${(cx + ox).toFixed(2)} ${(baseY - length * 0.5).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;
    blades.push(
      <Path
        key={`wild-short-${i}`}
        d={d}
        stroke={palette.leaf}
        strokeWidth={1}
        strokeOpacity={0.75}
        strokeLinecap="round"
        fill="none"
      />
    );
  }
  return <G>{blades}</G>;
}

/* ------------------------------ Fern ------------------------------ */
function Fern({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0xfe24);
  const fronds = 3;
  const leafletsPerFrond = Math.max(4, Math.round(5 * density));
  const elements: React.ReactElement[] = [];

  for (let f = 0; f < fronds; f++) {
    const side = f === 0 ? 0 : f === 1 ? -1 : 1;
    const ox = side * 9;
    const length = 17 + rngRange(rng, -2, 3);
    const bendX = cx + ox + side * 6;
    const tipX = cx + ox + side * 10;
    const tipY = baseY - length;
    const baseX = cx + ox;
    const baseYStart = baseY;
    const midX = (baseX + tipX) / 2 + side * 2;
    const midY = (baseYStart + tipY) / 2;
    elements.push(
      <Path
        key={`fern-stem-${f}`}
        d={`M ${baseX.toFixed(2)} ${baseYStart.toFixed(2)} Q ${bendX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.9}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
    for (let l = 1; l <= leafletsPerFrond; l++) {
      const t = l / (leafletsPerFrond + 1);
      const px = baseX + (tipX - baseX) * t + (midX - (baseX + tipX) / 2) * (1 - Math.abs(2 * t - 1));
      const py = baseYStart + (tipY - baseYStart) * t;
      const leafLen = 3.5 * (1 - t * 0.5);
      const leafW = 1.4;
      const dRight = `M ${px.toFixed(2)} ${py.toFixed(2)} q ${leafLen.toFixed(2)} ${(-leafLen * 0.4).toFixed(2)} ${(leafLen * 1.2).toFixed(2)} ${(-leafLen * 0.1).toFixed(2)} q ${(-leafLen * 0.6).toFixed(2)} ${(leafW * 1.4).toFixed(2)} ${(-leafLen * 1.2).toFixed(2)} ${(leafLen * 0.1).toFixed(2)} Z`;
      const dLeft = `M ${px.toFixed(2)} ${py.toFixed(2)} q ${(-leafLen).toFixed(2)} ${(-leafLen * 0.4).toFixed(2)} ${(-leafLen * 1.2).toFixed(2)} ${(-leafLen * 0.1).toFixed(2)} q ${(leafLen * 0.6).toFixed(2)} ${(leafW * 1.4).toFixed(2)} ${(leafLen * 1.2).toFixed(2)} ${(leafLen * 0.1).toFixed(2)} Z`;
      elements.push(
        <Path
          key={`fern-leaf-r-${f}-${l}`}
          d={dRight}
          fill={palette.leaf}
          fillOpacity={0.78}
        />
      );
      elements.push(
        <Path
          key={`fern-leaf-l-${f}-${l}`}
          d={dLeft}
          fill={palette.leaf}
          fillOpacity={0.78}
        />
      );
    }
  }
  return <G>{elements}</G>;
}

/* ------------------------------ Reeds ----------------------------- */
function Reeds({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0x9eed);
  const count = Math.round(9 * density);
  const elements: React.ReactElement[] = [];
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const ox = -20 + t * 40 + rngRange(rng, -1.5, 1.5);
    const length = 14 + rngRange(rng, -3, 4);
    const bend = rngRange(rng, -3, 3);
    const tipX = cx + ox + bend;
    const tipY = baseY - length;
    const d = `M ${(cx + ox).toFixed(2)} ${baseY.toFixed(2)} Q ${(cx + ox + bend * 0.6).toFixed(2)} ${(baseY - length * 0.55).toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`;
    elements.push(
      <Path
        key={`reed-${i}`}
        d={d}
        stroke={palette.stem}
        strokeWidth={0.8}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
    if (i % 2 === 1) {
      elements.push(
        <Ellipse
          key={`reed-head-${i}`}
          cx={tipX}
          cy={tipY - 1.5}
          rx={0.9}
          ry={2.1}
          fill={palette.petalDark}
          fillOpacity={0.85}
        />
      );
    }
  }
  return <G>{elements}</G>;
}

/* ------------------------------ Moss ------------------------------ */
function Moss({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0x70551);
  const dotCount = Math.round(14 * density);
  const elements: React.ReactElement[] = [
    <Ellipse
      key="moss-bed"
      cx={cx}
      cy={baseY - 1}
      rx={22}
      ry={3.4}
      fill={palette.leaf}
      fillOpacity={0.55}
    />,
    <Ellipse
      key="moss-bed-2"
      cx={cx}
      cy={baseY - 1.8}
      rx={16}
      ry={2.4}
      fill={palette.stem}
      fillOpacity={0.6}
    />,
  ];
  for (let i = 0; i < dotCount; i++) {
    const ox = rngRange(rng, -22, 22);
    const oy = rngRange(rng, -4, 0.5);
    const r = 0.7 + rngRange(rng, 0, 0.8);
    elements.push(
      <Ellipse
        key={`moss-dot-${i}`}
        cx={cx + ox}
        cy={baseY + oy}
        rx={r}
        ry={r * 0.85}
        fill={i % 2 === 0 ? palette.leaf : palette.stem}
        fillOpacity={0.75}
      />
    );
  }
  return <G>{elements}</G>;
}

/* ----------------------------- Clover ----------------------------- */
function Clover({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0xc107e);
  const clusters = Math.max(3, Math.round(3 * density));
  const elements: React.ReactElement[] = [];

  for (let c = 0; c < clusters; c++) {
    const ox = -16 + (c / Math.max(1, clusters - 1)) * 32 + rngRange(rng, -2, 2);
    const baseHeight = 3 + rngRange(rng, 0, 2);
    const stemBaseX = cx + ox;
    const headY = baseY - baseHeight;
    elements.push(
      <Path
        key={`clover-stem-${c}`}
        d={`M ${stemBaseX.toFixed(2)} ${baseY.toFixed(2)} L ${stemBaseX.toFixed(2)} ${headY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.7}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />
    );
    for (let l = 0; l < 3; l++) {
      const angle = -120 + l * 120 + rngRange(rng, -8, 8);
      const a = (angle * Math.PI) / 180;
      const lx = stemBaseX + Math.sin(a) * 2.2;
      const ly = headY + Math.cos(a) * 2.2;
      const w = 1.6;
      const h = 2.4;
      const d = `M ${lx.toFixed(2)} ${ly.toFixed(2)} c ${(-w).toFixed(2)} ${(-h * 0.4).toFixed(2)} ${(-w * 0.4).toFixed(2)} ${(-h).toFixed(2)} 0 ${(-h * 0.5).toFixed(2)} c ${(w * 0.4).toFixed(2)} ${(-h * 0.5).toFixed(2)} ${w.toFixed(2)} ${(-h * 0.4).toFixed(2)} 0 ${(h * 0.5).toFixed(2)} Z`;
      elements.push(
        <Path
          key={`clover-leaf-${c}-${l}`}
          d={d}
          fill={palette.leaf}
          fillOpacity={0.85}
          stroke={palette.stem}
          strokeWidth={0.3}
          strokeOpacity={0.5}
        />
      );
    }
  }
  return <G>{elements}</G>;
}

/* ----------------------------- Sprigs ----------------------------- */
function Sprigs({ palette, seed, density, cx, baseY }: VariantProps) {
  const rng = createRng(seed ^ 0x59412);
  const sprigCount = Math.max(2, Math.round(2 * density));
  const elements: React.ReactElement[] = [];

  for (let s = 0; s < sprigCount; s++) {
    const ox = (s - (sprigCount - 1) / 2) * 14 + rngRange(rng, -2, 2);
    const baseX = cx + ox;
    const tipY = baseY - (10 + rngRange(rng, -1, 3));
    const lean = rngRange(rng, -3, 3);
    const tipX = baseX + lean;
    const forkY = (baseY + tipY) / 2;
    const forkX = baseX + lean * 0.5;
    const forkLeftX = forkX - 3.5;
    const forkRightX = forkX + 3.5;
    const forkTipY = forkY - 4;
    elements.push(
      <Path
        key={`sprig-stem-${s}`}
        d={`M ${baseX.toFixed(2)} ${baseY.toFixed(2)} Q ${forkX.toFixed(2)} ${forkY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.9}
        strokeOpacity={0.85}
        strokeLinecap="round"
        fill="none"
      />
    );
    elements.push(
      <Path
        key={`sprig-fork-l-${s}`}
        d={`M ${forkX.toFixed(2)} ${forkY.toFixed(2)} Q ${(forkX - 2).toFixed(2)} ${(forkY - 2).toFixed(2)} ${forkLeftX.toFixed(2)} ${forkTipY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.7}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />
    );
    elements.push(
      <Path
        key={`sprig-fork-r-${s}`}
        d={`M ${forkX.toFixed(2)} ${forkY.toFixed(2)} Q ${(forkX + 2).toFixed(2)} ${(forkY - 2).toFixed(2)} ${forkRightX.toFixed(2)} ${forkTipY.toFixed(2)}`}
        stroke={palette.stem}
        strokeWidth={0.7}
        strokeOpacity={0.8}
        strokeLinecap="round"
        fill="none"
      />
    );

    const leafCount = Math.max(4, Math.round(5 * density));
    for (let l = 0; l < leafCount; l++) {
      const branch = l % 3;
      const t = 0.3 + (Math.floor(l / 3) + 1) * 0.18;
      const side = l % 2 === 0 ? -1 : 1;
      const bx =
        branch === 0
          ? baseX + (tipX - baseX) * t
          : branch === 1
            ? forkX + (forkLeftX - forkX) * t
            : forkX + (forkRightX - forkX) * t;
      const by =
        branch === 0
          ? baseY + (tipY - baseY) * t
          : forkY + (forkTipY - forkY) * t;
      const lx = bx + side * 2;
      const ly = by;
      const leafD = `M ${bx.toFixed(2)} ${by.toFixed(2)} Q ${((bx + lx) / 2).toFixed(2)} ${(ly - 1.6).toFixed(2)} ${lx.toFixed(2)} ${ly.toFixed(2)} Q ${((bx + lx) / 2).toFixed(2)} ${(ly + 1.2).toFixed(2)} ${bx.toFixed(2)} ${by.toFixed(2)} Z`;
      elements.push(
        <Path
          key={`sprig-leaf-${s}-${l}`}
          d={leafD}
          fill={palette.leaf}
          fillOpacity={0.82}
        />
      );
    }
  }
  return <G>{elements}</G>;
}
