/**
 * Shared style tokens for the explore-mode DOM chrome, mirroring the 2D BloomMeadow design
 * language: dark frosted glass for floating controls, warm cream paper for content cards,
 * Cormorant italic titles + uppercase Nunito micro-labels.
 */

export const serif = "var(--font-display), Georgia, 'Times New Roman', serif";
export const sans = "var(--font-body), 'Segoe UI', sans-serif";

export const glass: React.CSSProperties = {
  background: 'rgba(22,27,36,.38)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  border: '1px solid rgba(247,241,227,.16)',
  color: '#f7f1e3',
};

/** Denser glass for panels that hold content rather than a single control. */
export const glassPanel: React.CSSProperties = {
  ...glass,
  background: 'rgba(22,27,36,.55)',
  backdropFilter: 'blur(11px)',
  WebkitBackdropFilter: 'blur(11px)',
  borderRadius: 20,
};

export const microLabel: React.CSSProperties = {
  fontFamily: sans,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
};

export const creamPill: React.CSSProperties = {
  ...microLabel,
  border: '1px solid #d8c9a4',
  background: '#f0e6cd',
  color: '#5c5236',
  borderRadius: 999,
  padding: '8px 16px',
  cursor: 'pointer',
};

export const creamCard: React.CSSProperties = {
  background: '#fbf6ec',
  border: '1px solid #e6d9bf',
  borderRadius: 20,
  boxShadow: '0 24px 70px rgba(15,22,20,.4)',
};

export const HUD_KEYFRAMES = [
  `@keyframes bjx-card{from{opacity:0;transform:translateY(18px) scale(.975)}to{opacity:1;transform:none}}`,
  // For elements centred with translateX(-50%) — keeps the X offset through the animation.
  `@keyframes bjx-card-centered{from{opacity:0;transform:translate(-50%,18px) scale(.975)}to{opacity:1;transform:translate(-50%,0)}}`,
].join('\n');

export const cardEnter = (reduced: boolean): string | undefined =>
  reduced ? undefined : 'bjx-card .45s cubic-bezier(.2,.8,.3,1) both';

export const cardEnterCentered = (reduced: boolean): string | undefined =>
  reduced ? undefined : 'bjx-card-centered .45s cubic-bezier(.2,.8,.3,1) both';
