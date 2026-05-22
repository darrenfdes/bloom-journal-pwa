import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import type { MonthCluster } from '@/lib/garden/layout';
import { fonts, palette } from '@/lib/theme';

type Props = {
  clusters: MonthCluster[];
  onJump: (scrollY: number) => void;
};

export function TimelineScrubber({ clusters, onJump }: Props) {
  if (clusters.length < 2) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.wrap}
    >
      {clusters.map((c) => (
        <Pressable
          key={c.monthKey}
          style={styles.chip}
          onPress={() => onJump(Math.max(0, c.groundY - 80))}
        >
          <Text style={styles.chipText}>{c.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    maxHeight: 44,
    marginTop: 8,
    zIndex: 10,
  },
  row: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: palette.whiteWash,
  },
  chipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.inkSoft,
  },
});
