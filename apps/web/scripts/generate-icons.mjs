// One-shot icon generator for Bloom Journal.
// Renders the "pumpkin as a flower" (squash blossom) into the full PWA icon set.
//
// Master art is a hand-composed 512×512 SVG that faithfully ports the in-app
// `PumpkinFlower` geometry (apps/web/components/flower/blooms/Pumpkin.tsx,
// stage 0) — minus the random jitter and the soft ground shadow — using the
// shared `petalPath` math from petalPathHelpers.ts. Palette comes from
// PUMPKIN_PALETTE (packages/core/.../moodPalettes.ts); background is
// --sage (#8FA88A) from globals.css.
//
// Two background treatments:
//   • Circular sage disc on transparent → icon.svg, "any" PNGs, favicon
//     (reads as a circle in browser tabs; transparent corners blend with chrome)
//   • Full-bleed sage square            → maskable PNGs + apple-icon
//     (maskable needs full bleed; iOS applies its own squircle over apple-icon)
//
// Run:  npm run icons
//
// Outputs:
//   public/icon.svg                  (master art — circular, transparent corners)
//   public/icon-192.png              (purpose any — circular)
//   public/icon-512.png              (purpose any — circular)
//   public/icon-maskable-192.png     (purpose maskable — full-bleed square)
//   public/icon-maskable-512.png     (purpose maskable — full-bleed square)
//   public/icon-preview.png          (256px preview for visual QA — gitignored)
//   app/apple-icon.png               (180×180 — full-bleed square)
//   app/favicon.ico                  (16/32/48 multi-frame — circular)

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import sharp from 'sharp';
import pngToIco from 'png-to-ico';

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, '..');
const pubDir = resolve(webRoot, 'public');
const appDir = resolve(webRoot, 'app');

// --- palette (PUMPKIN_PALETTE + globals.css) -----------------------------
const C = {
  sage: '#8FA88A', // --sage in globals.css; manifest theme_color
  petalHi: '#FFE066',
  petalMid: '#F4A300',
  petalDark: '#C2780C',
  fruitDeep: '#7E330A',
  leaf: '#6E9A56',
  tendril: '#9CC07A',
};

// --- petalPath, ported from petalPathHelpers.ts --------------------------
// Almond petal: two cubic beziers, tip along `angle` (0 = up, clockwise).
function petalPath(cx, cy, angle, L, W, asym = 0) {
  const a = (angle * Math.PI) / 180;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const wL = W * (1 + asym);
  const wR = W * (1 - asym);
  const place = (lx, ly) => [cx + lx * cos - ly * sin, cy + lx * sin + ly * cos];
  const f = (p) => p.map((n) => n.toFixed(2)).join(' ');
  const base = place(0, 0);
  const tip = place(0, -L);
  const c1R = place(wR * 0.85, -L * 0.25);
  const c2R = place(wR * 0.7, -L * 0.78);
  const c1L = place(-wL * 0.7, -L * 0.78);
  const c2L = place(-wL * 0.85, -L * 0.25);
  return `M ${f(base)} C ${f(c1R)} ${f(c2R)} ${f(tip)} C ${f(c1L)} ${f(c2L)} ${f(base)} Z`;
}

// --- icon parameters -----------------------------------------------------
const SIZE = 512;
const CX = 256;
const CY = 256;
const S = 7.5; // source (100-unit) → icon scale; blossom spans ~360px (≈70%)
const PETALS = 5;

const backLen = 24 * S;
const backW = 12 * S;
const frontLen = 21 * S;
const frontW = 10.5 * S;
const throatR = 6.2 * S;
const innerDotR = 2.4 * S;
const sepalBaseR = 9 * S;
const sepalTipR = 14 * S;

// --- build SVG pieces ----------------------------------------------------
const backRing = Array.from({ length: PETALS }, (_, i) => {
  const angle = (360 / PETALS) * i + 36;
  return `<path d="${petalPath(CX, CY, angle, backLen, backW, 0.06)}" fill="url(#petalGrad)" fill-opacity="0.92" stroke="${C.petalDark}" stroke-width="${(0.5 * S).toFixed(2)}" stroke-opacity="0.55" stroke-linejoin="round"/>`;
}).join('');

const frontRing = Array.from({ length: PETALS }, (_, i) => {
  const angle = (360 / PETALS) * i;
  const a = (angle * Math.PI) / 180;
  const d = petalPath(CX, CY, angle, frontLen, frontW, 0);
  const pleats = [-0.3, 0, 0.3]
    .map((spread, vi) => {
      const va = a + spread * 0.36;
      const frac = vi === 1 ? 0.84 : 0.6;
      const x1 = CX + Math.sin(va) * 4 * S;
      const y1 = CY - Math.cos(va) * 4 * S;
      const x2 = CX + Math.sin(va) * frontLen * frac;
      const y2 = CY - Math.cos(va) * frontLen * frac;
      return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${C.petalDark}" stroke-width="${((vi === 1 ? 0.5 : 0.35) * S).toFixed(2)}" stroke-opacity="0.4" stroke-linecap="round"/>`;
    })
    .join('');
  return `<g><path d="${d}" fill="url(#petalGrad)" stroke="${C.petalDark}" stroke-width="${(0.55 * S).toFixed(2)}" stroke-opacity="0.6" stroke-linejoin="round"/>${pleats}</g>`;
}).join('');

const throat = `<circle cx="${CX}" cy="${CY}" r="${throatR.toFixed(2)}" fill="url(#throatGrad)"/>
<circle cx="${CX}" cy="${CY}" r="${innerDotR.toFixed(2)}" fill="${C.fruitDeep}" fill-opacity="0.7"/>
<ellipse cx="${(CX - 1.6 * S).toFixed(2)}" cy="${(CY - 1.8 * S).toFixed(2)}" rx="${(1.6 * S).toFixed(2)}" ry="${(0.9 * S).toFixed(2)}" fill="${C.petalHi}" fill-opacity="0.6"/>`;

const sepals = Array.from({ length: PETALS }, (_, i) => {
  const angle = (360 / PETALS) * i + 36;
  const a = (angle * Math.PI) / 180;
  const tipX = CX + Math.sin(a) * sepalTipR;
  const tipY = CY - Math.cos(a) * sepalTipR;
  const baseX = CX + Math.sin(a) * sepalBaseR;
  const baseY = CY - Math.cos(a) * sepalBaseR;
  const midX = (baseX + tipX) / 2;
  const midY = (baseY + tipY) / 2 + 0.6 * S;
  return `<path d="M ${baseX.toFixed(2)} ${baseY.toFixed(2)} Q ${midX.toFixed(2)} ${midY.toFixed(2)} ${tipX.toFixed(2)} ${tipY.toFixed(2)}" stroke="${C.leaf}" stroke-width="${(1.4 * S).toFixed(2)}" stroke-opacity="0.7" fill="none" stroke-linecap="round"/>`;
}).join('');

// Tendril: a compact curly squash vine, hand-tuned to stay inside the
// maskable safe circle (radius 205 from center). Lower-right of the blossom.
const tendril = `<path d="M 360 368 C 376 352 396 356 392 376 C 389 390 372 388 374 376 C 376 368 386 370 385 378" stroke="${C.tendril}" stroke-width="${(1 * S).toFixed(2)}" fill="none" stroke-linecap="round"/>`;

const svgOpen = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SIZE} ${SIZE}" role="img" aria-label="Bloom Journal — pumpkin flower icon">`;
const svgDefs = `  <defs>
    <linearGradient id="petalGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${C.petalHi}"/>
      <stop offset="55%" stop-color="${C.petalMid}"/>
      <stop offset="100%" stop-color="${C.petalDark}"/>
    </linearGradient>
    <radialGradient id="throatGrad" cx="50%" cy="55%" r="60%">
      <stop offset="0%" stop-color="${C.petalDark}"/>
      <stop offset="100%" stop-color="${C.fruitDeep}"/>
    </radialGradient>
  </defs>`;
const svgBody = `  <g>${backRing}</g>
  <g>${frontRing}</g>
  ${throat}
  <g>${sepals}</g>
  ${tendril}`;

// Background variants.
//
// `svgCircle` — sage disc on a transparent canvas. Used for unmasked surfaces
//   (master icon.svg, the "any" PNGs, the favicon) so the icon reads as a
//   circle in a browser tab while transparent corners blend into any chrome.
//
// `svgSquare` — full-bleed sage square. Required for maskable (Android may
//   crop to any shape; transparent corners would leak the OS wallpaper) and
//   apple-icon (iOS applies its own squircle mask, so a circle would double-
//   mask into a shrunken flower).
const bgCircle = `  <circle cx="${CX}" cy="${CY}" r="${SIZE / 2}" fill="${C.sage}"/>`;
const bgSquare = `  <rect width="${SIZE}" height="${SIZE}" fill="${C.sage}"/>`;

const svgCircle = `${svgOpen}
${svgDefs}
${bgCircle}
${svgBody}
</svg>`;

const svgSquare = `${svgOpen}
${svgDefs}
${bgSquare}
${svgBody}
</svg>`;

// --- write master SVG (circular, transparent corners) -------------------
await mkdir(pubDir, { recursive: true });
await mkdir(appDir, { recursive: true });
const svgPath = resolve(pubDir, 'icon.svg');
await writeFile(svgPath, svgCircle, 'utf8');
console.log('✓ wrote', relativeToWeb(svgPath), '(circular, transparent corners)');

// --- rasterize ----------------------------------------------------------
// Sharp renders the SVG via librsvg at `density` then resizes. density 384
// keeps gradients/strokes crisp down to 16px.
const circleBuf = Buffer.from(svgCircle, 'utf8');
const squareBuf = Buffer.from(svgSquare, 'utf8');

async function png(buf, size, dir, name) {
  const out = resolve(dir, name);
  await sharp(buf, { density: 384 }).resize(size, size, { fit: 'contain' }).png().toFile(out);
  console.log('✓ wrote', relativeToWeb(out), `(${size}×${size})`);
  return out;
}

// Unmasked: circular disc on transparent.
await png(circleBuf, 192, pubDir, 'icon-192.png');
await png(circleBuf, 512, pubDir, 'icon-512.png');
// Maskable + Apple: full-bleed sage square.
await png(squareBuf, 192, pubDir, 'icon-maskable-192.png');
await png(squareBuf, 512, pubDir, 'icon-maskable-512.png');
await png(squareBuf, 180, appDir, 'apple-icon.png');
const previewPath = await png(circleBuf, 256, pubDir, 'icon-preview.png');

// --- favicon.ico (16/32/48 multi-frame, circular + transparent) ---------
const sizes = [16, 32, 48];
const icoPngs = await Promise.all(
  sizes.map((s) => sharp(circleBuf, { density: 384 }).resize(s, s, { fit: 'contain' }).png().toBuffer()),
);
const icoBuf = await pngToIco(icoPngs);
const icoPath = resolve(appDir, 'favicon.ico');
await writeFile(icoPath, icoBuf);
console.log('✓ wrote', relativeToWeb(icoPath), `(${sizes.join('/')} frames, circular)`);

console.log('\nPreview:', relativeToWeb(previewPath));

function relativeToWeb(p) {
  return p.replace(webRoot + '/', '');
}
