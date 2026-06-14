'use client';

/**
 * Shared shooting-star visual, used by both the ambient/special stars (BloomMeadow) and the
 * world-event meteor shower (EventEffectsLayer) so the two read identically. The look follows
 * delroyprithvi's pure-CSS "Shooting Star" effect — a pill-shaped streak whose tail draws out
 * behind a glowing head and then retracts to a point, plus a twinkling head sparkle — kept in
 * the meadow's warm-cream palette.
 *
 * Three animations run on nested elements so each only drives its own `transform`:
 *   • mover  — translateX along the local (rotated) axis: the travel.
 *   • tail   — scaleX 0→1→0 from the head outward: draws out then retracts.
 *   • shine  — head sparkle scale/opacity pulse.
 *
 * Callers include `SHOOTING_STAR_KEYFRAMES` in their own <style> (keeps each layer self-contained).
 */

import React from 'react';

/**
 * One fixed travel angle (deg) shared by every shooting star / meteor so a shower reads as a
 * single parallel direction rather than a scatter of angles.
 */
export const SHOOTING_STAR_ANGLE = 40;

/** Geometry for one streak (BloomMeadow `Streak` is a structural superset). */
export type StarGeom = {
  x: number; // % left of the sky
  y: number; // % top of the sky
  ang: number; // travel angle (deg)
  len: number; // streak length (px) when fully drawn
  dur: number; // lifetime (s)
  delay: number; // start delay (s)
  dist?: number; // travel distance (px); defaults to len * 3.5
};

export const SHOOTING_STAR_KEYFRAMES = `
  @keyframes ss-shoot{0%{transform:translateX(0);opacity:0}6%{opacity:1}80%{opacity:1}100%{transform:translateX(var(--ss-d,560px));opacity:0}}
  @keyframes ss-tail{0%{transform:scaleX(0)}18%{transform:scaleX(1)}68%{transform:scaleX(1)}100%{transform:scaleX(0)}}
  @keyframes ss-shine{0%,100%{opacity:0;transform:translate(-50%,-50%) scale(.3)}50%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
`;

const sparkleBar: React.CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  borderRadius: 999,
  background: 'linear-gradient(90deg, rgba(255,244,200,0), rgba(255,252,236,.95), rgba(255,244,200,0))',
};

export function ShootingStar({ geom, loop }: { geom: StarGeom; loop: boolean }) {
  const { x, y, ang, len, dur, delay, dist } = geom;
  const timing = loop ? 'linear infinite' : 'cubic-bezier(.25,.55,.45,1) both';

  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, transform: `rotate(${ang}deg)`, pointerEvents: 'none' }}>
      <div
        style={
          {
            position: 'relative',
            width: len,
            height: 2,
            '--ss-d': `${dist ?? len * 3.5}px`,
            animation: `ss-shoot ${dur}s ${delay}s ${timing}`,
          } as React.CSSProperties
        }
      >
        {/* tail: warm-cream pill that draws out from the head and retracts */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 999,
            transformOrigin: '100% 50%',
            background:
              'linear-gradient(90deg, rgba(255,244,214,0) 0%, rgba(255,246,222,.55) 55%, rgba(255,250,236,.98) 100%)',
            filter: 'drop-shadow(0 0 6px rgba(255,232,168,.85))',
            animation: `ss-tail ${dur}s ${delay}s ${timing}`,
          }}
        />
        {/* head: glowing core dot + crossing sparkle */}
        <div
          style={{
            position: 'absolute',
            right: -2,
            top: '50%',
            width: 6,
            height: 6,
            transform: 'translateY(-50%)',
            borderRadius: '50%',
            background: '#fffdf2',
            boxShadow: '0 0 10px 3px rgba(255,244,196,.95), 0 0 22px 7px rgba(255,226,150,.5)',
          }}
        >
          <div style={{ ...sparkleBar, width: 18, height: 1.5, animation: `ss-shine ${dur}s ${delay}s ${timing}` }} />
          <div
            style={{
              ...sparkleBar,
              width: 1.5,
              height: 8,
              background: 'linear-gradient(0deg, rgba(255,244,200,0), rgba(255,252,236,.95), rgba(255,244,200,0))',
              animation: `ss-shine ${dur}s ${delay}s ${timing}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
