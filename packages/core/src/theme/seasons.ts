import { palette } from '../theme/colors';

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export function getSeason(month: number): Season {
  if (month === 12 || month <= 2) return 'winter';
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  return 'autumn';
}

export function getSeasonPalette(month: number) {
  const season = getSeason(month);
  switch (season) {
    case 'winter':
      return { sky: palette.skyWinter, ground: palette.groundWinter, season };
    case 'spring':
      return { sky: palette.skySpring, ground: palette.groundSpring, season };
    case 'summer':
      return { sky: palette.skySummer, ground: palette.groundSummer, season };
    case 'autumn':
      return { sky: palette.skyAutumn, ground: palette.groundAutumn, season };
  }
}
