import type { User } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { hasLocalOnlyData, uploadLocalGarden } from '@/lib/sync/migrate-local';
import { fonts, palette } from '@/lib/theme';
import { useBloomStore } from '@/stores/useBloomStore';

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
  const configured = isSupabaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(configured);
  const [migrateOpen, setMigrateOpen] = useState(false);
  const [migrateBusy, setMigrateBusy] = useState(false);
  const setEntries = useBloomStore((s) => s.setEntries);

  const refresh = useCallback(async () => {
    const supabase = getSupabaseClient();
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
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    void hasLocalOnlyData().then((hasLocal) => {
      if (hasLocal) setMigrateOpen(true);
    });
  }, [user?.id]);

  const handleUpload = async () => {
    if (!user) return;
    setMigrateBusy(true);
    try {
      await uploadLocalGarden(user.id);
      const { listEntries: list } = await import('@/lib/db/repositories/entries');
      setEntries(await list());
      setMigrateOpen(false);
      Alert.alert('Uploaded', 'Your garden is now backed up to your account.');
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again later.');
    } finally {
      setMigrateBusy(false);
    }
  };

  const value = useMemo(
    () => ({ user, loading, configured, refresh }),
    [user, loading, configured, refresh]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <Modal visible={migrateOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Upload this garden?</Text>
            <Text style={styles.body}>
              You have memories on this device. Upload them to sync across devices?
            </Text>
            <Button
              label={migrateBusy ? 'Uploading…' : 'Upload garden'}
              onPress={() => void handleUpload()}
              disabled={migrateBusy}
            />
            <Pressable onPress={() => setMigrateOpen(false)} style={styles.skip}>
              <Text style={styles.skipText}>Not now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </AuthContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: palette.cream,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: palette.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    lineHeight: 22,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
});
