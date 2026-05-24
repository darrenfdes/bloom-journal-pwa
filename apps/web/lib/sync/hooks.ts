import { getUser } from '@/lib/auth/session';
import { getDb } from '@/lib/db/client';

import { refreshPendingCount, schedulePush } from './engine';

export async function markEntryPendingPush(entryId: string): Promise<void> {
  const db = getDb();
  await db.entries.update(entryId, { pendingPush: true });
  await refreshPendingCount();
}

export async function onEntryMutated(entryId: string): Promise<void> {
  await markEntryPendingPush(entryId);
  const user = await getUser();
  if (user) schedulePush(user.id);
}

export async function onMetaMutated(): Promise<void> {
  const user = await getUser();
  if (user) schedulePush(user.id);
}

/** Called after any local write that should sync when signed in. */
export async function afterLocalMutation(): Promise<void> {
  await refreshPendingCount();
  const user = await getUser();
  if (user) schedulePush(user.id);
}
