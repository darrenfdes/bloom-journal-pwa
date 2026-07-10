'use client';

import { useFrame } from '@react-three/fiber';

import type { WeatherCategory } from '@bloom/core/scene';

import { windStrengthFor } from '@/lib/garden/explore/wind';

import type { WindUniforms } from './wind-material';

/**
 * The scene's single wind ticker: advances the shared gust clock and eases the sway strength
 * toward the live weather's target. Renders nothing; not mounted under reduced motion.
 */
export function WindDriver({
  uniforms,
  category,
  windSpeed,
}: {
  uniforms: WindUniforms;
  category: WeatherCategory | undefined;
  windSpeed: number;
}) {
  useFrame((_, delta) => {
    uniforms.uWindTime.value += delta;
    const target = windStrengthFor(category, windSpeed);
    const k = 1 - Math.exp(-delta * 1.5);
    uniforms.uWindStrength.value += (target - uniforms.uWindStrength.value) * k;
  });
  return null;
}
