import {
  type EntryWeatherSnapshot,
  type SceneState,
} from '@bloom/core/scene';

import type { PlantSceneSnapshot } from '@/lib/db/repositories/entries';

function toWeatherSnapshot(
  scene: SceneState,
  locationName: string | null
): EntryWeatherSnapshot | null {
  if (!scene.weather) return null;
  return {
    category: scene.weather.category,
    windSpeed: scene.weather.windSpeed,
    cloudCover: scene.weather.cloudCover,
    visibility: scene.weather.visibility,
    precipitation: scene.weather.precipitation,
    temperature: scene.weather.temperature,
    coords: scene.weather.coords,
    locationName,
  };
}

export function buildPlantSceneSnapshot(
  scene: SceneState
): PlantSceneSnapshot | undefined {
  const weather = toWeatherSnapshot(scene, scene.locationName);
  if (!weather) return undefined;
  return {
    weather,
    timePhase: scene.timePhase,
    sceneSeason: scene.season,
  };
}
