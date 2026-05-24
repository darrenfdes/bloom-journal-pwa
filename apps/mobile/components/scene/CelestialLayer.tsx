import { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import { getStarField, isMoonPhase, isNightPhase } from '@bloom/core/scene';

import { useSceneContext } from '@/lib/scene/SceneContext';

export function CelestialLayer() {
  const scene = useSceneContext();
  const { width, height } = Dimensions.get('window');
  const skyH = getGardenSkyHeight(height);

  const stars = useMemo(() => getStarField(65), []);

  if (scene.status !== 'ready') return null;

  const showSun = scene.timePhase === 'dawn';
  const showMoon = isMoonPhase(scene.timePhase);
  const showStars = isNightPhase(scene.timePhase);

  const sunLeft = width * 0.12;
  const sunTop = skyH * 0.5;
  const sunSize = 80;

  return (
    <View style={[styles.layer, { height: skyH }]} pointerEvents="none">
      {showSun ? (
        <Svg width={sunSize} height={sunSize} style={{ position: 'absolute', left: sunLeft, top: sunTop }}>
          <Defs>
            <RadialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#fff176" />
              <Stop offset="70%" stopColor="rgba(255,235,59,0.35)" />
              <Stop offset="100%" stopColor="rgba(255,235,59,0)" />
            </RadialGradient>
          </Defs>
          <Circle cx={sunSize / 2} cy={sunSize / 2} r={sunSize / 2} fill="url(#sunGrad)" />
        </Svg>
      ) : null}

      {showMoon ? (
        <View
          style={{
            position: 'absolute',
            right: width * 0.12,
            top: skyH * 0.12,
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: '#dde2f0',
            shadowColor: '#dce1f5',
            shadowOpacity: 0.65,
            shadowRadius: 16,
          }}
        />
      ) : null}

      {showStars
        ? stars.map((star) => {
            const warmth = star.warmth > 0.55 ? '#fff8e8' : '#eef2ff';
            const left = (star.left / 100) * width;
            const top = (star.top / 100) * skyH;
            const isBright = star.kind === 'bright' || star.kind === 'sparkle';

            return (
              <View
                key={star.id}
                style={{
                  position: 'absolute',
                  left,
                  top,
                  width: star.size,
                  height: star.size,
                  borderRadius: star.size / 2,
                  backgroundColor: warmth,
                  opacity: isBright ? 0.95 : 0.55,
                }}
              />
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
});
