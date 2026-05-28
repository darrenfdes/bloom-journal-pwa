import { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop, ClipPath } from 'react-native-svg';

import { getGardenSkyHeight } from '@bloom/core/garden/scene-layout';
import {
  getMoonPhaseShadowSvgPath,
  getMoonRotationDeg,
  getNightCloudField,
  getStarField,
  isMoonPhase,
  isNightPhase,
  NIGHT_CLOUD_COLORS,
  shouldShowMoonDisc,
} from '@bloom/core/scene';

import { useSceneContext } from '@/lib/scene/SceneContext';

const MOON_SIZE = 52;
const MOON_GLOW_SIZE = 96;

type Props = {
  /** When set (night sky band), use instead of default sky fraction of window. */
  skyHeight?: number;
  showMoon?: boolean;
};

export function CelestialLayer({ skyHeight: skyHeightProp, showMoon = true }: Props = {} as Props) {
  const scene = useSceneContext();
  const { width, height } = Dimensions.get('window');
  const skyH = skyHeightProp ?? getGardenSkyHeight(height);

  const stars = useMemo(() => getStarField(65), []);
  const nightClouds = useMemo(() => getNightCloudField(10), []);

  if (scene.status !== 'ready') return null;

  const showSun = scene.timePhase === 'dawn';
  const showMoonDisc =
    showMoon &&
    shouldShowMoonDisc({
      timePhase: scene.timePhase,
      weatherCategory: scene.weather?.category,
      moon: scene.moon,
    });
  const showStars = isNightPhase(scene.timePhase);
  const showNightClouds = isMoonPhase(scene.timePhase) || isNightPhase(scene.timePhase);

  const sunLeft = width * 0.12;
  const sunTop = skyH * 0.5;
  const sunSize = 80;
  const moonRight = width * 0.12;
  const moonTop = skyH * 0.12;
  const moonR = MOON_SIZE / 2;
  const moonOffset = (MOON_GLOW_SIZE - MOON_SIZE) / 2;
  const latitude = scene.weather?.coords.lat ?? 0;
  const hour = new Date().getHours();
  const moonRotation = getMoonRotationDeg(latitude, hour);
  const moonShadowPath = getMoonPhaseShadowSvgPath(moonR, scene.moon, latitude, hour);

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

      {showNightClouds ? (
        <Svg width={width} height={skyH} style={StyleSheet.absoluteFill}>
          {nightClouds.map((wisp) => (
            <Ellipse
              key={wisp.id}
              cx={(wisp.left / 100) * width + wisp.width / 2}
              cy={(wisp.top / 100) * skyH + wisp.height / 2}
              rx={wisp.width / 2}
              ry={wisp.height / 2}
              fill={
                wisp.color === 'accent'
                  ? NIGHT_CLOUD_COLORS.accent
                  : NIGHT_CLOUD_COLORS.primary
              }
              opacity={wisp.opacity}
            />
          ))}
        </Svg>
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

      {showMoonDisc ? (
        <View
          style={{
            position: 'absolute',
            right: moonRight - moonOffset,
            top: moonTop - moonOffset,
            width: MOON_GLOW_SIZE,
            height: MOON_GLOW_SIZE,
            transform: [{ rotate: `${moonRotation}deg` }],
          }}
        >
          <Svg width={MOON_GLOW_SIZE} height={MOON_GLOW_SIZE}>
            <Defs>
              <RadialGradient id="moonGrad" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#f4f6ff" />
                <Stop offset="55%" stopColor="#dde2f0" />
                <Stop offset="100%" stopColor="#b8bfd4" />
              </RadialGradient>
              <ClipPath id="mobileCelestialMoonClip">
                <Circle cx={MOON_GLOW_SIZE / 2} cy={MOON_GLOW_SIZE / 2} r={moonR} />
              </ClipPath>
            </Defs>
            <G x={moonOffset} y={moonOffset}>
              <Circle cx={moonR} cy={moonR} r={moonR} fill="url(#moonGrad)" />
              {moonShadowPath ? (
                <Path d={moonShadowPath} fill="#070d1c" clipPath="url(#mobileCelestialMoonClip)" />
              ) : null}
            </G>
          </Svg>
        </View>
      ) : null}
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
