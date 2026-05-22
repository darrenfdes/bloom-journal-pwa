import React, { useEffect, useState } from 'react';
import {
  CormorantGaramond_600SemiBold,
  CormorantGaramond_600SemiBold_Italic,
} from '@expo-google-fonts/cormorant-garamond';
import {
  Nunito_400Regular,
  Nunito_500Medium,
  Nunito_600SemiBold,
} from '@expo-google-fonts/nunito';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { LockGate } from '@/components/lock/LockGate';
import { getOrCreateSettings } from '@/lib/db/repositories/settings';
import { palette } from '@/lib/theme';
import { DatabaseProvider } from '@/providers/DatabaseProvider';
import { useBloomStore } from '@/stores/useBloomStore';

export { ErrorBoundary } from 'expo-router';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    CormorantGaramond_600SemiBold,
    CormorantGaramond_600SemiBold_Italic,
    Nunito_400Regular,
    Nunito_500Medium,
    Nunito_600SemiBold,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <DatabaseProvider>
      <AppShell />
    </DatabaseProvider>
  );
}

function AppShell() {
  const ready = useBloomStore((s) => s.ready);
  const unlocked = useBloomStore((s) => s.unlocked);
  const [lockSettings, setLockSettings] = useState<{
    biometric: boolean;
    pin: boolean;
  } | null>(null);

  useEffect(() => {
    if (!ready) return;
    getOrCreateSettings().then((s) =>
      setLockSettings({ biometric: s.biometricLock, pin: s.pinEnabled })
    );
  }, [ready]);

  return (
    <View style={styles.root}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.cream },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="write" />
        <Stack.Screen name="garden" />
        <Stack.Screen name="plant-confirm" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="entry/[id]" />
        <Stack.Screen name="revisit/[parentId]" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="flowers" />
      </Stack>

      {ready && lockSettings && !unlocked ? (
        <LockGate
          biometricEnabled={lockSettings.biometric}
          pinEnabled={lockSettings.pin}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.cream,
  },
});
