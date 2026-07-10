/**
 * Three.js side of the wind system: shared uniforms plus the `onBeforeCompile` splice that
 * injects `WIND_SWAY_GLSL` into a standard material's vertex stage. Pure math/tuning lives in
 * `lib/garden/explore/wind.ts`; this file touches three.js so it stays out of vitest (jsdom).
 */
import * as THREE from 'three';

import {
  WIND_PRESETS,
  WIND_SWAY_GLSL,
  WIND_SWAY_UNIFORMS_GLSL,
  type WindPresetName,
} from '@/lib/garden/explore/wind';

export interface WindUniforms {
  uWindTime: { value: number };
  uWindStrength: { value: number };
  uWindDir: { value: THREE.Vector2 };
}

/** One shared uniforms object per scene — every swaying material reads the same gust clock. */
export function createWindUniforms(): WindUniforms {
  return {
    uWindTime: { value: 0 },
    uWindStrength: { value: 0 },
    // Prevailing breeze blows roughly west→east with a little southward drift.
    uWindDir: { value: new THREE.Vector2(0.85, 0.53).normalize() },
  };
}

/**
 * Splices the sway chunk into `material`'s vertex shader. Call once at material creation.
 * `customProgramCacheKey` keeps three.js from sharing compiled programs between wind and
 * non-wind materials of the same class (the silent footgun with onBeforeCompile).
 */
export function applyWindSway(
  material: THREE.Material,
  preset: WindPresetName,
  uniforms: WindUniforms,
): void {
  const p = WIND_PRESETS[preset];
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = uniforms.uWindTime;
    shader.uniforms.uWindStrength = uniforms.uWindStrength;
    shader.uniforms.uWindDir = uniforms.uWindDir;
    shader.uniforms.uSwayAmp = { value: p.amp };
    shader.uniforms.uSwayFreq = { value: p.freq };
    shader.uniforms.uSwayYRef = { value: p.yRef };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${WIND_SWAY_UNIFORMS_GLSL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${WIND_SWAY_GLSL}`);
  };
  material.customProgramCacheKey = () => `wind-${preset}`;
}
