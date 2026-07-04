'use client';

/**
 * Ambient meadow creatures — ported verbatim from the reference artifact
 * (`apps/web/reference/bloom-artifact-reference-app.jsx`). These were deferred from the
 * live `/garden` and are exercised only by the `/preview/meadow` playground (the
 * `creatures` prop on `BloomMeadow`). Exception: `Duck` is new (not from the artifact)
 * and also flies in the live garden at golden hour/dusk.
 */
import React, { useEffect, useState } from 'react';

/** Wing colour pairs (outer, inner). */
export const WINGS: [string, string][] = [
  ['#e2a14e', '#b06a30'], // amber
  ['#a8bedf', '#6f88b5'], // pale blue
  ['#e3b4c6', '#b27795'], // rose
  ['#d8cd96', '#a3955c'], // meadow yellow
];

export interface Bfly {
  id: number;
  x: number;
  yB: number;
  path: string;
  dur: number;
  stay: number;
  delay: number;
  wing: [string, string];
  size: number;
}

export function Butterfly({ f }: { f: Bfly }) {
  const [stage, setStage] = useState<'fly' | 'perch' | 'leave'>('fly');
  useEffect(() => {
    const t1 = setTimeout(() => setStage('perch'), (f.delay + f.dur) * 1000);
    const t2 = setTimeout(() => setStage('leave'), (f.delay + f.dur + f.stay - 1.1) * 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const flap = stage === 'fly' ? 0.24 : 2.6;
  const s = f.size;
  return (
    <div style={{ position: 'absolute', left: f.x, bottom: f.yB, zIndex: 190, pointerEvents: 'none', opacity: stage === 'leave' ? 0 : 1, transition: 'opacity 1.1s ease' }}>
      <div style={{ offsetPath: `path("${f.path}")`, offsetRotate: '0deg', animation: `bj-flight ${f.dur}s ${f.delay}s cubic-bezier(.42,.08,.34,.98) both` } as React.CSSProperties}>
        <div style={{ animation: stage === 'fly' ? 'bj-flybob .85s ease-in-out infinite alternate' : 'bj-perchbob 3.6s ease-in-out infinite alternate' }}>
          <div style={{ position: 'relative', width: 30 * s, height: 24 * s, perspective: 110, filter: 'drop-shadow(0 2px 2px rgba(20,30,22,.25))' }}>
            <svg width={14 * s} height={22 * s} viewBox="0 0 14 22" style={{ position: 'absolute', right: '50%', top: 0, transformOrigin: 'right center', animation: `bj-flapL ${flap}s ease-in-out infinite alternate` }}>
              <path d="M13.6 11 C 3 -1, -2.4 4, 3.4 10.4 C -2 15.4, 3.6 22.6, 13.6 12.4 Z" fill={f.wing[0]} />
              <path d="M13.6 11 C 7 4.6, 5 6.6, 8 10.4 Z" fill={f.wing[1]} opacity=".85" />
            </svg>
            <svg width={14 * s} height={22 * s} viewBox="0 0 14 22" style={{ position: 'absolute', left: '50%', top: 0, transformOrigin: 'left center', animation: `bj-flapR ${flap}s ease-in-out infinite alternate` }}>
              <g transform="scale(-1,1) translate(-14,0)">
                <path d="M13.6 11 C 3 -1, -2.4 4, 3.4 10.4 C -2 15.4, 3.6 22.6, 13.6 12.4 Z" fill={f.wing[0]} />
                <path d="M13.6 11 C 7 4.6, 5 6.6, 8 10.4 Z" fill={f.wing[1]} opacity=".85" />
              </g>
            </svg>
            <div style={{ position: 'absolute', left: '50%', top: '16%', width: 2.6 * s, height: 14 * s, marginLeft: -1.3 * s, borderRadius: 4, background: '#3a322c' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const Fox = ({ fill }: { fill: string }) => (
  <g>
    <path d="M5 7 C -2 13 -1 24 8 27.5 C 13.5 29.5 19.5 28 23 24.5 L 27 17 C 21 19.5 14.5 18.5 11.5 14 C 9.5 11 7.5 8.5 5 7 Z" fill={fill} />
    <path d="M20 24 C 22 18.5 28 15.5 35 15.5 C 43 15.5 50 17.2 57 16.6 C 62 16.1 65 13.8 67.8 11.6 L 68.8 6.2 L 72.8 9.8 L 76.8 6.8 L 77.8 11.9 C 83 12.4 88.5 14.2 92.4 17.6 C 94.4 19.2 93.8 21.2 91.2 21.7 L 83 22.7 C 80 25.7 75 27.6 70 28.1 C 62 29 52 29.1 44 28.7 C 35 28.2 26 27.7 21.6 26.6 C 20.5 26.1 19.8 25 20 24 Z" fill={fill} />
    <path d="M25.5 25.5 L 20.5 41.2 L 23.5 41.8 L 29.5 26.3 Z" fill={fill} />
    <path d="M33.5 26.8 L 35.8 41.8 L 38.8 41.8 L 38.3 27.2 Z" fill={fill} />
    <path d="M58 27.6 L 55.2 41.6 L 58.2 42 L 63 28 Z" fill={fill} />
    <path d="M68.5 27.2 L 73.8 41 L 76.8 40.4 L 73.2 26 Z" fill={fill} />
  </g>
);

export interface FoxState {
  run: number;
  vars: React.CSSProperties;
  dir: number;
  sc: number;
  dur: number;
}

export interface Streak {
  id: number;
  x: number;
  y: number;
  ang: number;
  len: number;
  dur: number;
  delay: number;
  dist?: number;
}
export interface ShootState {
  run: number;
  streaks: Streak[];
}

export interface FlockState {
  run: number;
  flock: Bfly[];
}

export interface DuckSpec {
  id: number;
  dx: number; // px behind the leader (negative)
  dy: number; // px above/below the leader's line
  size: number;
  flapDur: number;
  flapDelay: number;
  bobDur: number;
  bobDelay: number;
}

export interface DuckFlightState {
  run: number;
  dir: 1 | -1;
  top: number; // % down the sky
  dur: number; // s for the full crossing
  flock: DuckSpec[];
}

/** One duck of the V — side-profile silhouette (facing right), wing flapping at the shoulder. */
export function Duck({ d }: { d: DuckSpec }) {
  const s = d.size;
  const fill = '#3a332b';
  return (
    <div style={{ position: 'absolute', left: d.dx, top: d.dy, animation: `bj-duckbob ${d.bobDur}s ${d.bobDelay}s ease-in-out infinite alternate` }}>
      <svg width={44 * s} height={26 * s} viewBox="0 0 44 26" style={{ overflow: 'visible', opacity: 0.88 }}>
        <path d="M 3 15 C 7.5 12.2, 14 10.8, 21 11 C 27 11.2, 31.5 12.8, 33.5 15.1 C 31 17.4, 25.5 18.6, 19.5 18.4 C 12.5 18.2, 6.5 17, 3 15 Z" fill={fill} />
        <path d="M 31 14.8 C 33.2 14, 34.8 12.6, 35.8 11 C 36.4 9.6, 37.9 8.8, 39.3 9.3 C 40.7 9.8, 41.4 11.3, 40.9 12.6 C 40.5 13.7, 39.4 14.4, 38.2 14.3 C 36.2 14.2, 33.8 14.8, 32.2 15.8 Z" fill={fill} />
        <path d="M 40.6 10.4 L 44 11.6 L 40.9 12.9 Z" fill={fill} />
        <g style={{ transformBox: 'fill-box', transformOrigin: 'right center', animation: `bj-duckflap ${d.flapDur}s ${d.flapDelay}s ease-in-out infinite alternate` } as React.CSSProperties}>
          <path d="M 20.5 12.2 C 15 9.6, 9 9, 4.8 10.2 C 8.8 13.2, 14.5 14.8, 20.5 15.4 Z" fill={fill} />
        </g>
      </svg>
    </div>
  );
}

/** Keyframes used only by the creatures, appended to BloomMeadow's `<style>` when enabled. */
export const CREATURE_KEYFRAMES = `
  @keyframes bj-flight{from{offset-distance:0%}to{offset-distance:100%}}
  @keyframes bj-flapL{from{transform:rotateY(62deg)}to{transform:rotateY(-16deg)}}
  @keyframes bj-flapR{from{transform:rotateY(-62deg)}to{transform:rotateY(16deg)}}
  @keyframes bj-flybob{from{transform:translateY(0)}to{transform:translateY(-5px)}}
  @keyframes bj-perchbob{from{transform:translateY(0) rotate(-1deg)}to{transform:translateY(-1.6px) rotate(1.4deg)}}
  @keyframes bj-fox{0%{transform:translate(var(--fx0),var(--fy0))}25%{transform:translate(var(--fx1),var(--fy1))}50%{transform:translate(var(--fx2),var(--fy2))}75%{transform:translate(var(--fx3),var(--fy3))}100%{transform:translate(var(--fx4),var(--fy4))}}
  @keyframes bj-foxlife{0%{opacity:0}6%{opacity:.96}93%{opacity:.96}100%{opacity:0}}
  @keyframes bj-trot{from{transform:translateY(0) rotate(.5deg)}to{transform:translateY(-2.6px) rotate(-.9deg)}}
  @keyframes bj-cshadow{0%{transform:translateX(-85vw);opacity:0}9%{opacity:1}88%{opacity:1}100%{transform:translateX(145vw);opacity:0}}
  @keyframes bj-duckcross{from{transform:translateX(-340px)}to{transform:translateX(calc(100vw + 340px))}}
  @keyframes bj-duckflap{from{transform:rotate(-38deg)}to{transform:rotate(30deg)}}
  @keyframes bj-duckbob{from{transform:translateY(0)}to{transform:translateY(-4px)}}
`;
