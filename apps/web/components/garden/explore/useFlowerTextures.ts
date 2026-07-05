'use client';

import { useEffect, useState } from 'react';
import * as THREE from 'three';

import {
  FLOWER_TEX_SIZE,
  FLOWER_TEX_SIZE_SMALL,
  FLOWER_TEX_SMALL_THRESHOLD,
} from '@/lib/garden/explore/constants';
import { buildFlowerSvgString } from '@/lib/garden/explore/flower-svg';
import type { FlowerPlacement } from '@/lib/garden/explore/world-layout';

export interface FlowerTextures {
  /** entry id → billboard texture; fills progressively as batches finish. */
  textures: Map<string, THREE.CanvasTexture>;
  /** 0..1 rasterization progress for the loading overlay. */
  progress: number;
}

/**
 * Rasterizes each entry's `<Flower>` SVG into a `CanvasTexture` billboard, in small async
 * batches so the terrain/sky stay responsive while the garden "grows in". Textures are cached
 * by genome seed (identical genomes share GPU memory) and disposed on unmount.
 */
export function useFlowerTextures(flowers: FlowerPlacement[]): FlowerTextures {
  const [progress, setProgress] = useState(flowers.length === 0 ? 1 : 0);
  const [textures, setTextures] = useState<Map<string, THREE.CanvasTexture>>(new Map());

  useEffect(() => {
    if (flowers.length === 0) {
      setProgress(1);
      setTextures(new Map());
      return;
    }

    let aborted = false;
    const texSize =
      flowers.length > FLOWER_TEX_SMALL_THRESHOLD ? FLOWER_TEX_SIZE_SMALL : FLOWER_TEX_SIZE;
    const byEntry = new Map<string, THREE.CanvasTexture>();
    const bySeed = new Map<string, THREE.CanvasTexture>();

    const rasterize = async (placed: FlowerPlacement) => {
      const g = placed.entry.genome;
      const key = `${g.seed}:${g.specialBloom === 'pumpkin' ? g.pumpkinStage : '-'}:${texSize}`;
      const cached = bySeed.get(key);
      if (cached) {
        byEntry.set(placed.entry.id, cached);
        return;
      }
      const svg = buildFlowerSvgString(placed.entry, texSize);
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const canvas = document.createElement('canvas');
        canvas.width = texSize;
        canvas.height = texSize;
        canvas.getContext('2d')!.drawImage(img, 0, 0, texSize, texSize);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        // Mipmaps kill shimmer at walking distance; anisotropy keeps petals crisp at
        // grazing angles. Both defaults are already right for CanvasTexture except:
        tex.anisotropy = 4;
        bySeed.set(key, tex);
        byEntry.set(placed.entry.id, tex);
      } finally {
        URL.revokeObjectURL(url);
      }
    };

    void (async () => {
      const BATCH = 4;
      for (let i = 0; i < flowers.length; i += BATCH) {
        if (aborted) return;
        await Promise.all(flowers.slice(i, i + BATCH).map(rasterize));
        if (aborted) return;
        setTextures(new Map(byEntry));
        setProgress(Math.min(1, (i + BATCH) / flowers.length));
      }
      setProgress(1);
    })();

    return () => {
      aborted = true;
      for (const tex of bySeed.values()) tex.dispose();
    };
  }, [flowers]);

  return { textures, progress };
}
