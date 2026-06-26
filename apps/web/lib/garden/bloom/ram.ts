import { MOOD_CATEGORIES } from '@bloom/core/constants/moods';
import type { Mood } from '@bloom/core/types';

/** The shared "Difficult" picker group — the lone ram keeps the user company for these moods. */
const DIFFICULT_MOODS = new Set<Mood>(
  MOOD_CATEGORIES.find((c) => c.id === 'difficult')?.moods ?? [],
);

export const isDifficultMood = (mood: Mood | null | undefined): boolean =>
  mood != null && DIFFICULT_MOODS.has(mood);

/**
 * Probability the lone black ram appears, by priority tier (highest chance wins):
 * a difficult-mood entry → always; else raining → 50%; else night → 1/7; else hidden.
 */
export const ramAppearanceChance = ({
  difficult,
  raining,
  night,
}: {
  difficult: boolean;
  raining: boolean;
  night: boolean;
}): number => (difficult ? 1 : raining ? 0.5 : night ? 1 / 7 : 0);
