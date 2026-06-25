import type { LucideIcon } from 'lucide-react';
import {
  Angry,
  BatteryLow,
  BatteryWarning,
  CircleDashed,
  CircleOff,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  Coffee,
  Flame,
  Frown,
  HandHeart,
  Heart,
  Leaf,
  Meh,
  Sparkles,
  Sprout,
  Sun,
  Zap,
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
  // Positive & up
  hopeful: Sprout,
  excited: Zap,
  // Calm
  content: Coffee,
  // Low / apathetic
  apathetic: Meh,
  numb: CircleOff,
  indifferent: CircleDashed,
  drained: BatteryLow,
  unmotivated: BatteryWarning,
  // Difficult
  irritated: Angry,
  overwhelmed: CloudLightning,
  lonely: CloudMoon,
  guilty: Frown,
};

type MoodIconProps = {
  mood: Mood;
  className?: string;
};

export function MoodIcon({ mood, className }: MoodIconProps) {
  const Icon = MOOD_ICONS[mood];
  return <Icon className={cn('size-4 shrink-0', className)} strokeWidth={2} aria-hidden />;
}
