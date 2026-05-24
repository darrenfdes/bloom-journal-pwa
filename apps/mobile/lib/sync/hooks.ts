import { getUser } from '@/lib/auth/session';
import { getSqlite } from '@/lib/db/client';

import { refreshPendingCount, schedulePush } from './engine';

export async function afterLocalMutation(): Promise<void> {
  await refreshPendingCount();
  const user = await getUser();
  if (user) schedulePush(user.id);
}

export async function markEntryPending(entryId: string): Promise<void> {
  const db = getSqlite();
  await db.runAsync(
    'UPDATE entries SET pending_push = 1 WHERE id = ?',
    entryId
  );
  await afterLocalMutation();
}
