import type { Mood, Sentiment } from '../types';
import { countMatches } from './text';

/** Moods that text can be inferred into (the eight pickable moods). */
type InferableMood = Exclude<Mood, 'ecstatic'>;

/**
 * Per-mood keyword lexicon. Matched whole-word (and whole-phrase) and
 * negation-aware via {@link countMatches}, so inflections are listed
 * explicitly rather than relying on substring matching. Keep entries lowercase.
 */
const MOOD_LEXICON: Record<InferableMood, string[]> = {
  joyful: [
    'happy', 'happiness', 'joy', 'joyful', 'glad', 'cheerful', 'delighted', 'delight',
    'fun', 'laugh', 'laughed', 'laughing', 'smile', 'smiled', 'smiling', 'wonderful',
    'great', 'awesome', 'fantastic', 'sunny', 'bright',
  ],
  peaceful: [
    'calm', 'peace', 'peaceful', 'serene', 'serenity', 'relaxed', 'relaxing', 'relax',
    'content', 'contented', 'tranquil', 'quiet', 'still', 'balanced', 'settled', 'rest',
    'restful', 'ease', 'mellow',
  ],
  dreamy: [
    'dream', 'dreaming', 'dreamy', 'imagine', 'imagining', 'wonder', 'wandering', 'wander',
    'nostalgic', 'nostalgia', 'hazy', 'misty', 'whimsical', 'daydream', 'daydreaming',
    'surreal', 'drifting', 'drift',
  ],
  loved: [
    'love', 'loved', 'loving', 'adore', 'adored', 'cherish', 'cherished', 'affection',
    'romance', 'romantic', 'hug', 'hugged', 'kiss', 'kissed', 'beloved', 'dear',
    'sweetheart', 'together', 'connection',
  ],
  melancholy: [
    'sad', 'sadness', 'down', 'blue', 'lonely', 'loneliness', 'grief', 'grieving', 'cry',
    'crying', 'cried', 'tears', 'tearful', 'miss', 'missing', 'loss', 'empty', 'emptiness',
    'heavy', 'somber', 'wistful', 'gloomy', 'heartbroken', 'hurt', 'hurting', 'pain', 'painful',
  ],
  energized: [
    'energized', 'energy', 'energetic', 'excited', 'exciting', 'excitement', 'motivated',
    'motivation', 'pumped', 'alive', 'vibrant', 'bold', 'driven', 'productive', 'accomplished',
    'unstoppable', 'powerful', 'strong',
  ],
  grateful: [
    'grateful', 'gratitude', 'thankful', 'thanks', 'blessed', 'blessing', 'appreciate',
    'appreciated', 'appreciation', 'fortunate', 'lucky', 'gift',
  ],
  anxious: [
    'anxious', 'anxiety', 'worried', 'worry', 'worrying', 'nervous', 'nervousness', 'stressed',
    'stress', 'stressful', 'overwhelmed', 'overwhelming', 'afraid', 'fear', 'fearful', 'scared',
    'panic', 'panicked', 'uneasy', 'tense', 'dread', 'dreading', 'restless', 'apprehensive',
  ],
};

/**
 * Tie-break order when two moods score equally. More specific moods win over
 * the broad joyful/peaceful defaults; peaceful is also the no-signal fallback.
 */
const MOOD_PRIORITY: InferableMood[] = [
  'anxious',
  'melancholy',
  'loved',
  'grateful',
  'energized',
  'dreamy',
  'joyful',
  'peaceful',
];

const NEGATIVE_MOODS = new Set<Mood>(['melancholy', 'anxious']);

/** Highest-scoring mood and its score; ties resolved by {@link MOOD_PRIORITY}. */
function topMood(text: string): { mood: InferableMood; score: number } {
  let mood: InferableMood = 'peaceful';
  let score = 0;
  for (const candidate of MOOD_PRIORITY) {
    const candidateScore = countMatches(text, MOOD_LEXICON[candidate]);
    if (candidateScore > score) {
      score = candidateScore;
      mood = candidate;
    }
  }
  return { mood, score };
}

function moodToSentiment(mood: Mood, hadSignal: boolean): Sentiment {
  if (!hadSignal) return 'neutral';
  return NEGATIVE_MOODS.has(mood) ? 'negative' : 'positive';
}

/** Infer the most fitting mood from entry text. Falls back to `peaceful`. */
export function inferMood(text: string): Mood {
  return topMood(text).mood;
}

export function inferSentiment(text: string): Sentiment {
  const { mood, score } = topMood(text);
  return moodToSentiment(mood, score > 0);
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
  const { mood, score } = topMood(content);
  return { mood, inferredSentiment: moodToSentiment(mood, score > 0) };
}
