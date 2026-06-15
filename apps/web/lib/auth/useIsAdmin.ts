'use client';

import { useAuth } from '@/components/auth/AuthProvider';

import { isAdminUser } from './admin';

/** Client hook mirroring {@link isAdminUser} against the current auth session. */
export function useIsAdmin(): boolean {
  const { user } = useAuth();
  return isAdminUser(user);
}
