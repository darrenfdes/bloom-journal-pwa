import { SeededRNG } from '../flowers/seeded-rng';

export type StarKind = 'dim' | 'bright' | 'sparkle';

export type StarSpec = {
  id: number;
  left: number;
  top: number;
  size: number;
  kind: StarKind;
  delay: number;
  duration: number;
  warmth: number;
};

const STAR_FIELD_SEED = 42;

export function getStarField(count = 65): StarSpec[] {
  const rng = new SeededRNG(STAR_FIELD_SEED);

  return Array.from({ length: count }, (_, id) => {
    const roll = rng.next();
    const kind: StarKind = roll > 0.94 ? 'sparkle' : roll > 0.8 ? 'bright' : 'dim';
    const size =
      kind === 'sparkle' ? 2.2 + rng.next() * 0.8 : kind === 'bright' ? 1.4 + rng.next() * 0.8 : 0.8 + rng.next() * 1;

    return {
      id,
      left: rng.next() * 100,
      top: rng.next() * 58,
      size,
      kind,
      delay: rng.next() * 7,
      duration: 2.4 + rng.next() * 4.8,
      warmth: rng.next(),
    };
  });
}
