import type { Mood, Sentiment } from '../types';

const POSITIVE = [
  'happy',
  'grateful',
  'love',
  'joy',
  'peace',
  'calm',
  'hope',
  'wonderful',
  'beautiful',
  'thankful',
  'excited',
  'proud',
  'blessed',
  'smile',
  'laugh',
  'warm',
  'delight',
  'content',
];

const NEGATIVE = [
  'sad',
  'anxious',
  'worried',
  'afraid',
  'angry',
  'lonely',
  'tired',
  'hurt',
  'stress',
  'overwhelmed',
  'grief',
  'cry',
  'fear',
  'pain',
  'doubt',
  'frustrated',
  'numb',
  'empty',
];

export function inferSentiment(text: string): Sentiment {
  const words = text.toLowerCase().split(/\W+/).filter(Boolean);
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (POSITIVE.some((w) => word.includes(w))) positive++;
    if (NEGATIVE.some((w) => word.includes(w))) negative++;
  }

  if (positive > negative && positive > 0) return 'positive';
  if (negative > positive && negative > 0) return 'negative';
  return 'neutral';
}

export function sentimentToMood(sentiment: Sentiment): Mood {
  switch (sentiment) {
    case 'positive':
      return 'joyful';
    case 'negative':
      return 'melancholy';
    default:
      return 'peaceful';
  }
}

export function resolveMood(
  explicitMood: Mood | null,
  content: string
): { mood: Mood; inferredSentiment: Sentiment | null } {
  if (explicitMood) {
    return { mood: explicitMood, inferredSentiment: null };
  }
  const inferredSentiment = inferSentiment(content);
  return { mood: sentimentToMood(inferredSentiment), inferredSentiment };
}
