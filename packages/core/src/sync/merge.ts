/**
 * Last-write-wins: remote wins when timestamps are equal (server tie-break).
 */
export function shouldApplyRemote(localUpdatedAt: string, remoteUpdatedAt: string): boolean {
  return Date.parse(remoteUpdatedAt) >= Date.parse(localUpdatedAt);
}
