'use client';

import { useRef, useState, type RefObject } from 'react';

import type { MoveInput } from '@/lib/garden/explore/movement';

/** Drag distance (px) for a full-speed input. */
const RADIUS = 40;

/**
 * Touch walking control: wherever the finger lands on the pad becomes the stick's neutral
 * point, and dragging away from it writes a clamped {forward, strafe} vector straight into
 * `inputRef` (no re-renders on move — PlayerRig reads the ref each frame). Own pointer
 * handling with stopPropagation so the canvas look-drag never sees these touches.
 */
export function VirtualJoystick({ inputRef }: { inputRef: RefObject<MoveInput> }) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [thumb, setThumb] = useState<{ x: number; y: number } | null>(null);

  const reset = () => {
    origin.current = null;
    inputRef.current = { forward: 0, strafe: 0 };
    setThumb(null);
  };

  return (
    <div
      data-joystick
      onPointerDown={(e) => {
        e.stopPropagation();
        origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        inputRef.current = { forward: 0, strafe: 0 };
        setThumb({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (!o || o.id !== e.pointerId) return;
        e.stopPropagation();
        let x = (e.clientX - o.x) / RADIUS;
        let y = (e.clientY - o.y) / RADIUS;
        const len = Math.hypot(x, y);
        if (len > 1) {
          x /= len;
          y /= len;
        }
        inputRef.current = { forward: -y, strafe: x };
        setThumb({ x: x * RADIUS * 0.6, y: y * RADIUS * 0.6 });
      }}
      onPointerUp={(e) => {
        if (origin.current?.id === e.pointerId) {
          e.stopPropagation();
          reset();
        }
      }}
      onPointerCancel={(e) => {
        if (origin.current?.id === e.pointerId) reset();
      }}
      style={{
        position: 'absolute',
        left: 18,
        bottom: 'calc(var(--safe-bottom, env(safe-area-inset-bottom, 0px)) + 24px)',
        zIndex: 35,
        width: 116,
        height: 116,
        borderRadius: 999,
        background: 'rgba(22,27,36,.30)',
        border: '1px solid rgba(247,241,227,.16)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        touchAction: 'none',
        pointerEvents: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {[
        { top: 7, left: '50%', marginLeft: -2 },
        { top: '50%', right: 7, marginTop: -2 },
        { bottom: 7, left: '50%', marginLeft: -2 },
        { top: '50%', left: 7, marginTop: -2 },
      ].map((pos, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 999,
            background: 'rgba(247,241,227,.35)',
            ...pos,
          }}
        />
      ))}
      <div
        style={{
          width: 46,
          height: 46,
          borderRadius: 999,
          background: '#f0e6cd',
          border: '1px solid #d8c9a4',
          boxShadow: '0 2px 10px rgba(15,22,20,.35)',
          transform: thumb ? `translate(${thumb.x}px, ${thumb.y}px)` : undefined,
          transition: thumb ? 'none' : 'transform .18s ease',
        }}
      />
    </div>
  );
}
