'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import type { WeatherCategory } from '@bloom/core/scene';

import type { PhaseKey } from '@/lib/garden/bloom/phases';
import {
  buildFlight,
  firstDuckDelayMs,
  flightAllowed,
  flightPoseAt,
  nextBirdRollDelayMs,
  nextDuckDelayMs,
  rollDuckSession,
  rollSoloBird,
  type Flight,
} from '@/lib/garden/explore/flights';
import type { PlayerState } from '@/lib/garden/explore/movement';

/** Both sheets are 10 cells across (3671×510 viewBox) — the 2D `steps(10)` wingbeat. */
const CELLS = 10;
const SHEET_W = 1835;
const SHEET_H = 255;
/** Cell height / cell width. */
const CELL_ASPECT = SHEET_H / (SHEET_W / CELLS);

/** Rasterizes a sprite-sheet SVG once, on demand, into a texture. */
function useCellTexture(url: string, wanted: boolean): THREE.CanvasTexture | null {
  const [tex, setTex] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    if (!wanted || tex) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const c = document.createElement('canvas');
      c.width = SHEET_W;
      c.height = SHEET_H;
      c.getContext('2d')!.drawImage(img, 0, 0, SHEET_W, SHEET_H);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      setTex(t);
    };
    img.src = url;
    return () => {
      cancelled = true;
    };
  }, [wanted, url, tex]);
  useEffect(() => () => tex?.dispose(), [tex]);
  return tex;
}

/**
 * Ducks in a V (golden/dusk, session-gated) and lone day birds crossing the sky ahead of the
 * camera — the 2D meadow's flights re-projected into 3D. Timing/probability comes verbatim
 * from `lib/garden/bloom/ducks.ts` via `flights.ts`; each member is a sprite playing the
 * 10-cell sheet wingbeat. ≤7 transient sprites, nothing rendered while idle; not mounted
 * under reduced motion. `forceFlight` (dev `?flight=ducks|bird`) fires one immediately.
 */
export function SkyFlights({
  phase,
  category,
  playerRef,
  forceFlight = null,
}: {
  phase: PhaseKey;
  category: WeatherCategory | undefined;
  playerRef: React.MutableRefObject<PlayerState>;
  forceFlight?: 'ducks' | 'bird' | null;
}) {
  const [active, setActive] = useState<Flight | null>(null);
  const startRef = useRef<number | null>(null);
  // Read latest weather inside timers without rescheduling them on every weather tick.
  const categoryRef = useRef(category);
  categoryRef.current = category;

  const spawn = (kind: 'ducks' | 'bird') =>
    setActive((current) => {
      if (current || !flightAllowed(categoryRef.current)) return current;
      const p = playerRef.current;
      return buildFlight(Math.random, kind, { x: p.x, z: p.z, yaw: p.yaw });
    });

  // 2D-parity scheduling: duck sessions rolled once per phase entry (golden 1/3, dusk 1/6,
  // then a V every 2–3 min); day birds re-roll every ~4–5.5 min at 0.8.
  useEffect(() => {
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => timers.push(window.setTimeout(fn, ms));
    if (rollDuckSession(Math.random(), phase)) {
      const scheduleNext = (delayMs: number) =>
        later(() => {
          spawn('ducks');
          scheduleNext(nextDuckDelayMs(Math.random()));
        }, delayMs);
      scheduleNext(firstDuckDelayMs(Math.random()));
    }
    if (phase === 'day') {
      const reRoll = () => {
        if (rollSoloBird(Math.random(), phase)) spawn('bird');
        later(reRoll, nextBirdRollDelayMs(Math.random()));
      };
      later(reRoll, 0.3 * nextBirdRollDelayMs(Math.random()));
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session luck re-rolls per phase only
  }, [phase]);

  // Dev-only immediate crossing.
  const forceUsedRef = useRef(false);
  useEffect(() => {
    if (forceFlight && !forceUsedRef.current) {
      forceUsedRef.current = true;
      spawn(forceFlight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once on mount
  }, [forceFlight]);

  const duckTex = useCellTexture('/duck-cells.svg', active?.kind === 'ducks');
  const birdTex = useCellTexture('/bird-cells.svg', active?.kind === 'bird');
  const sheet = active?.kind === 'ducks' ? duckTex : birdTex;

  const built = useMemo(() => {
    if (!active || !sheet) return null;
    return active.members.map((member) => {
      const tex = sheet.clone();
      tex.needsUpdate = true;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      // One cell window; a negative repeat mirrors the art for right→left crossings.
      tex.repeat.set((active.mirror ? -1 : 1) / CELLS, 1);
      const material = new THREE.SpriteMaterial({
        map: tex,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(material);
      sprite.scale.set(member.size, member.size * CELL_ASPECT, 1);
      return { sprite, tex, material, member };
    });
  }, [active, sheet]);
  useEffect(() => {
    if (!built) return;
    return () => {
      built.forEach(({ tex, material }) => {
        tex.dispose();
        material.dispose();
      });
    };
  }, [built]);

  useFrame(({ clock }) => {
    if (!active || !built) return;
    const t = clock.elapsedTime;
    if (startRef.current === null) startRef.current = t;
    const t01 = (t - startRef.current) / active.durSec;
    if (t01 >= 1) {
      startRef.current = null;
      setActive(null);
      return;
    }
    for (const { sprite, tex, material, member } of built) {
      const pose = flightPoseAt(active, member, t01);
      sprite.position.set(pose.x, pose.y, pose.z);
      material.opacity = pose.opacity;
      // The steps(10) wingbeat: hold each cell, no interpolation.
      const frame = Math.floor(t * member.flapHz * CELLS) % CELLS;
      tex.offset.x = active.mirror ? (frame + 1) / CELLS : frame / CELLS;
    }
  });

  if (!built) return null;
  return (
    <>
      {built.map(({ sprite }, i) => (
        <primitive key={i} object={sprite} />
      ))}
    </>
  );
}
