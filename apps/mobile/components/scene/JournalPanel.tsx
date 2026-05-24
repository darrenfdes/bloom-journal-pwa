import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { TimePhase, WeatherCategory } from '@bloom/core/scene';
import {
  formatCoordsFallback,
  getSeasonPlaceholder,
  isNightPhase,
  weatherCategoryLabel,
} from '@bloom/core/scene';

import { plantEntry, type PlantSceneSnapshot } from '@/lib/db/repositories/entries';
import { getOrCreateGardenMeta } from '@/lib/db/repositories/garden';
import { useSceneContext } from '@/lib/scene/SceneContext';
import { fonts, palette } from '@/lib/theme';
import { useBloomStore } from '@/stores/useBloomStore';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function isDarkJournalScene(timePhase: TimePhase, category?: WeatherCategory): boolean {
  if (isNightPhase(timePhase) || timePhase === 'dusk') return true;
  return category === 'rain' || category === 'heavy_rain' || category === 'thunderstorm' || category === 'overcast';
}

export function JournalPanel({ visible, onClose }: Props) {
  const scene = useSceneContext();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const refreshEntries = useBloomStore((s) => s.refreshEntries);
  const setGardenMeta = useBloomStore((s) => s.setGardenMeta);
  const entries = useBloomStore((s) => s.entries);

  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [confirmBloom, setConfirmBloom] = useState(false);

  const { width, height } = Dimensions.get('window');
  const dark = isDarkJournalScene(scene.timePhase, scene.weather?.category);
  const placeholder = getSeasonPlaceholder(scene.season);
  const locationLabel =
    scene.locationName ??
    (scene.weather
      ? formatCoordsFallback(scene.weather.coords.lat, scene.weather.coords.lon)
      : 'Your meadow');
  const weatherLabel = scene.weather
    ? `${weatherCategoryLabel(scene.weather.category)} · ${Math.round(scene.weather.temperature)}°C`
    : '—';

  useEffect(() => {
    if (!visible) setShowPast(false);
  }, [visible]);

  const handleSave = async () => {
    const trimmed = text.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const snapshot: PlantSceneSnapshot | undefined = scene.weather
        ? {
            weather: scene.weather,
            timePhase: scene.timePhase,
            sceneSeason: scene.season,
          }
        : undefined;
      await plantEntry(
        { title: '', content: trimmed, mood: null, tags: [], createdAtOverride: null, revisitOf: null },
        { width, height },
        snapshot
      );
      const meta = await getOrCreateGardenMeta();
      setGardenMeta(meta);
      await refreshEntries();
      setText('');
      setConfirmBloom(true);
      setTimeout(() => {
        setConfirmBloom(false);
        onClose();
      }, 600);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close journal" />
      <View
        style={[
          styles.sheetWrap,
          { paddingBottom: insets.bottom + 88, width: Math.min(560, width - 32) },
        ]}
        pointerEvents="box-none"
      >
        <View style={[styles.panel, dark && styles.panelDark]}>
          <View style={[styles.badge, dark && styles.badgeDark]}>
            <Text style={[styles.badgeText, dark && styles.badgeTextDark]}>
              {locationLabel} · {weatherLabel}
            </Text>
          </View>

          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={dark ? 'rgba(255,255,255,0.55)' : 'rgba(60,50,40,0.55)'}
            multiline
            autoFocus
            style={[styles.input, dark && styles.inputDark]}
          />

          <View style={styles.actions}>
            <View style={styles.actionLinks}>
              <Pressable onPress={() => setShowPast((v) => !v)}>
                <Text style={[styles.linkText, dark && styles.linkTextDark]}>
                  {showPast ? 'Hide past entries' : 'Past entries'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  onClose();
                  router.push('/write');
                }}
              >
                <Text style={[styles.linkText, dark && styles.linkTextDark]}>Mood & tags →</Text>
              </Pressable>
            </View>
            <View style={styles.actionButtons}>
              <Pressable onPress={onClose} hitSlop={8}>
                <Text style={[styles.cancelText, dark && styles.linkTextDark]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, (!text.trim() || saving) && styles.saveDisabled]}
                onPress={() => void handleSave()}
                disabled={!text.trim() || saving}
              >
                <Text style={styles.saveText}>
                  {saving ? 'Saving…' : `Save${confirmBloom ? ' ✿' : ''}`}
                </Text>
              </Pressable>
            </View>
          </View>

          {showPast ? (
            <ScrollView style={styles.pastList} nestedScrollEnabled>
              {entries.map((e) => (
                <View key={e.id} style={styles.pastItem}>
                  <Text style={[styles.pastMeta, dark && styles.pastMetaDark]}>
                    {format(new Date(e.createdAt), 'MMM d, yyyy')}
                    {e.sceneSeason ? ` · ${e.sceneSeason}` : ''}
                    {e.weather ? ` · ${weatherCategoryLabel(e.weather.category)}` : ''}
                  </Text>
                  <Text style={[styles.pastBody, dark && styles.pastBodyDark]} numberOfLines={2}>
                    {e.content}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  panel: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.88)',
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  panelDark: {
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  badgeDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: palette.ink,
  },
  badgeTextDark: {
    color: '#fff',
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    minHeight: 72,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 12,
    color: palette.ink,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  inputDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  actions: {
    marginTop: 12,
    gap: 10,
  },
  actionLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  linkText: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: palette.inkSoft,
    textDecorationLine: 'underline',
  },
  linkTextDark: {
    color: 'rgba(255,255,255,0.8)',
  },
  cancelText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: palette.inkMuted,
  },
  saveBtn: {
    backgroundColor: palette.sage,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveDisabled: { opacity: 0.5 },
  saveText: {
    fontFamily: fonts.bodySemiBold,
    color: palette.cream,
    fontSize: 14,
  },
  pastList: { maxHeight: 140, marginTop: 12 },
  pastItem: { marginBottom: 10 },
  pastMeta: { fontFamily: fonts.body, fontSize: 11, color: palette.inkMuted },
  pastMetaDark: { color: 'rgba(255,255,255,0.7)' },
  pastBody: { fontFamily: fonts.body, fontSize: 14, color: palette.ink },
  pastBodyDark: { color: '#fff' },
});
