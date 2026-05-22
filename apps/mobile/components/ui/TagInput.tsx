import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { fonts, palette } from '@/lib/theme';

type Props = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

export function TagInput({ tags, onChange }: Props) {
  const [input, setInput] = useState('');

  const addTag = () => {
    const tag = input.trim().toLowerCase();
    if (!tag || tags.includes(tag)) return;
    onChange([...tags, tag]);
    setInput('');
  };

  return (
    <View>
      <Text style={styles.label}>Tags</Text>
      <View style={styles.row}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Add a tag"
          placeholderTextColor={palette.inkMuted}
          style={styles.input}
          onSubmitEditing={addTag}
          returnKeyType="done"
        />
        <Pressable onPress={addTag} style={styles.addBtn}>
          <Text style={styles.addText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.tags}>
        {tags.map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onChange(tags.filter((t) => t !== tag))}
            style={styles.tag}
          >
            <Text style={styles.tagText}>#{tag} ×</Text>
          </Pressable>
        ))}
      </View>
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
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 15,
    color: palette.ink,
    backgroundColor: palette.whiteWash,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: palette.parchment,
  },
  addBtn: {
    width: 44,
    borderRadius: 14,
    backgroundColor: palette.parchment,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 22,
    color: palette.inkSoft,
    marginTop: -2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  tag: {
    backgroundColor: palette.blush,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  tagText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: palette.inkSoft,
  },
});
