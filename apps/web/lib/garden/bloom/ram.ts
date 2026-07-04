import { MOOD_CATEGORIES } from '@bloom/core/constants/moods';
import type { Mood } from '@bloom/core/types';

import { hashString, mulberry32 } from './rng';

/** The shared "Difficult" picker group — the lone ram keeps the user company for these moods. */
const DIFFICULT_MOODS = new Set<Mood>(
  MOOD_CATEGORIES.find((c) => c.id === 'difficult')?.moods ?? [],
);

export const isDifficultMood = (mood: Mood | null | undefined): boolean =>
  mood != null && DIFFICULT_MOODS.has(mood);

/**
 * Probability the lone black ram appears, by priority tier (highest chance wins):
 * a difficult-mood entry → always; else raining → 20%; else night → 10%; else hidden.
 */
export const ramAppearanceChance = ({
  difficult,
  raining,
  night,
}: {
  difficult: boolean;
  raining: boolean;
  night: boolean;
}): number => (difficult ? 1 : raining ? 0.2 : night ? 0.1 : 0);

/**
 * Stable [0,1) roll for a given day + conditions — the same all day, so reopening the app
 * during one rainy day never re-rolls whether the ram is out.
 */
export const ramDayRoll = (dayIso: string, raining: boolean, night: boolean): number =>
  mulberry32(hashString(`ram|${dayIso}|${raining}|${night}`))();
