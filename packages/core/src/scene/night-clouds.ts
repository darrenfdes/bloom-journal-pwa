import { SeededRNG } from '../flowers/seeded-rng';

export type NightCloudColor = 'primary' | 'accent';

export type NightCloudSpec = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  opacity: number;
  color: NightCloudColor;
};

const NIGHT_CLOUD_FIELD_SEED = 0x6e16c10d;

export function getNightCloudField(count = 10): NightCloudSpec[] {
  const rng = new SeededRNG(NIGHT_CLOUD_FIELD_SEED);

  return Array.from({ length: count }, (_, id) => {
    const color: NightCloudColor = rng.next() > 0.8 ? 'accent' : 'primary';

    return {
      id,
      left: rng.next() * 88,
      top: 8 + rng.next() * 47,
      width: 60 + rng.next() * 120,
      height: 6 + rng.next() * 8,
      opacity: 0.55 + rng.next() * 0.45,
      color,
    };
  });
}
