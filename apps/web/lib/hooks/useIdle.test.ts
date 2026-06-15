import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIdle } from './useIdle';

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'];

describe('useIdle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('is not idle before the timeout and idle after it (when enabled)', () => {
    const { result } = renderHook(() => useIdle(2800, true));

    expect(result.current.idle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2799);
    });
    expect(result.current.idle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.idle).toBe(true);
  });

  it('an activity event clears idle and restarts the countdown', () => {
    const { result } = renderHook(() => useIdle(2800, true));

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(result.current.idle).toBe(true);

    act(() => {
      window.dispatchEvent(new Event('pointermove'));
    });
    expect(result.current.idle).toBe(false);

    // countdown restarted from the event, not the original mount
    act(() => {
      vi.advanceTimersByTime(2799);
    });
    expect(result.current.idle).toBe(false);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.idle).toBe(true);
  });

  it('wake() clears idle and restarts the countdown', () => {
    const { result } = renderHook(() => useIdle(2800, true));

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(result.current.idle).toBe(true);

    act(() => {
      result.current.wake();
    });
    expect(result.current.idle).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(result.current.idle).toBe(true);
  });

  it('never goes idle and attaches no activity listeners when disabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { result } = renderHook(() => useIdle(2800, false));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(result.current.idle).toBe(false);

    const activityCalls = addSpy.mock.calls.filter(([type]) =>
      ACTIVITY_EVENTS.includes(type as string)
    );
    expect(activityCalls).toHaveLength(0);
  });

  it('removes its listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useIdle(2800, true));

    unmount();

    const removed = new Set(
      removeSpy.mock.calls
        .map(([type]) => type as string)
        .filter((type) => ACTIVITY_EVENTS.includes(type))
    );
    for (const ev of ACTIVITY_EVENTS) {
      expect(removed.has(ev)).toBe(true);
    }
  });
});
