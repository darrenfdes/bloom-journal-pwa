import type { MemoryReplayDismiss } from '@bloom/core/garden/memory-replay';

const STORAGE_KEY = 'bloom.memoryReplay.dismiss';

export function readMemoryReplayDismiss(): MemoryReplayDismiss | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemoryReplayDismiss;
    if (parsed?.date && parsed?.entryId) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeMemoryReplayDismiss(dismiss: MemoryReplayDismiss): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(dismiss));
}
