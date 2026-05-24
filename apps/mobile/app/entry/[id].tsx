import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { getMood } from '@/lib/constants/moods';
import {
  getEntry,
  getRevisitChildren,
  softDeleteEntry,
  toggleFavourite,
} from '@/lib/db/repositories/entries';
import { fonts, palette } from '@/lib/theme';
import type { EntryRecord } from '@/lib/types';
import { useBloomStore } from '@/stores/useBloomStore';

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setEntries = useBloomStore((s) => s.setEntries);
  const [entry, setEntry] = useState<EntryRecord | null>(null);
  const [revisits, setRevisits] = useState<EntryRecord[]>([]);

  useEffect(() => {
    if (!id) return;
    getEntry(id).then((e) => {
      setEntry(e);
      if (e) getRevisitChildren(e.id).then(setRevisits);
    });
  }, [id]);

  if (!entry) return null;

  const moodLabel = getMood(entry.mood)?.label ?? entry.mood;

  const onFavourite = async () => {
    const updated = await toggleFavourite(entry.id);
    if (updated) {
      setEntry(updated);
      const all = await import('@/lib/db/repositories/entries').then((m) => m.listEntries());
      setEntries(all);
    }
  };

  const onDelete = () => {
    Alert.alert('Remove from garden?', 'This memory will be softly hidden.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await softDeleteEntry(entry.id);
          const all = await import('@/lib/db/repositories/entries').then((m) => m.listEntries());
          setEntries(all);
          router.replace('/garden');
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top + 12 }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
    >
      <Pressable onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Garden</Text>
      </Pressable>

      <View style={styles.flower}>
        <FlowerSvg entry={entry} size={160} animateSway />
      </View>

      {entry.title ? <Text style={styles.title}>{entry.title}</Text> : null}
      <Text style={styles.date}>
        {new Date(entry.createdAt).toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </Text>
      <Text style={styles.mood}>{moodLabel}</Text>

      <Text style={styles.body}>{entry.content}</Text>

      {entry.tags.length > 0 ? (
        <View style={styles.tags}>
          {entry.tags.map((t) => (
            <Text key={t} style={styles.tag}>
              #{t}
            </Text>
          ))}
        </View>
      ) : null}

      {revisits.length > 0 ? (
        <Text style={styles.revisitNote}>
          {revisits.length} revisit{revisits.length > 1 ? 's' : ''} planted nearby
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Pressable style={styles.actionBtn} onPress={() => router.push(`/revisit/${entry.id}`)}>
          <Text style={styles.actionText}>Revisit</Text>
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onFavourite}>
          <Text style={styles.actionText}>{entry.isFavourited ? '♡ Marked' : '♡ Mark'}</Text>
        </Pressable>
      </View>

      <Pressable onPress={onDelete} style={styles.delete}>
        <Text style={styles.deleteText}>Soft delete</Text>
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
    marginBottom: 12,
  },
  backText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkSoft,
  },
  flower: {
    alignItems: 'center',
    marginVertical: 12,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    color: palette.ink,
    textAlign: 'center',
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  mood: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: palette.sage,
    textAlign: 'center',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 20,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 26,
    color: palette.ink,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tag: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
    backgroundColor: palette.blush,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  revisitNote: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkMuted,
    fontStyle: 'italic',
    marginTop: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: palette.parchment,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  actionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: palette.ink,
  },
  delete: {
    marginTop: 24,
    alignItems: 'center',
  },
  deleteText: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.danger,
  },
});
