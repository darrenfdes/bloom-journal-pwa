import { beforeEach, describe, expect, it } from 'vitest';

import { getAmbienceEnabled, setAmbienceEnabled } from '@/lib/garden/explore/ambience-pref';

describe('ambience preference', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to on', () => {
    expect(getAmbienceEnabled()).toBe(true);
  });

  it('persists a mute and an unmute', () => {
    setAmbienceEnabled(false);
    expect(getAmbienceEnabled()).toBe(false);
    setAmbienceEnabled(true);
    expect(getAmbienceEnabled()).toBe(true);
  });

  it('treats stored garbage as the default', () => {
    window.localStorage.setItem('bloom.explore.ambience', 'banana');
    expect(getAmbienceEnabled()).toBe(true);
  });
});
