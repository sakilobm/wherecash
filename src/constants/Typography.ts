import { Platform } from 'react-native';

export const FontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  extraBold: 'Poppins_800ExtraBold',
  interRegular: 'Inter_400Regular',
  interMedium: 'Inter_500Medium',
  interSemiBold: 'Inter_600SemiBold',
  interBold: 'Inter_700Bold',
  // Fallback for web / loading state
  system: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 34,
  '4xl': 40,
  '5xl': 48,
  display: 56,
} as const;

export const LineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
} as const;

export const LetterSpacing = {
  tight: -0.5,
  normal: 0,
  wide: Platform.OS === 'android' ? 0 : 0.5,
  wider: Platform.OS === 'android' ? 0 : 1,
  widest: Platform.OS === 'android' ? 0 : 2,
} as const;

export const Typography = {
  displayLarge: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.display,
    lineHeight: FontSize.display * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  displayMedium: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    lineHeight: FontSize['4xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  headingXL: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: FontSize['3xl'] * LineHeight.snug,
    letterSpacing: LetterSpacing.tight,
  },
  headingLG: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize['2xl'],
    lineHeight: FontSize['2xl'] * LineHeight.snug,
    letterSpacing: LetterSpacing.tight,
  },
  headingMD: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xl,
    lineHeight: FontSize.xl * LineHeight.snug,
  },
  headingSM: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.snug,
  },
  bodyLG: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: FontSize.md * LineHeight.normal,
  },
  bodyMD: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
  },
  bodySM: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
  },
  labelLG: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.snug,
    letterSpacing: LetterSpacing.wide,
  },
  labelMD: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.snug,
    letterSpacing: LetterSpacing.wide,
  },
  labelSM: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * LineHeight.snug,
    letterSpacing: LetterSpacing.wider,
  },
  caption: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    lineHeight: FontSize.xs * LineHeight.normal,
  },
  numeric: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    lineHeight: FontSize['3xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
  numericLG: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    lineHeight: FontSize['4xl'] * LineHeight.tight,
    letterSpacing: LetterSpacing.tight,
  },
} as const;
