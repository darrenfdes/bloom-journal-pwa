let lastSyncedAt: string | null = null;
let pendingCount = 0;

const STORAGE_KEY = 'bloom-last-synced-at';

export function getLastSyncedAt(): string | null {
  if (lastSyncedAt) return lastSyncedAt;
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY);
}

export function setLastSyncedAt(iso: string) {
  lastSyncedAt = iso;
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, iso);
  }
}

export function getPendingCount(): number {
  return pendingCount;
}

export function setPendingCount(count: number) {
  pendingCount = count;
}
