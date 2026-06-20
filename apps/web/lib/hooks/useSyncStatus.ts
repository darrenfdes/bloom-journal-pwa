'use client';

import { useEffect, useState } from 'react';

import { getSyncStatus, subscribeSyncStatus, type SyncStatus } from '@/lib/sync/status';

/**
 * Subscribes to the sync-status pub/sub so pages can read it like any other
 * hook (matching `useAuth` / `usePwaStatus`) instead of wiring a manual
 * `useEffect` subscription. Unsubscribes on unmount.
 */
export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus);
  useEffect(
    () => subscribeSyncStatus(() => setStatus(getSyncStatus())),
    []
  );
  return status;
}
