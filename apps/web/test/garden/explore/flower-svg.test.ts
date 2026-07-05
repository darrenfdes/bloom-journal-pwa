import { describe, expect, it } from 'vitest';

import { buildMeadowLayout } from '@/lib/garden/bloom/layout';
import { buildFlowerSvgString } from '@/lib/garden/explore/flower-svg';
import { entry } from '../../fixtures/entry';

import type { EntryRecord } from '@bloom/core';

const placed = (over: Partial<EntryRecord> = {}) =>
  buildMeadowLayout([entry(over as never)]).entries[0]!;

describe('buildFlowerSvgString', () => {
  it('produces a standalone SVG document sized to the texture', () => {
    const svg = buildFlowerSvgString(placed(), 256);
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
    expect(svg).toContain('width="256"');
    expect(svg).toContain('height="256"');
    expect(svg).toContain('viewBox="0 0 100 140"');
  });

  it("embeds the entry's seed-namespaced gradients", () => {
    const p = placed();
    const svg = buildFlowerSvgString(p, 256);
    expect(svg).toContain(`${p.genome.bloomMood}-${p.genome.seed >>> 0}`);
  });

  it('renders the pumpkin variant for pumpkin genomes', () => {
    const p = placed({ id: 'pk', mood: 'joyful', content: 'Best day ever!!!' });
    expect(p.genome.specialBloom).toBe('pumpkin');
    const svg = buildFlowerSvgString(p, 256);
    expect(svg).toContain(`pumpkin-${p.genome.seed >>> 0}`);
  });

  it('is deterministic across calls', () => {
    const p = placed({ id: 'stable', title: 'Hello' });
    expect(buildFlowerSvgString(p, 192)).toBe(buildFlowerSvgString(p, 192));
  });
});
