import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GardenContent } from './GardenContent';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
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
      birthday,
    }: {
      live?: boolean;
      entries: unknown[];
      birthday?: string;
    }) {
      return (
        <div
          data-testid="bloom-meadow"
          data-live={String(!!live)}
          data-entry-count={entries.length}
          data-birthday={birthday}
        />
      );
    },
}));

const mockGetOrCreateSettings = vi.fn().mockResolvedValue({ birthday: null, useBirthdayForStars: false });
vi.mock('@/lib/db/repositories/settings', () => ({
  getOrCreateSettings: () => mockGetOrCreateSettings(),
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
  it('shows loading when store is not ready', () => {
    mockStore({ ready: false, gardenMeta: null, entries: [] });
    render(<GardenContent />);
    expect(screen.getByText('Loading garden…')).toBeInTheDocument();
  });

  it('renders live meadow with no entries and defaults a blank birthday to December 1', async () => {
    mockStore({
      ready: true,
      gardenMeta: { hasPlantedFirst: false },
      entries: [],
    });
    render(<GardenContent />);
    const meadow = screen.getByTestId('bloom-meadow');
    expect(meadow).toHaveAttribute('data-live', 'true');
    expect(meadow).toHaveAttribute('data-entry-count', '0');
    await waitFor(() => expect(meadow.getAttribute('data-birthday')).toBe('12-01'));
  });

  it('renders live meadow with entries and keeps the saved birthday', async () => {
    mockGetOrCreateSettings.mockResolvedValueOnce({ birthday: '1990-07-15', useBirthdayForStars: false });
    mockStore({
      ready: true,
      gardenMeta: { hasPlantedFirst: true },
      entries: [{ id: 'e1' }],
    });
    render(<GardenContent />);
    const meadow = screen.getByTestId('bloom-meadow');
    expect(meadow).toHaveAttribute('data-live', 'true');
    expect(meadow).toHaveAttribute('data-entry-count', '1');
    await waitFor(() => expect(meadow.getAttribute('data-birthday')).toBe('1990-07-15'));
  });
});
