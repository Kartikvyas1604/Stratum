// ─────────────────────────────────────────────────────────────────────────────
// Design System — Colors
// Palette: Deep Dark / Surface / Brand Orange / Off-White
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // ── Primaries ──────────────────────────────────────────────────────────────
  deepDark: '#222831',        // primary background
  surface: '#393E46',         // cards, inputs, bottom sheet
  brandOrange: '#FD7014',     // primary accent, CTAs, highlights
  offWhite: '#EEEEEE',        // primary text, icons

  // ── Surface Elevations ────────────────────────────────────────────────────
  surfaceElevated: '#42484F', // cards sitting on top of surface
  surfaceLow: '#2E3238',      // gradient endpoint, recessed areas

  // ── Orange Tints (8-digit hex = RRGGBBAA) ──────────────────────────────────
  orangeDim: '#FD701420',     // 12 % opacity — glows, tags, bg tints
  orangeMid: '#FD701440',     // 25 % opacity — pressed states
  orangeStrong: '#FD701480',  // 50 % opacity — borders on dark surfaces
  orangeGlow: '#FD70144D',    // 30 % opacity — shadow / glow value (for elevation)

  // ── Off-White Tints ────────────────────────────────────────────────────────
  textMuted: '#EEEEEE99',     // 60 % opacity — secondary body text
  textFaint: '#EEEEEE40',     // 25 % opacity — placeholders, dividers
  borderFaint: '#EEEEEE08',   // 3  % opacity — ultra-subtle dividers
  borderSubtle: '#EEEEEE10',  // 6  % opacity — card borders, separators
  borderMid: '#EEEEEE20',     // 12 % opacity — inputs, stronger borders

  // ── Semantic ────────────────────────────────────────────────────────────────
  success: '#00D68F',
  successDim: '#00D68F20',
  error: '#FF4757',
  errorDim: '#FF475720',
  warning: '#FFB300',
  warningDim: '#FFB30020',

  // ── Utility ─────────────────────────────────────────────────────────────────
  transparent: 'transparent' as const,
  black: '#000000',
  white: '#FFFFFF',
  overlay: '#00000099',       // modal scrim
  overlayLight: '#00000066',  // lighter scrim
} as const;

// ── Shadow Presets ─────────────────────────────────────────────────────────
// React Native shadow objects (iOS) — elevation used for Android
export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  orangeGlow: {
    shadowColor: Colors.brandOrange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  subtle: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
} as const;

// ── Spacing Scale (8 px base grid) ─────────────────────────────────────────
export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
  '3xl': 64,
} as const;

// ── Border Radius ──────────────────────────────────────────────────────────
export const Radius = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  full: 9999,
} as const;

export type ColorKey = keyof typeof Colors;
