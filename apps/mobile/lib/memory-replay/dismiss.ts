import * as SecureStore from 'expo-secure-store';

import type { MemoryReplayDismiss } from '@bloom/core/garden/memory-replay';

const STORAGE_KEY = 'bloom.memoryReplay.dismiss';

export async function readMemoryReplayDismiss(): Promise<MemoryReplayDismiss | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemoryReplayDismiss;
    if (parsed?.date && parsed?.entryId) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function writeMemoryReplayDismiss(dismiss: MemoryReplayDismiss): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(dismiss));
}
