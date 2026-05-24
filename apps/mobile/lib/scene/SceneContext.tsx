import React, { createContext, useContext } from 'react';

import type { SceneState } from '@bloom/core';

import { useScene } from './useScene';

const SceneContext = createContext<SceneState | null>(null);

export function SceneProvider({ children }: { children: React.ReactNode }) {
  const scene = useScene();
  return <SceneContext.Provider value={scene}>{children}</SceneContext.Provider>;
}

export function useSceneContext(): SceneState {
  const ctx = useContext(SceneContext);
  if (!ctx) throw new Error('useSceneContext must be used within SceneProvider');
  return ctx;
}

export function useSceneContextOptional(): SceneState | null {
  return useContext(SceneContext);
}
