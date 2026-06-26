import { afterEach, describe, expect, it, vi } from 'vitest';

import { getLastSeenReleaseVersion, setLastSeenReleaseVersion } from './seen';

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe('release-notes seen flag', () => {
  it('returns null when nothing has been stored', () => {
    expect(getLastSeenReleaseVersion()).toBeNull();
  });

  it('round-trips the stored version', () => {
    setLastSeenReleaseVersion('0.2.0');
    expect(getLastSeenReleaseVersion()).toBe('0.2.0');
  });

  it('returns null when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(getLastSeenReleaseVersion()).toBeNull();
  });

  it('does not throw when localStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => setLastSeenReleaseVersion('0.2.0')).not.toThrow();
  });
});
