import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { gardenTileScrollOffset } from '@/components/garden/RepeatingSeasonGround';
import {
  createSwayingGrassState,
  type SwayingGrassState,
} from '@bloom/core/garden/swaying-grass-canvas';

type Props = {
  scrollLeft: number;
  tileWidth: number;
  viewportHeight: number;
  wrapperOffset?: number;
  seed?: number;
};

function bladePath(g: { x: number; y: number; h: number; off: number }, frame: number): string {
  const sway = Math.sin(frame * 0.021 + g.off) * g.h * 0.28;
  return `M ${g.x} ${g.y} Q ${g.x + sway * 0.5} ${g.y - g.h * 0.55} ${g.x + sway} ${g.y - g.h}`;
}

export function SwayingGrassLayer({
  scrollLeft,
  tileWidth,
  viewportHeight,
  wrapperOffset = 0,
  seed = 1337,
}: Props) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const offset = tileWidth > 0 ? gardenTileScrollOffset(scrollLeft, tileWidth) : 0;
  const startIndex = tileWidth > 0 ? Math.floor(scrollLeft / tileWidth) - 1 : 0;
  const endIndex =
    tileWidth > 0 ? Math.ceil((scrollLeft + tileWidth) / tileWidth) + 1 : startIndex + 3;

  const tiles = useMemo(() => {
    const list: { tileIndex: number; left: number; state: SwayingGrassState }[] = [];
    for (let tileIndex = startIndex; tileIndex <= endIndex; tileIndex += 1) {
      const left = tileIndex * tileWidth - offset + wrapperOffset;
      list.push({
        tileIndex,
        left,
        state: createSwayingGrassState(tileWidth, viewportHeight, seed + tileIndex * 997),
      });
    }
    return list;
  }, [endIndex, seed, startIndex, tileWidth, viewportHeight, offset, wrapperOffset]);

  if (tileWidth <= 0 || viewportHeight <= 0) return null;

  return (
    <View style={[styles.root, { height: viewportHeight }]} pointerEvents="none">
      {tiles.map(({ tileIndex, left, state }) => (
        <Svg
          key={tileIndex}
          width={tileWidth}
          height={viewportHeight}
          style={[styles.tile, { left, width: tileWidth, height: viewportHeight }]}
        >
          {state.blades.map((g, i) => (
            <Path
              key={i}
              d={bladePath(g, frame)}
              stroke={g.c}
              strokeWidth={1.4}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </Svg>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 3,
    overflow: 'hidden',
  },
  tile: {
    position: 'absolute',
    top: 0,
  },
});
