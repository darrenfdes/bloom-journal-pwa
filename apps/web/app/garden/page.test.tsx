import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GardenContent } from './page';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: mockReplace,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function MeadowStub({
      live,
      entries,
    }: {
      live?: boolean;
      entries: unknown[];
    }) {
      return (
        <div
          data-testid="bloom-meadow"
          data-live={String(!!live)}
          data-entry-count={entries.length}
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
    locationName: 'Goa',
  }),
}));

type StoreSlice = {
  ready: boolean;
  gardenMeta: { hasPlantedFirst: boolean } | null;
  entries: unknown[];
};

function mockStore(state: StoreSlice) {
  mockUseBloomStore.mockImplementation((selector: (s: StoreSlice) => unknown) => selector(state));
}

describe('GardenContent', () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it('shows loading when store is not ready', () => {
    mockStore({ ready: false, gardenMeta: null, entries: [] });
    render(<GardenContent />);
    expect(screen.getByText('Loading garden…')).toBeInTheDocument();
  });

  it('redirects to write when first plant has not happened', () => {
    mockStore({
      ready: true,
      gardenMeta: { hasPlantedFirst: false },
      entries: [],
    });
    render(<GardenContent />);
    expect(mockReplace).toHaveBeenCalledWith('/write');
  });

  it('renders live meadow when garden is ready', () => {
    mockStore({
      ready: true,
      gardenMeta: { hasPlantedFirst: true },
      entries: [{ id: 'e1' }],
    });
    render(<GardenContent />);
    const meadow = screen.getByTestId('bloom-meadow');
    expect(meadow).toHaveAttribute('data-live', 'true');
    expect(meadow).toHaveAttribute('data-entry-count', '1');
  });
});
