import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
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
import { TagInput } from '@/components/ui/TagInput';
import { Button } from '@/components/ui/Button';
import { FIRST_OPEN_TAGLINE, JOURNAL_PROMPTS } from '@/lib/constants/prompts';
import { saveWriteDraft } from '@/lib/db/repositories/settings';
import { resolveMood } from '@/lib/sentiment/infer';
import { fonts, palette } from '@/lib/theme';
import { useBloomStore } from '@/stores/useBloomStore';

export default function WriteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const meta = useBloomStore((s) => s.gardenMeta);
  const draft = useBloomStore((s) => s.draft);
  const setDraft = useBloomStore((s) => s.setDraft);
  const setPendingPlant = useBloomStore((s) => s.setPendingPlant);

  const isFirstOpen = !meta?.hasPlantedFirst;
  const prompt = useMemo(
    () => JOURNAL_PROMPTS[Math.floor(Date.now() / 86400000) % JOURNAL_PROMPTS.length],
    []
  );

  const persistDraft = useCallback(async () => {
    await saveWriteDraft(draft);
  }, [draft]);

  useEffect(() => {
    const timer = setTimeout(persistDraft, 600);
    return () => clearTimeout(timer);
  }, [draft, persistDraft]);

  const canPlant = draft.content.trim().length > 0;

  const handlePlant = () => {
    if (!canPlant) return;
    setPendingPlant({ ...draft });
    router.push('/plant-confirm');
  };

  const applyPrompt = () => {
    if (!draft.content.trim()) {
      setDraft({ content: `${prompt}\n\n` });
    }
  };

  const resolved = resolveMood(draft.mood, draft.content);

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        {meta?.hasPlantedFirst ? (
          <Pressable onPress={() => router.replace('/garden')}>
            <Text style={styles.back}>Garden</Text>
          </Pressable>
        ) : (
          <View />
        )}
        <Pressable onPress={() => router.push('/settings')}>
          <Text style={styles.back}>Settings</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hero}>{isFirstOpen ? 'Start your garden' : 'Plant a memory'}</Text>
        {isFirstOpen ? (
          <Text style={styles.tagline}>{FIRST_OPEN_TAGLINE}</Text>
        ) : (
          <Pressable onPress={applyPrompt}>
            <Text style={styles.promptHint}>Prompt: {prompt}</Text>
          </Pressable>
        )}

        <TextInput
          value={draft.title}
          onChangeText={(title) => setDraft({ title })}
          placeholder="Title (optional)"
          placeholderTextColor={palette.inkMuted}
          style={styles.titleInput}
        />

        <TextInput
          value={draft.content}
          onChangeText={(content) => setDraft({ content })}
          placeholder="Write freely..."
          placeholderTextColor={palette.inkMuted}
          style={styles.bodyInput}
          multiline
          textAlignVertical="top"
        />

        <MoodPicker value={draft.mood} onChange={(mood) => setDraft({ mood })} />
        <TagInput tags={draft.tags} onChange={(tags) => setDraft({ tags })} />

        {!draft.mood && draft.content.trim().length > 12 ? (
          <Text style={styles.inferred}>
            Tone inferred: {resolved.mood}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Button label="Plant It" onPress={handlePlant} disabled={!canPlant} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  back: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  hero: {
    fontFamily: fonts.display,
    fontSize: 32,
    color: palette.ink,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.inkMuted,
    fontStyle: 'italic',
    marginBottom: 20,
  },
  promptHint: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.sage,
    marginBottom: 16,
  },
  titleInput: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: palette.ink,
    marginBottom: 12,
    paddingVertical: 4,
  },
  bodyInput: {
    minHeight: 200,
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
  inferred: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
  },
});
