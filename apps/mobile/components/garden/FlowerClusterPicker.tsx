import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { getMood } from '@/lib/constants/moods';
import type { PlacedFlower } from '@bloom/core/garden/layout';
import type { EntryRecord } from '@bloom/core';
import { fonts, palette } from '@/lib/theme';

type Props = {
  candidates: PlacedFlower[];
  onSelect: (entry: EntryRecord, monthKey: string) => void;
  onClose: () => void;
};

export function FlowerClusterPicker({ candidates, onSelect, onClose }: Props) {
  const open = candidates.length > 1;

  if (!open) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.dragHandle} />

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={palette.inkMuted} />
          </TouchableOpacity>

          <Text style={styles.title}>Which memory?</Text>
          <Text style={styles.subtitle}>
            Several blooms overlap here — pick the one you meant.
          </Text>

          <View style={styles.list}>
            {candidates.map(({ entry, monthKey }) => {
              const mood = getMood(entry.mood);
              const moodLabel = mood ? `${mood.emoji} ${mood.label}` : '';
              return (
                <TouchableOpacity
                  key={entry.id}
                  style={styles.row}
                  onPress={() => onSelect(entry, monthKey)}
                  activeOpacity={0.85}
                >
                  <View style={styles.previewFrame}>
                    <FlowerSvg entry={entry} size={44} animateSway={false} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {entry.title || 'Untitled Memory'}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {new Date(entry.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                      {moodLabel ? ` · ${moodLabel}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  drawer: {
    backgroundColor: palette.cream,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 24,
  },
  dragHandle: {
    width: 48,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.parchment,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(237, 228, 214, 0.5)',
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: palette.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: palette.inkMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  list: {
    marginTop: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.parchment,
    backgroundColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewFrame: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.parchment,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 18,
    color: palette.ink,
  },
  rowMeta: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: palette.inkMuted,
    marginTop: 2,
  },
});
