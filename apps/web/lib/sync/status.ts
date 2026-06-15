export type SyncStatus = {
  lastSyncedAt: string | null;
  pendingChanges: number;
  offline: boolean;
  syncing: boolean;
  lastError: string | null;
};

let status: SyncStatus = {
  lastSyncedAt: null,
  pendingChanges: 0,
  offline: false,
  syncing: false,
  lastError: null,
};

const listeners = new Set<() => void>();

export function getSyncStatus(): SyncStatus {
  return { ...status };
}

export function setSyncStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function subscribeSyncStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
