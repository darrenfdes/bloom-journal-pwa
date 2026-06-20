/**
 * Three petal path builders shared by every bloom renderer.
 *
 * All helpers return an SVG path `d` string anchored at (cx, cy), with
 * the petal pointing along `angle` (degrees, 0 = up, clockwise). L is
 * the petal length from base to tip; W is the maximum half-width.
 */

const DEG_TO_RAD = Math.PI / 180;

function rotate(px: number, py: number, sin: number, cos: number): [number, number] {
  return [px * cos - py * sin, px * sin + py * cos];
}

interface Point {
  x: number;
  y: number;
}

function place(cx: number, cy: number, lx: number, ly: number, sin: number, cos: number): Point {
  const [rx, ry] = rotate(lx, ly, sin, cos);
  return { x: cx + rx, y: cy + ry };
}

function fmt(p: Point): string {
  return `${p.x.toFixed(3)} ${p.y.toFixed(3)}`;
}

/**
 * Almond petal built from two cubic beziers. Optional asymmetry skews
 * the left/right control points so petals can lean naturally.
 */
export function petalPath(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number,
  asymmetry = 0
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  const wL = W * (1 + asymmetry);
  const wR = W * (1 - asymmetry);

  const base = place(cx, cy, 0, 0, sin, cos);
  const tip = place(cx, cy, 0, -L, sin, cos);
  const c1R = place(cx, cy, wR * 0.85, -L * 0.25, sin, cos);
  const c2R = place(cx, cy, wR * 0.7, -L * 0.78, sin, cos);
  const c1L = place(cx, cy, -wL * 0.7, -L * 0.78, sin, cos);
  const c2L = place(cx, cy, -wL * 0.85, -L * 0.25, sin, cos);

  return `M ${fmt(base)} C ${fmt(c1R)} ${fmt(c2R)} ${fmt(tip)} C ${fmt(c1L)} ${fmt(c2L)} ${fmt(base)} Z`;
}

/**
 * Wide rounded petal with a notch at the tip (cut inward via a quadratic
 * bezier). Produces the classic heart-shaped daisy/love petal silhouette.
 */
export function heartPetal(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  const notchDepth = L * 0.12;

  const base = place(cx, cy, 0, 0, sin, cos);
  const rShoulder = place(cx, cy, W * 1.05, -L * 0.55, sin, cos);
  const rLobe = place(cx, cy, W * 0.62, -L * 0.98, sin, cos);
  const rNotchCtrl = place(cx, cy, W * 0.18, -L * 0.92, sin, cos);
  const notch = place(cx, cy, 0, -L + notchDepth, sin, cos);
  const lNotchCtrl = place(cx, cy, -W * 0.18, -L * 0.92, sin, cos);
  const lLobe = place(cx, cy, -W * 0.62, -L * 0.98, sin, cos);
  const lShoulder = place(cx, cy, -W * 1.05, -L * 0.55, sin, cos);

  return [
    `M ${fmt(base)}`,
    `C ${fmt(rShoulder)} ${fmt(rLobe)} ${fmt(rLobe)}`,
    `Q ${fmt(rNotchCtrl)} ${fmt(notch)}`,
    `Q ${fmt(lNotchCtrl)} ${fmt(lLobe)}`,
    `C ${fmt(lShoulder)} ${fmt(base)} ${fmt(base)}`,
    'Z',
  ].join(' ');
}

/**
 * Full-bodied petal with a rounded tip — wider shoulders than the almond
 * petal, for daisy ray petals and rose whorls.
 */
export function roundedPetal(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number,
  asymmetry = 0
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  const wL = W * (1 + asymmetry);
  const wR = W * (1 - asymmetry);

  const base = place(cx, cy, 0, 0, sin, cos);
  const rShoulder = place(cx, cy, wR, -L * 0.42, sin, cos);
  const rTip = place(cx, cy, wR * 0.55, -L * 0.94, sin, cos);
  const tip = place(cx, cy, 0, -L, sin, cos);
  const lTip = place(cx, cy, -wL * 0.55, -L * 0.94, sin, cos);
  const lShoulder = place(cx, cy, -wL, -L * 0.42, sin, cos);

  return [
    `M ${fmt(base)}`,
    `C ${fmt(rShoulder)} ${fmt(rTip)} ${fmt(tip)}`,
    `C ${fmt(lTip)} ${fmt(lShoulder)} ${fmt(base)}`,
    'Z',
  ].join(' ');
}

/**
 * Broad fan petal with a gently waved outer edge — the rose silhouette.
 * `ruffle` (0..1) deepens the edge wave.
 */
export function rosePetal(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number,
  ruffle = 0.5
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const dip = L * 0.06 * ruffle;

  const base = place(cx, cy, 0, 0, sin, cos);
  const rEdge = place(cx, cy, W, -L * 0.5, sin, cos);
  const rLobe = place(cx, cy, W * 0.66, -L * (0.96 - 0.04 * ruffle), sin, cos);
  const midDip = place(cx, cy, 0, -L + dip, sin, cos);
  const lLobe = place(cx, cy, -W * 0.66, -L * (0.96 - 0.04 * ruffle), sin, cos);
  const lEdge = place(cx, cy, -W, -L * 0.5, sin, cos);
  const rCtrl = place(cx, cy, W * 0.95, -L * 0.16, sin, cos);
  const lCtrl = place(cx, cy, -W * 0.95, -L * 0.16, sin, cos);
  const rLobeCtrl = place(cx, cy, W * 0.34, -L * 1.02, sin, cos);
  const lLobeCtrl = place(cx, cy, -W * 0.34, -L * 1.02, sin, cos);

  return [
    `M ${fmt(base)}`,
    `C ${fmt(rCtrl)} ${fmt(rEdge)} ${fmt(rEdge)}`,
    `C ${fmt(rEdge)} ${fmt(rLobe)} ${fmt(rLobe)}`,
    `Q ${fmt(rLobeCtrl)} ${fmt(midDip)}`,
    `Q ${fmt(lLobeCtrl)} ${fmt(lLobe)}`,
    `C ${fmt(lLobe)} ${fmt(lEdge)} ${fmt(lEdge)}`,
    `C ${fmt(lCtrl)} ${fmt(base)} ${fmt(base)}`,
    'Z',
  ].join(' ');
}

/**
 * Narrow pointed quill with an optional sideways twist — the dahlia petal.
 * Positive twist skews the tip clockwise off the petal axis.
 */
export function quillPetal(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number,
  twist = 0
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);
  const tx = twist * W;

  const base = place(cx, cy, 0, 0, sin, cos);
  const tip = place(cx, cy, tx, -L, sin, cos);
  const c1R = place(cx, cy, W * 0.7, -L * 0.22, sin, cos);
  const c2R = place(cx, cy, W * 0.3 + tx * 0.7, -L * 0.82, sin, cos);
  const c1L = place(cx, cy, -W * 0.3 + tx * 0.7, -L * 0.82, sin, cos);
  const c2L = place(cx, cy, -W * 0.7, -L * 0.22, sin, cos);

  return `M ${fmt(base)} C ${fmt(c1R)} ${fmt(c2R)} ${fmt(tip)} C ${fmt(c1L)} ${fmt(c2L)} ${fmt(base)} Z`;
}

/**
 * Thin highlight crescent hugging the outer edge of a petal tip — reads
 * as rim light without needing a per-petal gradient.
 */
export function rimHighlight(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  const lTip = place(cx, cy, -W * 0.42, -L * 0.82, sin, cos);
  const rTip = place(cx, cy, W * 0.42, -L * 0.82, sin, cos);
  const outerCtrl = place(cx, cy, 0, -L * 1.0, sin, cos);
  const innerCtrl = place(cx, cy, 0, -L * 0.88, sin, cos);

  return [
    `M ${fmt(lTip)}`,
    `Q ${fmt(outerCtrl)} ${fmt(rTip)}`,
    `Q ${fmt(innerCtrl)} ${fmt(lTip)}`,
    'Z',
  ].join(' ');
}

/**
 * Thin crescent at a petal tip — drawn slightly inside the petal so the
 * darker underside reads as a curled-back edge.
 */
export function cupCurl(
  cx: number,
  cy: number,
  angle: number,
  L: number,
  W: number
): string {
  const a = angle * DEG_TO_RAD;
  const sin = Math.sin(a);
  const cos = Math.cos(a);

  const outerL = -L * 0.95;
  const innerL = -L * 0.6;

  const lTip = place(cx, cy, -W * 0.55, outerL, sin, cos);
  const rTip = place(cx, cy, W * 0.55, outerL, sin, cos);
  const outerCtrl = place(cx, cy, 0, outerL - L * 0.12, sin, cos);
  const innerCtrl = place(cx, cy, 0, innerL, sin, cos);

  return [
    `M ${fmt(lTip)}`,
    `Q ${fmt(outerCtrl)} ${fmt(rTip)}`,
    `Q ${fmt(innerCtrl)} ${fmt(lTip)}`,
    'Z',
  ].join(' ');
}
