// ─────────────────────────────────────────────────────────────────────────────
// Design System — Typography
//
// Fonts used:
//   Inter       — primary UI font    (weights 300–800)
//   Space Mono  — monospace/code     (weights 400, 700)
//   Syne        — display headlines  (weights 700, 800)
//
// To register custom fonts in bare React Native:
//   1. Copy .ttf files to:
//        android/app/src/main/assets/fonts/
//   2. Run: npx react-native-asset   (or manually link for iOS)
//   3. Rebuild the native app
//
// Required font files (download from Google Fonts):
//   Inter-Light.ttf          Inter-Regular.ttf     Inter-Medium.ttf
//   Inter-SemiBold.ttf       Inter-Bold.ttf        Inter-ExtraBold.ttf
//   SpaceMono-Regular.ttf    SpaceMono-Bold.ttf
//   Syne-Bold.ttf            Syne-ExtraBold.ttf
// ─────────────────────────────────────────────────────────────────────────────

import { TextStyle } from 'react-native';

// ── Font Family Constants ──────────────────────────────────────────────────
export const FontFamily = {
  interLight:      'Inter-Light',
  interRegular:    'Inter-Regular',
  interMedium:     'Inter-Medium',
  interSemiBold:   'Inter-SemiBold',
  interBold:       'Inter-Bold',
  interExtraBold:  'Inter-ExtraBold',

  monoRegular:     'SpaceMono-Regular',
  monoBold:        'SpaceMono-Bold',

  displayBold:     'Syne-Bold',
  displayExtraBold:'Syne-ExtraBold',
} as const;

// ── Font Size Scale ────────────────────────────────────────────────────────
export const FontSize = {
  xs:   10,   // tiny labels, badges
  sm:   12,   // captions, helper text
  base: 14,   // body text
  md:   16,   // medium emphasis
  lg:   18,   // large body / sub-headers
  xl:   22,   // section headers
  '2xl': 28,  // screen titles (Syne 700)
  '3xl': 36,  // balance hero (Syne 800)
  '4xl': 42,  // numpad amount
  '5xl': 48,  // POS amount display
} as const;

// ── Composite Text Style Presets ──────────────────────────────────────────
// Use these in StyleSheet.create() — e.g.  label: { ...Typography.labelSm }

export const Typography = {

  // ── Display (Syne) ────────────────────────────────────────────────────────
  heroBalance: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize:   FontSize['3xl'],
    letterSpacing: -0.5,
  } satisfies TextStyle,

  displayTitle: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize:   FontSize['2xl'],
    letterSpacing: -0.3,
  } satisfies TextStyle,

  displayMd: {
    fontFamily: FontFamily.displayBold,
    fontSize:   FontSize.xl,
  } satisfies TextStyle,

  displaySm: {
    fontFamily: FontFamily.displayBold,
    fontSize:   FontSize.lg,
  } satisfies TextStyle,

  // ── Inter — Headings ──────────────────────────────────────────────────────
  heading1: {
    fontFamily: FontFamily.interBold,
    fontSize:   FontSize.xl,
  } satisfies TextStyle,

  heading2: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.lg,
  } satisfies TextStyle,

  heading3: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.md,
  } satisfies TextStyle,

  // ── Inter — Body ──────────────────────────────────────────────────────────
  bodyLg: {
    fontFamily: FontFamily.interRegular,
    fontSize:   FontSize.md,
    lineHeight: 24,
  } satisfies TextStyle,

  body: {
    fontFamily: FontFamily.interRegular,
    fontSize:   FontSize.base,
    lineHeight: 22,
  } satisfies TextStyle,

  bodySm: {
    fontFamily: FontFamily.interRegular,
    fontSize:   FontSize.sm,
    lineHeight: 18,
  } satisfies TextStyle,

  // ── Inter — Labels ────────────────────────────────────────────────────────
  labelLg: {
    fontFamily: FontFamily.interMedium,
    fontSize:   FontSize.md,
  } satisfies TextStyle,

  label: {
    fontFamily: FontFamily.interMedium,
    fontSize:   FontSize.base,
  } satisfies TextStyle,

  labelSm: {
    fontFamily: FontFamily.interMedium,
    fontSize:   FontSize.sm,
  } satisfies TextStyle,

  labelXs: {
    fontFamily: FontFamily.interMedium,
    fontSize:   FontSize.xs,
    letterSpacing: 0.8,
  } satisfies TextStyle,

  // ── Inter — Semi-Bold ─────────────────────────────────────────────────────
  semiBold: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.base,
  } satisfies TextStyle,

  semiBoldSm: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.sm,
  } satisfies TextStyle,

  // ── Inter — Caption / Overline ────────────────────────────────────────────
  overline: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase' as const,
  } satisfies TextStyle,

  caption: {
    fontFamily: FontFamily.interRegular,
    fontSize:   FontSize.xs,
  } satisfies TextStyle,

  // ── Space Mono (monospace) ────────────────────────────────────────────────
  mono: {
    fontFamily: FontFamily.monoRegular,
    fontSize:   FontSize.base,
    letterSpacing: -0.2,
  } satisfies TextStyle,

  monoSm: {
    fontFamily: FontFamily.monoRegular,
    fontSize:   FontSize.sm,
    letterSpacing: -0.1,
  } satisfies TextStyle,

  monoXs: {
    fontFamily: FontFamily.monoRegular,
    fontSize:   FontSize.xs,
  } satisfies TextStyle,

  monoLg: {
    fontFamily: FontFamily.monoRegular,
    fontSize:   FontSize.lg,
    letterSpacing: -0.3,
  } satisfies TextStyle,

  monoBold: {
    fontFamily: FontFamily.monoBold,
    fontSize:   FontSize.base,
  } satisfies TextStyle,

  // ── Amount / Number inputs ("big" Syne or Space Mono) ─────────────────────
  amountInput: {
    fontFamily: FontFamily.displayExtraBold,
    fontSize:   FontSize['4xl'],
    letterSpacing: -1,
  } satisfies TextStyle,

  amountMd: {
    fontFamily: FontFamily.displayBold,
    fontSize:   FontSize['2xl'],
    letterSpacing: -0.5,
  } satisfies TextStyle,

  amountSm: {
    fontFamily: FontFamily.monoRegular,
    fontSize:   FontSize.sm,
    letterSpacing: -0.1,
  } satisfies TextStyle,

  // ── Buttons ───────────────────────────────────────────────────────────────
  buttonLg: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.md,
    letterSpacing: 0.2,
  } satisfies TextStyle,

  buttonMd: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   FontSize.base,
    letterSpacing: 0.1,
  } satisfies TextStyle,

  buttonSm: {
    fontFamily: FontFamily.interMedium,
    fontSize:   FontSize.sm,
  } satisfies TextStyle,

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabActive: {
    fontFamily: FontFamily.interSemiBold,
    fontSize:   11,
  } satisfies TextStyle,

  tabInactive: {
    fontFamily: FontFamily.interRegular,
    fontSize:   11,
  } satisfies TextStyle,
} as const;

export type TypographyKey = keyof typeof Typography;
