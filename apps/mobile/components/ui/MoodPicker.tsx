import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { MOODS } from '@/lib/constants/moods';
import { fonts, palette } from '@/lib/theme';
import type { Mood } from '@/lib/types';

type Props = {
  value: Mood | null;
  onChange: (mood: Mood | null) => void;
};

export function MoodPicker({ value, onChange }: Props) {
  return (
    <View>
      <Text style={styles.label}>Mood (optional)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {MOODS.map((m) => {
          const selected = value === m.id;
          return (
            <Pressable
              key={m.id}
              onPress={() => onChange(selected ? null : m.id)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={styles.emoji}>{m.emoji}</Text>
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.inkMuted,
    marginBottom: 10,
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: palette.whiteWash,
    borderWidth: 1,
    borderColor: palette.parchment,
  },
  chipSelected: {
    backgroundColor: palette.blush,
    borderColor: palette.sage,
  },
  emoji: {
    fontSize: 16,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
  chipTextSelected: {
    color: palette.ink,
  },
});
