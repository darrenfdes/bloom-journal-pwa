import { describe, expect, it } from 'vitest';

import { inferMood, inferSentiment, resolveMood } from '../../src/sentiment/infer';

describe('inferMood — detects all 8 moods', () => {
  it('joyful', () => {
    expect(inferMood('I feel so happy and full of joy today.')).toBe('joyful');
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
