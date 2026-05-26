'use client';

import React, { createContext, useContext } from 'react';

import type { SceneState } from '@bloom/core/scene';

import { useScene } from './useScene';

const SceneContext = createContext<SceneState | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const scene = useScene();
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
}

/** Inject a fixed scene for dev/preview pages (e.g. weather FX previews). */
export function ScenePreviewProvider({
  scene,
  children,
}: {
  scene: SceneState;
  children: React.ReactNode;
}) {
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
}

export function useSceneContext(): SceneState {
  const ctx = useContext(SceneContext);
  if (!ctx) {
    throw new Error('useSceneContext must be used within SceneProvider');
  }
  return ctx;
}

export function useOptionalSceneContext(): SceneState | null {
  return useContext(SceneContext);
}

/** @alias useOptionalSceneContext */
export const useSceneContextOptional = useOptionalSceneContext;
