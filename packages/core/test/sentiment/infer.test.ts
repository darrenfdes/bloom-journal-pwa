import { describe, expect, it } from 'vitest';

import { inferMood, inferSentiment, resolveMood } from '../../src/sentiment/infer';

describe('inferMood — detects all 8 moods', () => {
  it('joyful', () => {
    // "happy"/"joy" read joyful; avoid "so happy", which is an ecstatic phrase.
    expect(inferMood('I feel happy and full of joy today.')).toBe('joyful');
  });

  it('peaceful', () => {
    expect(inferMood('A calm, serene afternoon — everything feels relaxed and still.')).toBe(
      'peaceful'
    );
  });

  it('dreamy', () => {
    expect(inferMood('Such a dreamy, nostalgic, whimsical wonder.')).toBe('dreamy');
  });

  it('loved', () => {
    expect(inferMood('I love my partner and feel so cherished and adored.')).toBe('loved');
  });

  it('melancholy', () => {
    expect(inferMood('I feel so sad and lonely, fighting back tears.')).toBe('melancholy');
  });

  it('energized', () => {
    expect(inferMood('I feel energized and motivated, so pumped and alive.')).toBe('energized');
  });

  it('grateful', () => {
    expect(inferMood("I'm so grateful and thankful, truly blessed.")).toBe('grateful');
  });

  it('anxious', () => {
    expect(inferMood('I feel anxious and worried, completely overwhelmed.')).toBe('anxious');
  });
});

describe('inferMood — new feelings', () => {
  it('apathetic', () => {
    expect(inferMood("Honestly I just don't care, whatever, it's all meh.")).toBe('apathetic');
  });

  it('drained', () => {
    expect(inferMood('Completely drained and exhausted, running on empty.')).toBe('drained');
  });

  it('unmotivated', () => {
    expect(inferMood("I'm so unmotivated and sluggish, just procrastinating.")).toBe('unmotivated');
  });

  it('irritated', () => {
    expect(inferMood('So annoyed and frustrated, totally fed up and on edge.')).toBe('irritated');
  });

  it('overwhelmed beats anxious when it dominates', () => {
    expect(inferMood("There's just too much, I'm swamped and can't cope.")).toBe('overwhelmed');
  });

  it('hopeful', () => {
    expect(inferMood('Feeling hopeful and optimistic, looking forward to better days.')).toBe(
      'hopeful'
    );
  });

  it('guilty', () => {
    expect(inferMood('I feel so guilty and ashamed, it was my fault.')).toBe('guilty');
  });

  it('angry', () => {
    expect(inferMood('I am so angry and furious, absolutely livid right now.')).toBe('angry');
  });

  it('jealous', () => {
    expect(inferMood('I feel jealous and envious of their success.')).toBe('jealous');
  });

  it('cribby only matches the literal word "cribby" (no assumed synonyms)', () => {
    expect(inferMood('I am feeling cribby today.')).toBe('cribby');
    expect(inferMood('I feel grumpy and irritable today.')).not.toBe('cribby');
  });

  it('angry text no longer infers irritated (regression)', () => {
    expect(inferMood('I am so angry and mad right now.')).not.toBe('irritated');
  });
});

describe('inferMood — negation', () => {
  it('"not happy" does not read as joyful', () => {
    expect(inferMood('I am not happy today.')).not.toBe('joyful');
  });

  it('negation does not cross a clause boundary', () => {
    expect(inferMood('I am not sad, just happy.')).toBe('joyful');
  });
});

describe('inferSentiment — whole-word matching kills substring false positives', () => {
  it('"discontent" is not positive (must not match "content")', () => {
    expect(inferSentiment('I felt a vague discontent.')).not.toBe('positive');
  });

  it('"painless" is not negative (must not match "pain")', () => {
    expect(inferSentiment('The procedure was completely painless.')).not.toBe('negative');
  });

  it('"hopeless" is not positive', () => {
    expect(inferSentiment('I feel hopeless about the future.')).not.toBe('positive');
  });

  it('"clover" does not read as loved (must not match "love")', () => {
    expect(inferMood('She pressed a four-leaf clover in her book.')).not.toBe('loved');
  });
});

describe('inferSentiment — still returns a coarse Sentiment', () => {
  it('positive', () => {
    expect(inferSentiment('I feel so happy and full of joy today.')).toBe('positive');
  });

  it('negative', () => {
    expect(inferSentiment('I feel so sad and lonely, fighting back tears.')).toBe('negative');
  });

  it('neutral when there is no signal', () => {
    expect(inferSentiment('The meeting is scheduled for noon.')).toBe('neutral');
  });
});

describe('resolveMood', () => {
  it('explicit mood passes through with inferredSentiment null', () => {
    expect(resolveMood('anxious', 'I feel so happy and joyful')).toEqual({
      mood: 'anxious',
      inferredSentiment: null,
    });
  });

  it('no-signal content falls back to peaceful + neutral', () => {
    expect(resolveMood(null, 'The meeting is scheduled for noon.')).toEqual({
      mood: 'peaceful',
      inferredSentiment: 'neutral',
    });
  });

  it('infers a rich mood and matching sentiment from content', () => {
    expect(resolveMood(null, "I'm so grateful and thankful, truly blessed.")).toEqual({
      mood: 'grateful',
      inferredSentiment: 'positive',
    });
  });
});

describe('inferMood — ecstatic escalation (powers the pumpkin)', () => {
  it.each([
    'I am extremely happy today',
    'I am really happy right now',
    'I am so excited for this',
    'I feel absolutely ecstatic',
    'Honestly thrilled about it',
    'I was elated all evening',
    'Completely overjoyed',
    'Absolutely over the moon tonight',
    'I am on cloud nine',
  ])('escalates "%s" to ecstatic', (text) => {
    expect(inferMood(text)).toBe('ecstatic');
  });

  it('negation blocks escalation ("not really happy")', () => {
    expect(inferMood('I am not really happy today')).not.toBe('ecstatic');
  });

  it('bare "!!!" does not escalate a negative entry', () => {
    expect(inferMood('I am so stressed!!!')).toBe('anxious');
  });

  it('bare "!!!" without a happy keyword does not escalate', () => {
    expect(inferMood('Today was wild!!!')).not.toBe('ecstatic');
  });

  it('resolveMood returns ecstatic + positive for an ecstatic keyword', () => {
    expect(resolveMood(null, 'I am really happy')).toEqual({
      mood: 'ecstatic',
      inferredSentiment: 'positive',
    });
  });

  it('explicit mood still wins over ecstatic content', () => {
    expect(resolveMood('peaceful', 'I am really happy')).toEqual({
      mood: 'peaceful',
      inferredSentiment: null,
    });
  });
});
