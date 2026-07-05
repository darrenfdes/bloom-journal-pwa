'use client';

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import {
  getRainLayerOpacity,
  getRainWindSlantDeg,
  isPrecipitatingCategory,
  type WeatherCategory,
} from '@bloom/core/scene';

import { mulberry32 } from '@/lib/garden/bloom/rng';

/** Particle volume that follows the camera; particles wrap modulo the box. */
const BOX = { w: 30, h: 18, d: 30 };

const RAIN_COUNT: Partial<Record<WeatherCategory, number>> = {
  drizzle: 250,
  rain: 700,
  heavy_rain: 1100,
  thunderstorm: 1100,
};

/**
 * Rain/snow as one camera-following `Points` cloud. Rain falls fast with the wind slant the
 * 2D meadow uses; snow drifts down slowly on a sine sway. Hidden under reduced motion (the
 * fog/dimming weather cues remain).
 */
export function WeatherParticles({
  category,
  windSpeed,
  reducedMotion,
}: {
  category: WeatherCategory | undefined;
  windSpeed: number;
  reducedMotion: boolean;
}) {
  const snowing = category === 'snow';
  const raining = isPrecipitatingCategory(category);
  if (reducedMotion || (!snowing && !raining)) return null;
  const count = snowing ? 450 : (RAIN_COUNT[category!] ?? 700);
  return (
    <ParticleBox
      key={`${snowing ? 'snow' : 'rain'}:${count}`}
      snow={snowing}
      count={count}
      opacity={snowing ? 0.9 : getRainLayerOpacity(category!).drop}
      slantDeg={snowing ? 0 : getRainWindSlantDeg(windSpeed)}
    />
  );
}

function ParticleBox({
  snow,
  count,
  opacity,
  slantDeg,
}: {
  snow: boolean;
  count: number;
  opacity: number;
  slantDeg: number;
}) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const rng = mulberry32(count * 7 + (snow ? 1 : 0));
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = rng() * BOX.w;
      positions[i * 3 + 1] = rng() * BOX.h;
      positions[i * 3 + 2] = rng() * BOX.d;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    // The box hugs the camera, so culling by its (moving) bounds is never useful.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    return geo;
  }, [count, snow]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const fallSpeed = snow ? 1.1 : 9;
  const lateral = Math.tan((slantDeg * Math.PI) / 180) * fallSpeed;

  useFrame(({ camera, clock }, delta) => {
    const points = pointsRef.current;
    if (!points) return;
    points.position.set(
      camera.position.x - BOX.w / 2,
      camera.position.y - BOX.h / 2,
      camera.position.z - BOX.d / 2,
    );
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const dt = Math.min(delta, 0.1);
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      let x = pos.getX(i) + lateral * dt + (snow ? Math.sin(t * 0.8 + i) * 0.35 * dt : 0);
      let y = pos.getY(i) - fallSpeed * dt;
      if (y < 0) y += BOX.h;
      if (x < 0) x += BOX.w;
      else if (x >= BOX.w) x -= BOX.w;
      pos.setXY(i, x, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={snow ? 3 : 1.6}
        sizeAttenuation={false}
        color={snow ? '#ffffff' : '#b9c9da'}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}
