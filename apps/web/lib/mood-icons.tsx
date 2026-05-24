import type { LucideIcon } from 'lucide-react';
import {
  Cloud,
  CloudFog,
  CloudRain,
  Flame,
  HandHeart,
  Heart,
  Leaf,
  Sparkles,
  Sun,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Mood } from '@bloom/core';

const MOOD_ICONS: Record<Mood, LucideIcon> = {
  joyful: Sun,
  peaceful: Leaf,
  dreamy: Cloud,
  loved: Heart,
  melancholy: CloudRain,
  energized: Flame,
  grateful: HandHeart,
  anxious: CloudFog,
  ecstatic: Sparkles,
};

type MoodIconProps = {
  mood: Mood;
  className?: string;
};

export function MoodIcon({ mood, className }: MoodIconProps) {
  const Icon = MOOD_ICONS[mood];
  return <Icon className={cn('size-4 shrink-0', className)} strokeWidth={2} aria-hidden />;
}
