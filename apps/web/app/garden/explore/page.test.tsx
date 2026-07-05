import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExploreContent } from './ExploreContent';

vi.mock('next/dynamic', () => ({
  default: () =>
    function SceneStub({
      entries,
      latitude,
      weather,
    }: {
      entries: unknown[];
      latitude: number;
      weather: { category: string } | null;
    }) {
      return (
        <div
          data-testid="explore-scene"
          data-entry-count={entries.length}
          data-latitude={latitude}
          data-weather={weather?.category ?? 'none'}
        />
      );
    },
}));

const mockUseBloomStore = vi.fn();
vi.mock('@/stores/useBloomStore', () => ({
  useBloomStore: (selector: (s: unknown) => unknown) => mockUseBloomStore(selector),
}));

vi.mock('@/lib/scene/useGeolocation', () => ({
  useGeolocation: () => ({ coords: { lat: 15.5, lon: 73.8 }, status: 'ready' }),
}));

vi.mock('@/lib/scene/useWeather', () => ({
  useWeather: () => ({
    category: 'clear',
    windSpeed: 0,
    cloudCover: 0,
    visibility: 10,
    precipitation: 0,
    temperature: 28,
    coords: { lat: 15.5, lon: 73.8 },
  }),
}));

type StoreSlice = { ready: boolean; entries: { id: string; isDeleted?: boolean }[] };

function mockStore(state: StoreSlice) {
  mockUseBloomStore.mockImplementation((selector: (s: StoreSlice) => unknown) => selector(state));
}

describe('ExploreContent', () => {
  it('shows loading until the store is ready', () => {
    mockStore({ ready: false, entries: [] });
    render(<ExploreContent />);
    expect(screen.getByText('Growing your meadow…')).toBeInTheDocument();
  });

  it('invites planting when the garden is empty (deleted entries don\'t count)', () => {
    mockStore({ ready: true, entries: [{ id: 'gone', isDeleted: true }] });
    render(<ExploreContent />);
    expect(screen.getByText(/plant a memory first/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to the garden/i })).toHaveAttribute(
      'href',
      '/garden',
    );
  });

  it('mounts the 3D scene with entries, weather and latitude', () => {
    mockStore({ ready: true, entries: [{ id: 'e1' }, { id: 'e2' }] });
    render(<ExploreContent />);
    const scene = screen.getByTestId('explore-scene');
    expect(scene).toHaveAttribute('data-entry-count', '2');
    expect(scene).toHaveAttribute('data-latitude', '15.5');
    expect(scene).toHaveAttribute('data-weather', 'clear');
  });
});
