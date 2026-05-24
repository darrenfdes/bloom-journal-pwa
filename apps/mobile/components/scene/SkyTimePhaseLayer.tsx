import { Dimensions, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getSkyGradient } from '@bloom/core/scene';

import { useSceneContext } from '@/lib/scene/SceneContext';

export function SkyTimePhaseLayer() {
  const { timePhase, weather, status } = useSceneContext();
  const ready = status === 'ready';
  const { width, height } = Dimensions.get('window');
  const skyH = getGardenSkyHeight(height);
  const cloudCover = weather?.cloudCover ?? 0;
  const { top, bottom } = getSkyGradient(timePhase, cloudCover);

  return (
    <Svg
      width={width}
      height={skyH}
      style={[styles.layer, { opacity: ready ? 1 : 0 }]}
      pointerEvents="none"
    >
      <Defs>
        <LinearGradient id="sceneSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={top} />
          <Stop offset="100%" stopColor={bottom} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={skyH} fill="url(#sceneSky)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
