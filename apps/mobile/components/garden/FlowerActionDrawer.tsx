import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { FlowerSvg } from '@/components/flower/FlowerSvg';
import { MOODS } from '@/lib/constants/moods';
import type { EntryRecord } from '@bloom/core';
import { toggleFavourite } from '@/lib/db/repositories/entries';
import { useBloomStore } from '@/stores/useBloomStore';
import { palette } from '@/lib/theme';

type Props = {
  entry: EntryRecord | null;
  monthKey?: string;
  onClose: () => void;
  onFilterMood: (mood: string) => void;
  onFilterMonth: (year: number, month: number) => void;
};

export function FlowerActionDrawer({
  entry,
  monthKey,
  onClose,
  onFilterMood,
  onFilterMonth,
}: Props) {
  const router = useRouter();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const [optimisticFav, setOptimisticFav] = useState<boolean>(false);

  useEffect(() => {
    if (entry) {
      setOptimisticFav(entry.isFavourited);
    }
  }, [entry]);

  const handleToggleFavourite = async () => {
    if (!entry) return;
    setOptimisticFav(!optimisticFav);
    await toggleFavourite(entry.id);
    await refreshEntries();
  };

  const handleFilterMonth = () => {
    if (!monthKey) return;
    const [year, month] = monthKey.split('-').map(Number);
    if (year && month) {
      onFilterMonth(year, month);
    }
  };

  const handleRead = () => {
    if (!entry) return;
    onClose();
    router.push(`/entry/${entry.id}`);
  };

  const handleRevisit = () => {
    if (!entry) return;
    onClose();
    router.push(`/revisit/${entry.id}`);
  };

  if (!entry) return null;

  const mood = MOODS.find((m) => m.id === entry.mood);
  const moodLabel = mood ? `${mood.emoji} ${mood.label}` : '';

  return (
    <Modal
      visible={!!entry}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.drawer}>
          <View style={styles.dragHandle} />
          
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color={palette.inkMuted} />
          </TouchableOpacity>

          <View style={styles.previewFrame}>
            <FlowerSvg entry={entry} size={110} animateSway={false} />
          </View>

          <Text style={styles.title} numberOfLines={1}>
            {entry.title || 'Untitled Memory'}
          </Text>

          <View style={styles.metaContainer}>
            <Text style={styles.date}>
              {new Date(entry.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.dot}>•</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{moodLabel}</Text>
            </View>
          </View>

          {!!entry.content && (
            <Text style={styles.excerpt} numberOfLines={2}>
              "{entry.content}"
            </Text>
          )}

          <View style={styles.actionsBlock}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleRead}>
              <Feather name="book-open" size={18} color={palette.cream} style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>Read full memory</Text>
            </TouchableOpacity>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.secondaryBtn, optimisticFav && styles.favBtnActive]}
                onPress={handleToggleFavourite}
              >
                <Feather
                  name="star"
                  size={16}
                  color={optimisticFav ? '#f59e0b' : palette.inkSoft}
                  style={styles.btnIcon}
                />
                <Text style={[styles.secondaryBtnText, optimisticFav && styles.favTextActive]}>
                  {optimisticFav ? 'Favourited' : 'Favourite'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={handleRevisit}>
                <Feather name="rotate-ccw" size={16} color={palette.inkSoft} style={styles.btnIcon} />
                <Text style={styles.secondaryBtnText}>Revisit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              {entry.mood && (
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={() => {
                    onClose();
                    onFilterMood(entry.mood!);
                  }}
                >
                  <Feather name="filter" size={14} color={palette.inkSoft} style={styles.btnIcon} />
                  <Text style={styles.filterBtnText}>Filter Mood</Text>
                </TouchableOpacity>
              )}
              {monthKey && (
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={() => {
                    onClose();
                    handleFilterMonth();
                  }}
                >
                  <Feather name="filter" size={14} color={palette.inkSoft} style={styles.btnIcon} />
                  <Text style={styles.filterBtnText}>Filter Month</Text>
                </TouchableOpacity>
              )}
            </View>
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
    alignItems: 'center',
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
    marginBottom: 20,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    top: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(237, 228, 214, 0.5)',
  },
  previewFrame: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1,
    borderColor: palette.parchment,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: 'CormorantGaramond_600SemiBold',
    fontSize: 24,
    color: palette.ink,
    textAlign: 'center',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  date: {
    fontFamily: 'Nunito_500Medium',
    fontSize: 14,
    color: palette.inkMuted,
  },
  dot: {
    color: palette.parchment,
    fontSize: 14,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: palette.ink,
  },
  excerpt: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: palette.inkSoft,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
  actionsBlock: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: palette.sage,
    borderRadius: 16,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    color: palette.cream,
    fontSize: 16,
  },
  secondaryBtn: {
    flex: 1,
    borderRadius: 16,
    height: 48,
    borderWidth: 1,
    borderColor: palette.parchment,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    color: palette.inkSoft,
    fontSize: 14,
  },
  filterBtn: {
    flex: 1,
    borderRadius: 12,
    height: 40,
    backgroundColor: 'rgba(237, 228, 214, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnText: {
    fontFamily: 'Nunito_500Medium',
    color: palette.inkSoft,
    fontSize: 12,
  },
  btnIcon: {
    marginRight: 8,
  },
  favBtnActive: {
    backgroundColor: 'rgba(253, 230, 138, 0.5)',
    borderColor: 'rgba(253, 230, 138, 0.8)',
  },
  favTextActive: {
    color: '#b45309',
  },
});
