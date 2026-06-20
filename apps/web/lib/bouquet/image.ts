import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Flower } from '@/components/flower/Flower';
import { renderBouquetGreenery } from '@/components/bouquet/BouquetGreenery';
import type { BouquetFlower, BouquetGreenery as BouquetGreeneryKind, BouquetPayload } from '@bloom/core';

import { bouquetFilename } from './filename';
import { FLOWER_SIZE_RATIO, flowerAngles, greeneryOffsets, tiePoint } from './layout';

/** Warm card palette for the standalone image (no Tailwind available in a serialized SVG). */
const COLOR = {
  bgTop: '#FCF7EC',
  bgBottom: '#F1E7D3',
  paper: '#E6D8BC',
  paperFold: '#D8C7A4',
  ribbon: '#EBA6AE',
  ribbonDark: '#D98C97',
  caption: '#6B6356',
  note: '#4F4940',
} as const;

/** How far the ribbon tails fall below the tie, as a fraction of `size`. */
const TAIL_DROP = 0.11;

/** Up to this many lines of the note print on the card; the rest is trimmed with an ellipsis. */
const MAX_NOTE_LINES = 3;

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Greedy word-wrap for the note caption: fits as many words as possible into at most `maxLines`
 * lines of `maxCharsPerLine` characters. If the text overflows, the last line ends with an ellipsis
 * so the recipient sees the start of the message — "as much as fits".
 */
export function wrapText(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (lines.length >= maxLines) break;
    const piece = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
    const candidate = current ? `${current} ${piece}` : piece;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      lines.push(current);
      current = piece;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);

  const shownWords = lines.join(' ').replace(/…/g, '').split(/\s+/).filter(Boolean).length;
  if (shownWords < words.length && lines.length > 0) {
    let last = lines[lines.length - 1]!;
    if (!last.endsWith('…')) {
      if (last.length + 1 > maxCharsPerLine) last = last.slice(0, maxCharsPerLine - 1).trimEnd();
      lines[lines.length - 1] = `${last}…`;
    }
  }
  return lines.slice(0, maxLines);
}

function ribbonTail(tx: number, ty: number, size: number, dir: 1 | -1): string {
  const drop = size * TAIL_DROP;
  const halfW = size * 0.028;
  const endCX = tx + dir * size * 0.085;
  const bot = ty + drop;
  const notchY = bot - size * 0.024;
  const ctrlDx = dir * size * 0.006;
  return [
    `M ${(tx - halfW).toFixed(1)} ${ty.toFixed(1)}`,
    `C ${(tx - halfW + ctrlDx).toFixed(1)} ${(ty + drop * 0.45).toFixed(1)}, ${(endCX - halfW).toFixed(1)} ${(bot - drop * 0.45).toFixed(1)}, ${(endCX - halfW).toFixed(1)} ${bot.toFixed(1)}`,
    `L ${endCX.toFixed(1)} ${notchY.toFixed(1)}`,
    `L ${(endCX + halfW).toFixed(1)} ${bot.toFixed(1)}`,
    `C ${(endCX + halfW).toFixed(1)} ${(bot - drop * 0.45).toFixed(1)}, ${(tx + halfW + ctrlDx).toFixed(1)} ${(ty + drop * 0.45).toFixed(1)}, ${(tx + halfW).toFixed(1)} ${ty.toFixed(1)}`,
    'Z',
  ].join(' ');
}

type SvgOpts = {
  size?: number;
  to?: string | null;
  from?: string | null;
  note?: string | null;
  greenery?: BouquetGreeneryKind[] | null;
};

/**
 * Build a fully self-contained SVG of a tied bouquet: warm background, paper wrap, the flowers
 * (rendered straight from their genomes via {@link Flower}, so the image matches the live preview),
 * a ribbon, and an optional footer that reads like a gift card — "To …", as much of the note as
 * fits, then "— from …". No external CSS — safe to rasterise to PNG or save as-is.
 */
export function bouquetSvgMarkup(flowers: BouquetFlower[], opts: SvgOpts = {}): string {
  const size = opts.size ?? 600;
  const to = opts.to?.trim() || null;
  const from = opts.from?.trim() || null;
  const note = opts.note?.trim() || null;
  const accents = opts.greenery?.length ? opts.greenery.slice(0, 3) : [];
  const tie = tiePoint(size);
  const flowerSize = size * FLOWER_SIZE_RATIO;
  const W = size;

  // Footer rows beneath the bouquet, top→bottom: recipient greeting, the word-wrapped note, then
  // the sender. Roughly two characters fit per `noteFont`'s width — hence `/ (noteFont * 0.5)`.
  const toFont = size * 0.052;
  const noteFont = size * 0.045;
  const fromFont = size * 0.044;
  const maxChars = Math.max(10, Math.floor((W * 0.84) / (noteFont * 0.5)));
  const noteLines = note ? wrapText(note, maxChars, MAX_NOTE_LINES) : [];

  const rows: Array<{ text: string; font: number; color: string }> = [];
  if (to) rows.push({ text: `To ${to},`, font: toFont, color: COLOR.note });
  for (const line of noteLines) rows.push({ text: line, font: noteFont, color: COLOR.note });
  if (from) rows.push({ text: `— from ${from}`, font: fromFont, color: COLOR.caption });

  const hasFooter = rows.length > 0;
  const LINE_LEADING = 1.5;
  const bouquetBottom = tie.y + size * TAIL_DROP + size * 0.03;
  const topPad = size * 0.06;
  const footerH = hasFooter
    ? topPad + rows.reduce((acc, r) => acc + r.font * LINE_LEADING, 0) + size * 0.03
    : 0;
  const H = Math.round(bouquetBottom + footerH);

  const angles = flowerAngles(flowers.length);
  const boxLeft = tie.x - flowerSize / 2;
  const boxTop = tie.y - flowerSize;

  const flowerGroups = flowers
    .map((flower, i) => {
      const { genome } = flower;
      const inner = renderToStaticMarkup(
        createElement(Flower, {
          mood: genome.bloomMood,
          seed: genome.seed,
          size: flowerSize,
          wordCount: genome.wordCount,
          foliageVariant: genome.foliageVariant,
          pumpkinStage: genome.specialBloom === 'pumpkin' ? genome.pumpkinStage : undefined,
        }),
      ).replace('<svg ', '<svg overflow="visible" ');
      const angle = (angles[i] ?? 0).toFixed(2);
      // NB: the SVG is rasterised by loading it as an image, which parses it as strict XML — every
      // attribute needs a value (a bare `data-flower` is well-formed HTML but breaks XML parsing).
      return `<g data-flower="1" transform="rotate(${angle} ${tie.x} ${tie.y}) translate(${boxLeft.toFixed(2)} ${boxTop.toFixed(2)})">${inner}</g>`;
    })
    .join('');

  // Greenery accents framing the tie, behind the stems. Each renders into a flower-sized box whose
  // bottom sits on the tie point and whose centre is nudged left/right per `greeneryOffsets` — the
  // same anchor and offsets the live preview uses, so the two never drift. The nested <svg> shares
  // the accent's `0 0 100 140` viewBox so `renderBouquetGreenery` draws at its natural scale.
  const offsets = greeneryOffsets(accents.length);
  const greeneryGroups = accents
    .map((kind, i) => {
      const inner = renderToStaticMarkup(
        renderBouquetGreenery({ kind, seed: 1000 + i * 31 + kind.length }),
      );
      const cx = tie.x + (offsets[i] ?? 0) * size - flowerSize / 2;
      const cy = tie.y - flowerSize;
      return (
        `<svg data-greenery="1" x="${cx.toFixed(2)}" y="${cy.toFixed(2)}" ` +
        `width="${flowerSize.toFixed(2)}" height="${flowerSize.toFixed(2)}" ` +
        `viewBox="0 0 100 140" preserveAspectRatio="xMidYMax meet" overflow="visible">${inner}</svg>`
      );
    })
    .join('');

  // Paper wrap cone behind the stems.
  const coneTopY = tie.y - size * 0.26;
  const coneHalf = size * 0.16;
  const apexX = tie.x;
  const apexY = tie.y - size * 0.01;
  const cone =
    `<path d="M ${apexX} ${apexY.toFixed(1)} L ${(tie.x - coneHalf).toFixed(1)} ${coneTopY.toFixed(1)} ` +
    `Q ${tie.x} ${(coneTopY - size * 0.03).toFixed(1)} ${(tie.x + coneHalf).toFixed(1)} ${coneTopY.toFixed(1)} Z" ` +
    `fill="${COLOR.paper}" />` +
    `<path d="M ${apexX} ${apexY.toFixed(1)} L ${apexX} ${coneTopY.toFixed(1)}" stroke="${COLOR.paperFold}" stroke-width="${(size * 0.006).toFixed(1)}" stroke-linecap="round" />`;

  const tails =
    `<path d="${ribbonTail(tie.x, tie.y, size, -1)}" fill="${COLOR.ribbonDark}" />` +
    `<path d="${ribbonTail(tie.x, tie.y, size, 1)}" fill="${COLOR.ribbonDark}" />`;
  const knot = `<ellipse cx="${tie.x}" cy="${tie.y.toFixed(1)}" rx="${(size * 0.05).toFixed(1)}" ry="${(size * 0.035).toFixed(1)}" fill="${COLOR.ribbon}" />`;

  let cursor = bouquetBottom + topPad;
  const footer = rows
    .map((r) => {
      const y = cursor + r.font;
      cursor += r.font * LINE_LEADING;
      return (
        `<text x="${W / 2}" y="${y.toFixed(1)}" text-anchor="middle" ` +
        `font-family="Georgia, 'Times New Roman', serif" font-size="${r.font.toFixed(1)}" ` +
        `font-style="italic" fill="${r.color}">${escapeXml(r.text)}</text>`
      );
    })
    .join('');

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><linearGradient id="bloomBg" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="${COLOR.bgTop}" /><stop offset="1" stop-color="${COLOR.bgBottom}" />` +
    `</linearGradient></defs>` +
    `<rect width="${W}" height="${H}" rx="${(size * 0.04).toFixed(1)}" fill="url(#bloomBg)" />` +
    cone +
    greeneryGroups +
    flowerGroups +
    tails +
    knot +
    footer +
    `</svg>`
  );
}

/**
 * Rasterise a bouquet to a PNG and trigger a download. Browser-only (uses an `Image` + `<canvas>`).
 * Renders at `scale`× for a crisp, shareable picture. Mirrors the download mechanics of
 * {@link downloadBouquetFile}.
 */
export async function downloadBouquetPng(
  payload: BouquetPayload,
  opts: { size?: number; scale?: number } = {},
): Promise<void> {
  const size = opts.size ?? 600;
  const scale = opts.scale ?? 2;
  const svg = bouquetSvgMarkup(payload.flowers, {
    size,
    to: payload.to,
    from: payload.from,
    note: payload.note,
    greenery: payload.greenery,
  });

  const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
  const W = match ? Number(match[1]) : size;
  const H = match ? Number(match[2]) : size;

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not render the bouquet image.'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not render the bouquet image.');
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, W, H);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not render the bouquet image.');

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = bouquetFilename(payload, 'png');
  a.click();
  URL.revokeObjectURL(url);
}
