import { StyleSheet, View } from 'react-native';

import { getAmbientOverlay } from '@bloom/core';

import { useSceneContext } from '@/lib/scene/SceneContext';

export function AmbientOverlay() {
  const { timePhase, status } = useSceneContext();
  const ready = status === 'ready';
  const { color, opacity } = getAmbientOverlay(timePhase);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.overlay,
        {
          backgroundColor: color === 'transparent' ? 'transparent' : color,
          opacity: ready ? opacity : 0,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 6,
  },
});
