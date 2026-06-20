import { describe, expect, it } from 'vitest';

import { resolvePumpkinTrigger } from '../../src/flowers/genome';

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
