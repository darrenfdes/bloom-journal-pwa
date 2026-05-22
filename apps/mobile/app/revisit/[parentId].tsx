import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MoodPicker } from '@/components/ui/MoodPicker';
import { Button } from '@/components/ui/Button';
import { getEntry } from '@/lib/db/repositories/entries';
import { fonts, palette } from '@/lib/theme';
import { useBloomStore } from '@/stores/useBloomStore';

export default function RevisitScreen() {
  const { parentId } = useLocalSearchParams<{ parentId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const draft = useBloomStore((s) => s.draft);
  const setDraft = useBloomStore((s) => s.setDraft);
  const resetDraft = useBloomStore((s) => s.resetDraft);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);
  const [parentTitle, setParentTitle] = useState<string | null>(null);

  useEffect(() => {
    resetDraft({ revisitOf: parentId ?? null, content: '' });
    if (parentId) {
      getEntry(parentId).then((e) => setParentTitle(e?.title ?? 'a past memory'));
    }
  }, [parentId, resetDraft]);

  const canPlant = draft.content.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.hero}>Revisit</Text>
        <Text style={styles.subtitle}>
          Write in response to {parentTitle ?? 'this memory'}. Your new flower will grow beside
          it.
        </Text>

        <TextInput
          value={draft.content}
          onChangeText={(content) => setDraft({ content })}
          placeholder="What would you tell your past self?"
          placeholderTextColor={palette.inkMuted}
          style={styles.body}
          multiline
          textAlignVertical="top"
        />

        <MoodPicker value={draft.mood} onChange={(mood) => setDraft({ mood })} />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button
          label="Plant It"
          disabled={!canPlant}
          onPress={() => {
            setPendingPlant({ ...draft, revisitOf: parentId ?? null });
            router.push('/plant-confirm');
          }}
        />
      </View>
    </KeyboardAvoidingView>
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
  scroll: {
    paddingBottom: 120,
  },
  hero: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: palette.ink,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    marginTop: 8,
    marginBottom: 20,
    lineHeight: 22,
  },
  body: {
    minHeight: 180,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: palette.ink,
    backgroundColor: palette.whiteWash,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.parchment,
    marginBottom: 20,
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
  },
});
