import * as SecureStore from 'expo-secure-store';

const LAST_SYNC_KEY = 'bloom-last-synced-at';

let pendingCount = 0;

export async function getLastSyncedAt(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_SYNC_KEY);
}

export async function setLastSyncedAt(iso: string) {
  await SecureStore.setItemAsync(LAST_SYNC_KEY, iso);
}

export function getPendingCount(): number {
  return pendingCount;
}

export function setPendingCount(count: number) {
  pendingCount = count;
}
