import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { fonts, palette } from '@/lib/theme';

type Props = {
  line: string;
  onOpen: () => void;
  onDismiss: () => void;
};

export function MemoryReplayCard({ line, onOpen, onDismiss }: Props) {
  return (
    <View style={styles.wrap} accessibilityRole="summary" accessibilityLabel={line}>
      <Text style={styles.kicker}>🌷 This day in your garden</Text>
      <Pressable onPress={onOpen} accessibilityRole="button">
        <Text style={styles.line}>{line}</Text>
      </Pressable>
      <Pressable
        onPress={onDismiss}
        hitSlop={12}
        style={styles.dismissBtn}
        accessibilityLabel="Dismiss memory for today"
        accessibilityRole="button"
      >
        <Feather name="x" size={18} color={palette.inkMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    width: '92%',
    maxWidth: 560,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingRight: 40,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  kicker: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: palette.sage,
    marginBottom: 4,
  },
  line: {
    fontFamily: fonts.display,
    fontSize: 14,
    lineHeight: 20,
    color: palette.inkSoft,
  },
  dismissBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 6,
  },
});
