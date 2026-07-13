import { describe, expect, it } from 'vitest';

import { isAdminOnlyPath } from '@/lib/supabase/middleware';

describe('isAdminOnlyPath', () => {
  it('gates the preview playgrounds', () => {
    expect(isAdminOnlyPath('/preview')).toBe(true);
    expect(isAdminOnlyPath('/preview/meadow')).toBe(true);
  });

  it('leaves the ordinary garden, explore route, and other routes open', () => {
    expect(isAdminOnlyPath('/garden')).toBe(false);
    expect(isAdminOnlyPath('/garden/explore')).toBe(false);
    expect(isAdminOnlyPath('/garden/settings')).toBe(false);
    expect(isAdminOnlyPath('/')).toBe(false);
    expect(isAdminOnlyPath('/write')).toBe(false);
  });
});
