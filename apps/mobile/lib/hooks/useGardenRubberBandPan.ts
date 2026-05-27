import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, PanResponder } from 'react-native';
import {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const RESISTANCE = 0.55;
const MAX_OFFSET_RATIO = 0.35;
const PAN_THRESHOLD = 6;

function applyResistance(rawOffset: number, maxOffset: number): number {
  const resisted = rawOffset * RESISTANCE;
  return Math.min(maxOffset, Math.max(-maxOffset, resisted));
}

type Options = {
  viewportWidth: number;
  enabled: boolean;
};

export function useGardenRubberBandPan({ viewportWidth, enabled }: Options) {
  const offset = useSharedValue(0);
  const [rubberBandOffset, setRubberBandOffset] = useState(0);
  const reducedMotion = useRef(false);
  const startOffset = useRef(0);
  const maxOffset = Math.max(120, viewportWidth * MAX_OFFSET_RATIO);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reducedMotion.current = value;
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      offset.value = 0;
    }
  }, [enabled, offset]);

  useAnimatedReaction(
    () => (enabled ? offset.value : 0),
    (value) => {
      runOnJS(setRubberBandOffset)(value);
    },
    [enabled]
  );

  const snapToZero = useCallback(() => {
    if (reducedMotion.current) {
      offset.value = 0;
      return;
    }
    offset.value = withSpring(0, { damping: 22, stiffness: 280 });
  }, [offset]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          enabled &&
          Math.abs(gesture.dx) > PAN_THRESHOLD &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          startOffset.current = offset.value;
        },
        onPanResponderMove: (_, gesture) => {
          if (!enabled) return;
          const raw = startOffset.current - gesture.dx;
          offset.value = applyResistance(raw, maxOffset);
        },
        onPanResponderRelease: () => {
          if (!enabled) return;
          snapToZero();
        },
        onPanResponderTerminate: () => {
          if (!enabled) return;
          snapToZero();
        },
      }),
    [enabled, maxOffset, offset, snapToZero]
  );

  const sceneTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: enabled ? -offset.value : 0 }],
  }));

  return {
    panHandlers: enabled ? panResponder.panHandlers : undefined,
    sceneTranslateStyle,
    rubberBandOffset: enabled ? rubberBandOffset : 0,
  };
}
