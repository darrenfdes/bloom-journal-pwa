import { StyleSheet, Text, View } from 'react-native';

import { useSceneContext } from '@/lib/scene/SceneContext';

export function SceneLocatingLabel() {
  const { status } = useSceneContext();
  if (status !== 'fetching') return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={styles.text}>Finding your meadow…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    bottom: 120,
    zIndex: 12,
  },
  text: {
    fontStyle: 'italic',
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});
