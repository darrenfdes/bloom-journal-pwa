import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { computeSkyBandHeight } from '@bloom/core/garden/horizon-layout';
import { createNightSceneState } from '@bloom/core/scene';

type Props = {
  sceneHeight: number;
  panTopOffset?: number;
};

/**
 * Meadow fireflies above SVG hills, below flowers (pan layer).
 */
export function NightHorizonBand({ sceneHeight, panTopOffset = 0 }: Props) {
  const { width: W } = Dimensions.get('window');
  const skyBandHeight = computeSkyBandHeight(panTopOffset, sceneHeight);
  const flies = useMemo(
    () => createNightSceneState(W, skyBandHeight, sceneHeight).flies,
    [W, skyBandHeight, sceneHeight]
  );

  return (
    <View style={[styles.root, { height: sceneHeight }]} pointerEvents="none">
      <Svg width={W} height={sceneHeight} style={StyleSheet.absoluteFill}>
        {flies.map((f, i) => {
          const a = Math.max(0, Math.sin(f.life));
          if (a < 0.05) return null;
          return (
            <Circle
              key={i}
              cx={f.x}
              cy={f.y}
              r={f.sz}
              fill={`rgba(205,255,130,${a})`}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
});
