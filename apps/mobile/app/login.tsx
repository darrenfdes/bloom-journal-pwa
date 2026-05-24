import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from '@/lib/auth/session';
import { pullForUser } from '@/lib/sync/engine';
import { fonts, palette } from '@/lib/theme';
import { useAuth } from '@/providers/AuthProvider';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);

  if (!isSupabaseConfigured()) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Sign in</Text>
        <Text style={styles.hint}>
          Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable cloud backup.
        </Text>
        <Button label="Back to settings" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const finishSignIn = async (userId: string) => {
    await pullForUser(userId);
    await refresh();
    router.replace('/settings' as never);
  };

  const handleEmail = async () => {
    setBusy(true);
    try {
      const fn = mode === 'signin' ? signInWithPassword : signUpWithPassword;
      const { data, error } = await fn(email.trim(), password);
      if (error) {
        Alert.alert('Sign in failed', error.message);
        return;
      }
      const uid = data.user?.id ?? data.session?.user.id;
      if (uid) await finishSignIn(uid);
      else Alert.alert('Check your email', 'Confirm your account, then sign in.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Google sign in failed', error.message);
        return;
      }
      const { getUser } = await import('@/lib/auth/session');
      const user = await getUser();
      if (user) await finishSignIn(user.id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>{mode === 'signin' ? 'Sign in' : 'Create account'}</Text>
      <Text style={styles.hint}>Back up your garden across devices. Local-first until you upload.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholderTextColor={palette.inkMuted}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholderTextColor={palette.inkMuted}
      />

      <Button
        label={busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
        onPress={() => void handleEmail()}
        disabled={busy || !email || !password}
      />
      <Button
        label="Continue with Google"
        variant="secondary"
        onPress={() => void handleGoogle()}
        disabled={busy}
        style={styles.btn}
      />

      <Pressable onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text style={styles.switch}>
          {mode === 'signin' ? 'New here? Create account' : 'Have an account? Sign in'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.cream,
    paddingHorizontal: 20,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: palette.ink,
    marginBottom: 8,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.whiteWash,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: palette.parchment,
    marginBottom: 10,
  },
  btn: {
    marginTop: 10,
  },
  switch: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.sage,
    textAlign: 'center',
    marginTop: 20,
  },
});
