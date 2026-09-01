import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── 8-POINT SPACING SYSTEM ──────────────────────────────────────────────────
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

// ─── SCREEN PADDING ──────────────────────────────────────────────────────────
export const GUTTER     = 16;  // horizontal screen padding
export const COL_GAP    = 12;  // gap between 2-col grid items

// ─── 2-COLUMN CARD GRID ──────────────────────────────────────────────────────
export const GLOBAL_CARD_WIDTH  = Math.floor((SCREEN_WIDTH - GUTTER * 2 - COL_GAP) / 2);
export const GLOBAL_IMAGE_HEIGHT = Math.floor(GLOBAL_CARD_WIDTH * 0.72); // ~4:3-ish ratio

// ─── TYPOGRAPHY SCALE ────────────────────────────────────────────────────────
export const TYPE = {
  screenTitle:  { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  cardTitle:    { fontSize: 14, fontWeight: '600' as const, letterSpacing: -0.1 },
  bodyMd:       { fontSize: 15, fontWeight: '400' as const },
  bodySm:       { fontSize: 13, fontWeight: '400' as const },
  label:        { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.3 },
  caption:      { fontSize: 11, fontWeight: '500' as const, letterSpacing: 0.2 },
  badge:        { fontSize: 10, fontWeight: '800' as const, letterSpacing: 0.8 },
} as const;

// ─── BORDER RADII ────────────────────────────────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  full: 999,
} as const;

// ─── BOTTOM NAV ───────────────────────────────────────────────────────────────
export const BOTTOM_NAV_HEIGHT = 56; // pt above safe area

// ─── TOUCH TARGETS ───────────────────────────────────────────────────────────
export const MIN_TOUCH = 44;

// ─── MISC ─────────────────────────────────────────────────────────────────────
export const Layout = {
  window:        { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  isSmallDevice: SCREEN_WIDTH < 375,
};
