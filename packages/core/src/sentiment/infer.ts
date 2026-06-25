import type { Mood, Sentiment } from '../types';
import { countMatches, matchesAny } from './text';

/** Moods that text can be inferred into (the eight pickable moods). */
type InferableMood = Exclude<Mood, 'ecstatic'>;

/**
 * Phrases that escalate an entry into the `ecstatic` mood — the hidden,
 * easter-egg-only mood that powers the pumpkin (see `resolvePumpkinTrigger`).
 * Matched whole-word/phrase and negation-aware via {@link matchesAny}. `!!!`
 * is intentionally NOT in this list: it only counts toward the pumpkin once a
 * keyword already made the entry read happy (so "so stressed!!!" stays anxious).
 */
export const ECSTATIC_KEYWORDS = [
  'extremely happy',
  'really happy',
  'so excited',
  'so happy',
  'ecstatic',
  'thrilled',
  'elated',
  'overjoyed',
  'over the moon',
  'on cloud nine',
];

const TRIPLE_BANG = /!{3,}/;

/** Keyword-only ecstatic detection (negation-aware), excluding bare `!!!`. */
export function matchesEcstaticKeywords(content: string): boolean {
  return matchesAny(content, ECSTATIC_KEYWORDS);
}

/** Ecstatic by keyword OR `!!!`. Used by the pumpkin trigger. */
export function matchesEcstaticContent(content: string): boolean {
  return TRIPLE_BANG.test(content) || matchesEcstaticKeywords(content);
}

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
  hopeful: [
    'hopeful', 'hope', 'hoping', 'optimistic', 'optimism', 'looking forward', 'better days',
    'things will',
  ],
  excited: [
    'excited', 'excitement', "can't wait", 'cannot wait', 'looking forward to', 'stoked',
  ],
  content: [
    'content', 'contented', 'satisfied', 'satisfying', 'fulfilled', 'at peace with',
  ],
  apathetic: [
    'apathetic', 'apathy', "don't care", "can't be bothered", 'whatever', 'meh', 'no interest',
  ],
  numb: [
    'numb', 'numbness', 'blank', 'hollow', 'detached', 'feel nothing', 'nothing matters',
    'going through the motions',
  ],
  indifferent: [
    'indifferent', 'indifference', 'no preference', 'either way', 'take it or leave it', 'unmoved',
  ],
  drained: [
    'drained', 'exhausted', 'exhaustion', 'no energy', 'low energy', 'depleted', 'worn out',
    'worn down', 'spent', 'fatigued', 'fatigue', 'burnt out', 'burned out', 'running on empty',
  ],
  unmotivated: [
    'unmotivated', 'no motivation', 'listless', 'sluggish', 'lethargic', 'lethargy',
    "can't get started", 'procrastinating', 'no drive',
  ],
  irritated: [
    'irritated', 'irritable', 'irritating', 'annoyed', 'annoying', 'frustrated', 'frustrating',
    'frustration', 'angry', 'anger', 'mad', 'grumpy', 'agitated', 'fed up', 'on edge',
  ],
  overwhelmed: [
    'overwhelmed', 'overwhelming', 'too much', 'swamped', 'buried', 'drowning', 'spread thin',
    "can't cope", "can't keep up",
  ],
  lonely: [
    'lonely', 'loneliness', 'alone', 'isolated', 'isolation', 'left out', 'on my own',
  ],
  guilty: [
    'guilty', 'guilt', 'ashamed', 'shame', 'regret', 'regretful', 'remorse', 'remorseful',
    'my fault', 'blame myself',
  ],
};

/**
 * Tie-break order when two moods score equally, and the full set of moods text
 * can be inferred into — a mood absent here is never inferred. More specific
 * moods win over the broad joyful/peaceful defaults; peaceful is also the
 * no-signal fallback. Must list every {@link InferableMood}.
 */
const MOOD_PRIORITY: InferableMood[] = [
  'guilty',
  'irritated',
  'overwhelmed',
  'lonely',
  'drained',
  'unmotivated',
  'apathetic',
  'numb',
  'indifferent',
  'anxious',
  'melancholy',
  'loved',
  'grateful',
  'hopeful',
  'excited',
  'content',
  'energized',
  'dreamy',
  'joyful',
  'peaceful',
];

const NEGATIVE_MOODS = new Set<Mood>([
  'melancholy',
  'anxious',
  'irritated',
  'overwhelmed',
  'lonely',
  'guilty',
  'drained',
  'unmotivated',
  // Flat/low moods read closer to negative than positive in the coarse
  // positive/negative/neutral model (a matched mood can't resolve to neutral).
  'apathetic',
  'numb',
  'indifferent',
]);

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
  if (matchesEcstaticKeywords(text)) return 'ecstatic';
  return topMood(text).mood;
}

export function inferSentiment(text: string): Sentiment {
  if (matchesEcstaticKeywords(text)) return 'positive';
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
  if (matchesEcstaticKeywords(content)) {
    return { mood: 'ecstatic', inferredSentiment: 'positive' };
  }
  const { mood, score } = topMood(content);
  return { mood, inferredSentiment: moodToSentiment(mood, score > 0) };
}
