'use client';

import type { User } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { clearDek } from '@/lib/crypto/key-session';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  configured: false,
  refresh: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = Boolean(getSupabaseBrowserClient());
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setUser(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.auth.getUser();
    setUser(data.user ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    let prevUserId: string | null = null;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      // Drop the cached encryption key when the user actually changes (not on token refresh)
      // so a different account never reuses the previous user's key.
      if (nextUserId !== prevUserId) {
        clearDek();
        prevUserId = nextUserId;
      }
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  const value = useMemo(
    () => ({ user, loading, configured, refresh }),
    [user, loading, configured, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
