/** Platform-agnostic typography tokens (CSS-friendly; apps map to loaded fonts). */
export const fontFamilies = {
  display: '"Cormorant Garamond", Georgia, serif',
  displayItalic: '"Cormorant Garamond", Georgia, serif',
  body: 'Nunito, system-ui, sans-serif',
  bodyMedium: 'Nunito, system-ui, sans-serif',
  bodySemiBold: 'Nunito, system-ui, sans-serif',
} as const;

export const textStyles = {
  hero: {
    fontFamily: fontFamilies.display,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 0.3,
  },
  title: {
    fontFamily: fontFamilies.display,
    fontSize: 26,
    lineHeight: 32,
  },
  subtitle: {
    fontFamily: fontFamilies.bodyMedium,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: 500,
  },
  body: {
    fontFamily: fontFamilies.body,
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: fontFamilies.body,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontFamily: fontFamilies.bodySemiBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    fontWeight: 600,
  },
} as const;
