import * as LocalAuthentication from 'expo-local-authentication';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { verifyPin } from '@/lib/db/repositories/settings';
import { fonts, palette } from '@/lib/theme';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  biometricEnabled: boolean;
  pinEnabled: boolean;
};

export function LockGate({ biometricEnabled, pinEnabled }: Props) {
  const setUnlocked = useBloomStore((s) => s.setUnlocked);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const tryBiometric = useCallback(async () => {
    if (!biometricEnabled) return;
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !enrolled) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Bloom Journal',
      cancelLabel: 'Cancel',
    });
    if (result.success) setUnlocked(true);
  }, [biometricEnabled, setUnlocked]);

  useEffect(() => {
    tryBiometric();
  }, [tryBiometric]);

  const submitPin = async () => {
    const ok = await verifyPin(pin);
    if (ok) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  return (
    <View style={styles.overlay}>
      <Text style={styles.title}>Your garden is private</Text>
      <Text style={styles.subtitle}>Unlock to continue</Text>

      {biometricEnabled ? (
        <Button label="Use biometrics" onPress={tryBiometric} style={styles.btn} />
      ) : null}

      {pinEnabled ? (
        <>
          <TextInput
            value={pin}
            onChangeText={setPin}
            keyboardType="number-pad"
            secureTextEntry
            placeholder="Enter PIN"
            placeholderTextColor={palette.inkMuted}
            style={styles.input}
            maxLength={8}
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Unlock" onPress={submitPin} style={styles.btn} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: palette.cream,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: palette.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    marginBottom: 24,
  },
  input: {
    width: '100%',
    maxWidth: 280,
    borderWidth: 1,
    borderColor: palette.parchment,
    borderRadius: 14,
    padding: 14,
    fontFamily: fonts.body,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: palette.whiteWash,
  },
  btn: {
    marginTop: 8,
    minWidth: 200,
  },
  error: {
    fontFamily: fonts.body,
    color: palette.danger,
    marginBottom: 8,
  },
});
