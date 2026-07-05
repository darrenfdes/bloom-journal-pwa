'use client';

/**
 * DOM chrome over the 3D canvas: back-to-garden button, a fading control hint, and the
 * texture-loading overlay. Pure DOM — safe to unit-test in jsdom.
 */

const glass: React.CSSProperties = {
  background: 'rgba(20,30,40,.32)',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  border: '1px solid rgba(250,246,233,.28)',
  color: '#faf6e9',
  borderRadius: 999,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.3,
  padding: '9px 16px',
  pointerEvents: 'auto',
  cursor: 'pointer',
};

export function ExploreHud({
  onBack,
  hint,
  progress,
}: {
  onBack: () => void;
  /** Control hint shown at the bottom; null hides it. */
  hint: string | null;
  /** Texture build progress 0..1; null or ≥1 hides the overlay. */
  progress: number | null;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
        fontFamily: 'var(--font-sans, ui-sans-serif, system-ui)',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to garden"
        style={{
          ...glass,
          position: 'absolute',
          top: 'calc(var(--safe-top, env(safe-area-inset-top, 0px)) + 14px)',
          left: 16,
        }}
      >
        ← Garden
      </button>

      {hint && (
        <div
          style={{
            ...glass,
            cursor: 'default',
            pointerEvents: 'none',
            position: 'absolute',
            bottom: 'calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 22px)',
            left: '50%',
            transform: 'translateX(-50%)',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            opacity: 0.92,
          }}
        >
          {hint}
        </div>
      )}

      {progress !== null && progress < 1 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(12,18,26,.35)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ ...glass, cursor: 'default', fontWeight: 500 }}>
            Growing your meadow… {Math.round(progress * 100)}%
          </div>
        </div>
      )}
    </div>
  );
}
