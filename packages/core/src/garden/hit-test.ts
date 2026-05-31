import { isAnniversaryBlossom } from './anniversary';
import type { PlacedFlower } from './layout';
import type { EntryRecord, GardenPosition } from '../types';

export const FLOWER_HIT_ELLIPSE_RX_RATIO = 0.4;
export const FLOWER_HIT_ELLIPSE_RY_RATIO = 0.35;
export const FLOWER_HIT_ELLIPSE_CY_RATIO = 0.34;

export interface FlowerPlotSize {
  flowerSize: number;
  favHalo: number;
  width: number;
  height: number;
}

export interface FlowerHitEllipse {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

export function flowerPlotSize(entry: Pick<EntryRecord, 'isFavourited' | 'createdAt'>): FlowerPlotSize {
  let flowerSize = 140;
  if (entry.isFavourited) flowerSize = 156;
  else if (isAnniversaryBlossom(entry.createdAt)) flowerSize = 148;

  const favHalo = entry.isFavourited ? 14 : 0;
  const width = flowerSize + favHalo * 2;
  const height = flowerSize * 1.15 + favHalo;

  return { flowerSize, favHalo, width, height };
}

export function getFlowerHitEllipse(
  entry: Pick<EntryRecord, 'isFavourited' | 'createdAt'>,
  position: Pick<GardenPosition, 'x' | 'y'>
): FlowerHitEllipse {
  const { width, height } = flowerPlotSize(entry);

  return {
    cx: position.x,
    cy: position.y - height * (1 - FLOWER_HIT_ELLIPSE_CY_RATIO),
    rx: width * FLOWER_HIT_ELLIPSE_RX_RATIO,
    ry: height * FLOWER_HIT_ELLIPSE_RY_RATIO,
  };
}

export function pointInEllipse(
  worldX: number,
  worldY: number,
  ellipse: FlowerHitEllipse
): boolean {
  if (ellipse.rx <= 0 || ellipse.ry <= 0) return false;
  const dx = (worldX - ellipse.cx) / ellipse.rx;
  const dy = (worldY - ellipse.cy) / ellipse.ry;
  return dx * dx + dy * dy <= 1;
}

export function findPlacedFlowersAtPoint(
  worldX: number,
  worldY: number,
  placed: PlacedFlower[]
): PlacedFlower[] {
  const hits = placed.filter(({ entry, position }) =>
    pointInEllipse(worldX, worldY, getFlowerHitEllipse(entry, position))
  );

  hits.sort((a, b) => {
    const ellipseA = getFlowerHitEllipse(a.entry, a.position);
    const ellipseB = getFlowerHitEllipse(b.entry, b.position);
    const distA =
      (worldX - ellipseA.cx) ** 2 + (worldY - ellipseA.cy) ** 2;
    const distB =
      (worldX - ellipseB.cx) ** 2 + (worldY - ellipseB.cy) ** 2;
    return distA - distB;
  });

  return hits;
}
