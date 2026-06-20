import { describe, expect, it } from 'vitest';

import { resolvePumpkinTrigger } from '../../src/flowers/genome';
import { resolveMood } from '../../src/sentiment/infer';

// seed 7 (7 % 10 !== 0) isolates the keyword path from the rare random-surprise path.
const trigger = (mood: 'joyful' | 'ecstatic' | 'peaceful', content: string, flowerSeed = 7) =>
  resolvePumpkinTrigger({ mood, content, flowerSeed, id: 'x' });

describe('resolvePumpkinTrigger — ecstatic content detection', () => {
  it('fires on an ecstatic phrase', () => {
    expect(trigger('joyful', 'I am so happy right now')).toBe(true);
  });

  it('fires on three or more exclamation marks', () => {
    expect(trigger('joyful', 'Today was wild!!!')).toBe(true);
  });

  it('does not fire when the ecstatic phrase is negated', () => {
    expect(trigger('joyful', 'I am not so happy today')).toBe(false);
  });

  it('does not fire on a substring of a keyword (related ≠ elated)', () => {
    expect(trigger('joyful', 'This is closely related news')).toBe(false);
  });
});

describe('resolvePumpkinTrigger — unchanged behaviour', () => {
  it('still fires on the rare seed surprise (seed % 10 === 0)', () => {
    expect(trigger('joyful', 'a normal calm day', 10)).toBe(true);
  });

  it('never fires on a non-joyful/ecstatic mood', () => {
    expect(trigger('peaceful', 'so happy!!!', 10)).toBe(false);
  });
});

// The real-world path: mood is inferred from the text, not handed in directly.
// These are the cases that were silently broken before the inference fix.
describe('pumpkin end-to-end (inferred mood)', () => {
  const fires = (content: string, flowerSeed: number) => {
    const { mood } = resolveMood(null, content);
    return resolvePumpkinTrigger({ mood, content, flowerSeed, id: 'x' });
  };

  it('"really happy" always grows a pumpkin (escalates to ecstatic)', () => {
    expect(fires('I am really happy', 7)).toBe(true);
  });

  it('"extremely happy" always grows a pumpkin', () => {
    expect(fires('I am extremely happy', 7)).toBe(true);
  });

  it('a plain happy message grows a pumpkin ~1/10 of the time (seed % 10 === 0)', () => {
    expect(fires('I am happy today', 10)).toBe(true); // 10 % 10 === 0
    expect(fires('I am happy today', 7)).toBe(false); // 7 % 10 !== 0
  });

  it('a neutral message never grows a pumpkin, even on the lucky seed', () => {
    expect(fires('The meeting is scheduled for noon', 10)).toBe(false);
  });
});
