import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

import type { EntryRecord } from '@bloom/core';
import type { SceneEffect } from '@bloom/core/events';

import { BloomMeadow } from '@/components/garden/bloom/BloomMeadow';

export const mockPush = vi.fn();
export const mockReplace = vi.fn();
export const mockRefreshEntries = vi.fn().mockResolvedValue(undefined);
export const mockToggleFavourite = vi.fn().mockResolvedValue(undefined);
export const mockSoftDelete = vi.fn().mockResolvedValue(undefined);
export const mockSetMemoryCardOpen = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/stores/useBloomStore', () => ({
  useBloomStore: (
    selector: (s: {
      refreshEntries: typeof mockRefreshEntries;
      setMemoryCardOpen: typeof mockSetMemoryCardOpen;
    }) => unknown
  ) => selector({ refreshEntries: mockRefreshEntries, setMemoryCardOpen: mockSetMemoryCardOpen }),
}));

vi.mock('@/lib/db/repositories/entries', () => ({
  toggleFavourite: (...args: unknown[]) => mockToggleFavourite(...args),
  softDelete: (...args: unknown[]) => mockSoftDelete(...args),
}));

export type MeadowRenderProps = {
  entries?: EntryRecord[];
  preview?: boolean;
  live?: boolean;
  creatures?: boolean;
  liveWeather?: {
    category: string;
    windSpeed: number;
    cloudCover: number;
    visibility: number;
    precipitation: number;
    temperature: number;
    coords: { lat: number; lon: number };
    locationName: string | null;
  } | null;
  liveSceneEffects?: SceneEffect[];
};

function buildMeadow(props: MeadowRenderProps) {
  const {
    entries = [],
    preview = false,
    live = false,
    creatures = false,
    liveWeather = null,
    liveSceneEffects = [],
  } = props;
  return (
    <BloomMeadow
      entries={entries}
      preview={preview}
      live={live}
      creatures={creatures}
      liveWeather={liveWeather as never}
      liveSceneEffects={liveSceneEffects}
    />
  );
}

export function renderMeadow(props: MeadowRenderProps = {}, options?: RenderOptions) {
  const result = render(buildMeadow(props), options);
  return { ...result, rerenderMeadow: (next: MeadowRenderProps) => result.rerender(buildMeadow(next)) };
}

export function resetMeadowMocks() {
  mockPush.mockClear();
  mockReplace.mockClear();
  mockRefreshEntries.mockClear();
  mockToggleFavourite.mockClear();
  mockSoftDelete.mockClear();
  mockSetMemoryCardOpen.mockClear();
}
