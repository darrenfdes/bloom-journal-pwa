/**
 * Serializes an entry's `<Flower>` SVG (the exact component the 2D meadow renders) into a
 * standalone SVG document string, ready to rasterize into a billboard texture.
 *
 * Sway is baked to 0 — lean/sway are animated on the 3D billboard instead, so a given entry
 * always yields byte-identical SVG (textures can be cached by seed).
 */
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Flower } from '@/components/flower/Flower';
import type { PlacedEntry } from '@/lib/garden/bloom/layout';

export function buildFlowerSvgString(placed: PlacedEntry, texSize: number): string {
  const g = placed.genome;
  const markup = renderToStaticMarkup(
    createElement(Flower, {
      mood: g.bloomMood,
      seed: g.seed,
      size: texSize,
      sway: 0,
      wordCount: g.wordCount,
      wiltDroop: g.wiltFactor * 8,
      pumpkinStage: g.specialBloom === 'pumpkin' ? g.pumpkinStage : undefined,
    }),
  );
  // React omits the SVG namespace on the root element; a standalone document needs it.
  return markup.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
}
