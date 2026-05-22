import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { exportBackup } from '@/lib/export/backup';
import {
  cancelReminders,
  notificationsAvailable,
  scheduleDailyReminder,
} from '@/lib/notifications/reminders';
import { searchEntries } from '@/lib/db/repositories/entries';
import {
  clearPin,
  getOrCreateSettings,
  setPin,
  updateSettings,
} from '@/lib/db/repositories/settings';
import { fonts, palette } from '@/lib/theme';
import type { EntryRecord } from '@/lib/types';
import { useBloomStore } from '@/stores/useBloomStore';

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setUnlocked = useBloomStore((s) => s.setUnlocked);

  const [biometric, setBiometric] = useState(false);
  const [pinEnabled, setPinEnabled] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [reminderHour, setReminderHour] = useState(20);
  const [pinInput, setPinInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<EntryRecord[]>([]);

  useEffect(() => {
    getOrCreateSettings().then((s) => {
      setBiometric(s.biometricLock);
      setPinEnabled(s.pinEnabled);
      setReminder(s.reminderEnabled);
      setReminderHour(s.reminderHour);
    });
  }, []);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchEntries(searchQuery).then(setResults);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const toggleBiometric = async (value: boolean) => {
    setBiometric(value);
    await updateSettings({ biometricLock: value });
    if (!value) setUnlocked(true);
  };

  const savePin = async () => {
    if (pinInput.length < 4) {
      Alert.alert('PIN too short', 'Use at least 4 digits.');
      return;
    }
    await setPin(pinInput);
    setPinEnabled(true);
    setPinInput('');
    Alert.alert('PIN saved', 'App lock is enabled.');
  };

  const toggleReminder = async (value: boolean) => {
    if (value && !notificationsAvailable()) {
      Alert.alert(
        'Reminders need a dev build',
        'Daily reminders are not available in Expo Go. You can still use the app — build a development client when you want notifications.'
      );
      return;
    }
    setReminder(value);
    await updateSettings({ reminderEnabled: value, reminderHour });
    if (value) {
      const scheduled = await scheduleDailyReminder(reminderHour, 0);
      if (!scheduled) {
        setReminder(false);
        await updateSettings({ reminderEnabled: false, reminderHour });
        Alert.alert('Could not schedule', 'Notification permission was denied or unavailable.');
      }
    } else {
      await cancelReminders();
    }
  };

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <Text style={styles.title}>Settings</Text>
      <Text style={styles.section}>Privacy</Text>

      <View style={styles.row}>
        <Text style={styles.label}>Biometric lock</Text>
        <Switch value={biometric} onValueChange={toggleBiometric} />
      </View>

      <View style={styles.row}>
        <Text style={styles.label}>PIN lock</Text>
        <Switch
          value={pinEnabled}
          onValueChange={async (v) => {
            if (!v) {
              await clearPin();
              setPinEnabled(false);
              setUnlocked(true);
            } else {
              setPinEnabled(true);
            }
          }}
        />
      </View>

      {pinEnabled ? (
        <View style={styles.pinBlock}>
          <TextInput
            value={pinInput}
            onChangeText={setPinInput}
            placeholder="Set 4+ digit PIN"
            keyboardType="number-pad"
            secureTextEntry
            style={styles.input}
            placeholderTextColor={palette.inkMuted}
          />
          <Button label="Save PIN" onPress={savePin} variant="secondary" />
        </View>
      ) : null}

      <Text style={styles.section}>Reminders</Text>
      <View style={styles.row}>
        <Text style={styles.label}>Daily reminder</Text>
        <Switch value={reminder} onValueChange={toggleReminder} />
      </View>
      {reminder ? (
        <Text style={styles.hint}>Scheduled for {reminderHour}:00 (off by default in spirit — opt-in)</Text>
      ) : null}

      <Text style={styles.section}>Data</Text>
      <Button label="Export backup (JSON)" onPress={() => exportBackup()} style={styles.btn} />

      <Text style={styles.section}>Flower gallery</Text>
      <Button
        label="Browse bloom designs"
        variant="secondary"
        onPress={() => router.push('/flowers')}
        style={styles.btn}
      />

      <Text style={styles.section}>Search entries</Text>
      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Keyword search..."
        placeholderTextColor={palette.inkMuted}
        style={styles.input}
      />
      {results.map((e) => (
        <Pressable key={e.id} onPress={() => router.push(`/entry/${e.id}`)} style={styles.result}>
          <Text style={styles.resultTitle}>{e.title ?? 'Untitled'}</Text>
          <Text style={styles.resultSnippet} numberOfLines={2}>
            {e.content}
          </Text>
        </Pressable>
      ))}

      <Text style={styles.footerNote}>
        Bloom Journal stores everything locally on your device. No ads. No server reads your words.
      </Text>
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
    marginBottom: 20,
  },
  section: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkMuted,
    marginTop: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: palette.parchment,
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: palette.ink,
  },
  pinBlock: {
    marginTop: 12,
    gap: 10,
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
  hint: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 6,
  },
  btn: {
    marginTop: 8,
  },
  result: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.parchment,
  },
  resultTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: palette.ink,
  },
  resultSnippet: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 4,
  },
  footerNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 32,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
