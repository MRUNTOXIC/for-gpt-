// ─── IVANTA PROPERTY — DESIGN TOKENS ────────────────────────────────────────
// Single source of truth for all colors used across the app.
// Dark-first premium palette inspired by the spec.

export const DARK = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  primary:       '#EF554B',   // coral-red
  primaryDark:   '#3A1718',   // deep burgundy
  primaryLight:  '#FF6B61',   // lighter coral for hover
  primaryBg:     '#2A1213',   // subtle tinted surface
  primaryBorder: '#6B2422',   // border for primary-tinted containers

  // ── Secondary ──────────────────────────────────────────────────────────────
  accent:        '#3B82F6',   // blue accent
  accentBg:      '#0F1F3D',
  accentBorder:  '#1E3A5F',

  // ── Backgrounds ────────────────────────────────────────────────────────────
  background:    '#000000',   // true black
  surface:       '#111111',   // card/sheet surface
  surfaceRaised: '#171717',   // elevated surface
  surfaceSunken: '#0A0A0A',   // recessed/input background

  // ── Text ───────────────────────────────────────────────────────────────────
  textPrimary:   '#F5F5F5',   // near-white
  textSecondary: '#A0AEC0',   // muted blue-gray
  textTertiary:  '#7D8FA8',   // subdued blue-gray
  textInverse:   '#000000',

  // ── Borders ────────────────────────────────────────────────────────────────
  border:        '#25344A',   // dark blue-gray
  borderLight:   '#1A2535',   // very subtle separator

  // ── Status / Semantic ──────────────────────────────────────────────────────
  statusApproved: '#22C55E',  // green
  statusPending:  '#F59E0B',  // amber
  statusSold:     '#EF4444',  // red

  // ── Role colors (kept for ThemeColors type compat) ─────────────────────────
  roleBuyer:   '#3B82F6',
  roleBroker:  '#0EA5E9',
  roleBuilder: '#8B5CF6',
  roleAdmin:   '#64748B',

  // ── Overlay / modals ───────────────────────────────────────────────────────
  overlayBg:   'rgba(0,0,0,0.75)',
  drawerBg:    '#111111',

  // ── Header ─────────────────────────────────────────────────────────────────
  headerBg:    '#000000',
  headerText:  '#F5F5F5',
  headerIcon:  '#F5F5F5',

  // ── Nav ────────────────────────────────────────────────────────────────────
  navLabel:     '#7D8FA8',
  navLabelPost: '#22C55E',
  navPostBg:    '#052E16',

  // ── Misc ───────────────────────────────────────────────────────────────────
  statCardBg:   '#111111',
  chipOff:      '#111111',
  chipOffBorder:'#25344A',
  chipOffText:  '#A0AEC0',
  statusBarStyle: 'light' as 'dark' | 'light',
};

// Light theme — kept for theme-switcher compatibility but app defaults to dark
export const LIGHT = {
  primary:       '#C0392B',
  primaryDark:   '#A93226',
  primaryLight:  '#FEF2F2',
  primaryBg:     '#FEF2F2',
  primaryBorder: '#FECACA',

  accent:        '#2563EB',
  accentBg:      '#EFF6FF',
  accentBorder:  '#BFDBFE',

  background:    '#F8FAFC',
  surface:       '#FFFFFF',
  surfaceRaised: '#FFFFFF',
  surfaceSunken: '#F1F5F9',

  textPrimary:   '#0F172A',
  textSecondary: '#475569',
  textTertiary:  '#64748B',
  textInverse:   '#FFFFFF',

  border:        '#E2E8F0',
  borderLight:   '#F1F5F9',

  statusApproved: '#10B981',
  statusPending:  '#F59E0B',
  statusSold:     '#EF4444',

  roleBuyer:   '#2563EB',
  roleBroker:  '#0284C7',
  roleBuilder: '#7C3AED',
  roleAdmin:   '#475569',

  overlayBg:   'rgba(15,23,42,0.45)',
  drawerBg:    '#FFFFFF',

  headerBg:    '#FFFFFF',
  headerText:  '#0F172A',
  headerIcon:  '#0F172A',

  navLabel:     '#475569',
  navLabelPost: '#10B981',
  navPostBg:    '#ECFDF5',

  statCardBg:   '#F8FAFC',
  chipOff:      '#FFFFFF',
  chipOffBorder:'#E2E8F0',
  chipOffText:  '#475569',
  statusBarStyle: 'dark' as 'dark' | 'light',
};

export type ThemeColors = typeof DARK;
