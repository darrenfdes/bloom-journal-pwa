import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Window activity that counts as the user being present. `scroll`/`wheel` are
 * listened to in the capture phase so activity inside scroll containers (e.g.
 * the garden's horizontal pan) still resets the timer.
 */
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel', 'scroll'] as const;
const CAPTURE_EVENTS = new Set(['wheel', 'scroll']);

/**
 * Reports whether the user has been idle (no input) for `timeoutMs`. Used to
 * auto-hide immersive chrome. `wake()` forces the active state and restarts the
 * countdown (e.g. when an explicit affordance is activated). When `enabled` is
 * false the hook stays inert: never idle, no listeners.
 */
export function useIdle(
  timeoutMs: number,
  enabled: boolean
): { idle: boolean; wake: () => void } {
  const [idle, setIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const wake = useCallback(() => {
    setIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIdle(true), timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) {
      setIdle(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    wake();
    const onActivity = () => wake();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true, capture: CAPTURE_EVENTS.has(ev) });
    }

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity, { capture: CAPTURE_EVENTS.has(ev) });
      }
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, wake]);

  return { idle, wake };
}
