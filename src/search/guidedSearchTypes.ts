// ─── GUIDED SEARCH STATE ──────────────────────────────────────────────────────
// Central state object for the new step-by-step search experience.
// This is separate from the legacy SearchState so existing features are untouched.

export type IntentType = 'buy' | 'rent';
export type CategoryType = 'residence' | 'commercial' | 'plot';

// ─── PLOT SIZE ────────────────────────────────────────────────────────────────

export interface PlotSizeRange {
  /** The values the user actually chose — shown in UI */
  requestedMinAcres: number | null;
  requestedMaxAcres: number | null;
  /** Expanded range used for actual matching (±tolerance) */
  effectiveMinAcres: number;
  effectiveMaxAcres: number;
}

const PLOT_TOLERANCE_ACRES = 10;

/**
 * Expands a requested [min, max] acres range by PLOT_TOLERANCE_ACRES on each
 * side. The effective minimum is clamped to 0.
 */
export function getEffectiveLandSizeRange(
  minAcres: number | null,
  maxAcres: number | null,
): PlotSizeRange {
  const lo = minAcres ?? 0;
  const hi = maxAcres ?? lo + 10;
  const tolLo = Math.max(0.2, lo * 0.25);
  const tolHi = Math.max(0.5, hi * 0.25);
  return {
    requestedMinAcres: minAcres,
    requestedMaxAcres: maxAcres,
    effectiveMinAcres: Math.max(0, lo - tolLo),
    effectiveMaxAcres: hi + tolHi,
  };
}

/**
 * Ranks a property size against the user's REQUESTED (not effective) range.
 *   0 = inside requested range (best)
 *   1 = within tolerance (good alternative)
 *   2 = outside tolerance (should not appear)
 */
export function plotMatchScore(
  sizeAcres: number,
  range: PlotSizeRange,
): 0 | 1 | 2 {
  const lo = range.requestedMinAcres ?? 0;
  const hi = range.requestedMaxAcres ?? Infinity;
  if (sizeAcres >= lo && sizeAcres <= hi) return 0;
  if (sizeAcres >= range.effectiveMinAcres && sizeAcres <= range.effectiveMaxAcres) return 1;
  return 2;
}

// ─── LAND SIZE UNIT NORMALISATION ─────────────────────────────────────────────
// Converts various size strings to acres for consistent comparison.

const SQFT_PER_ACRE  = 43_560;
const SQM_PER_ACRE   = 4_046.86;
const SQYD_PER_ACRE  = 4_840;
const HA_PER_ACRE    = 0.404_686; // 1 hectare = 2.471 acres → invert: 1 acre = 0.4047 ha
const BIGHA_PER_ACRE = 0.619_8;   // 1 bigha (Gujarat) ≈ 0.62 acres

/**
 * Parses a sqft string like "43560 sqft", "1200 sq ft", "2 acres", "1 ha"
 * and returns the equivalent in acres. Returns null if unparseable.
 */
export function parseSizeToAcres(raw: string | undefined): number | null {
  if (!raw) return null;
  const lower = raw.toLowerCase().replace(/,/g, '');
  const num = parseFloat(lower.match(/[\d.]+/)?.[0] ?? '');
  if (isNaN(num)) return null;

  if (/acre/.test(lower))           return num;
  if (/hectare|ha\b/.test(lower))   return num / HA_PER_ACRE;
  if (/bigha/.test(lower))          return num * BIGHA_PER_ACRE;
  if (/sq\.?\s?yd|sqyd/.test(lower))return num / SQYD_PER_ACRE;
  if (/sq\.?\s?m\b|sqm/.test(lower))return num / SQM_PER_ACRE;
  // Default: assume sqft (most common in Indian real-estate data)
  return num / SQFT_PER_ACRE;
}

// ─── PREDEFINED PLOT SIZE OPTIONS ─────────────────────────────────────────────

export const PLOT_SIZE_OPTIONS = [
  { label: 'Any',          value: null },
  { label: '< 1 Acre',     value: 0.01 },
  { label: '1 Acre',       value: 1 },
  { label: '2 Acres',      value: 2 },
  { label: '5 Acres',      value: 5 },
  { label: '10 Acres',     value: 10 },
  { label: '25 Acres',     value: 25 },
  { label: '50 Acres',     value: 50 },
  { label: '100 Acres',    value: 100 },
  { label: '200 Acres',    value: 200 },
  { label: '500 Acres',    value: 500 },
  { label: '500+ Acres',   value: 999 },
] as const;

// ─── MAIN GUIDED STATE ────────────────────────────────────────────────────────

export interface GuidedSearchState {
  // Step 1
  intent: IntentType;

  // Step 2
  category: CategoryType;

  // Location (shared across all categories)
  city: string;
  area: string;

  // Step 3 — Residence
  residenceSubTypes: string[];  // e.g. ["Apartment", "Villa"]
  bedrooms: string[];           // e.g. ["2 BHK", "3 BHK"]
  budgetMin: number | null;
  budgetMax: number | null;

  // Step 3 — Commercial
  commercialSubTypes: string[]; // e.g. ["Office", "Shop"]

  // Step 3 — Plot
  plotSize: PlotSizeRange | null;
  plotSubTypes: string[];       // e.g. ["Residential Plot", "Agricultural Land"]
}

export const DEFAULT_GUIDED_STATE: GuidedSearchState = {
  intent: 'buy',
  category: 'residence',
  city: '',
  area: '',
  residenceSubTypes: [],
  bedrooms: [],
  budgetMin: null,
  budgetMax: null,
  commercialSubTypes: [],
  plotSize: null,
  plotSubTypes: [],
};

// ─── CATEGORY CONFIGS ─────────────────────────────────────────────────────────

export const RESIDENCE_SUBTYPES = [
  'Apartment', 'Flat / Apartment', 'Independent House',
  'Villa', 'Penthouse', 'Builder Floor', 'Studio', 'Row House',
];

export const COMMERCIAL_SUBTYPES = [
  'Office', 'Shop', 'Showroom', 'Warehouse',
  'Hospital', 'Hotel', 'Industrial Plot',
];

export const PLOT_SUBTYPES = [
  'Residential Plot', 'Agricultural Land',
  'Commercial Plot', 'Industrial Plot', 'Farm Land',
];

export const BED_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK', 'Studio'];

// ─── DISPLAY HELPERS ──────────────────────────────────────────────────────────

export function formatAcres(v: number | null): string {
  if (v === null) return 'Any';
  if (v >= 999) return '500+ Acres';
  if (v < 1) return '< 1 Acre';
  return `${v} Acre${v === 1 ? '' : 's'}`;
}

export function plotSizeLabel(range: PlotSizeRange | null): string {
  if (!range || (range.requestedMinAcres === null && range.requestedMaxAcres === null)) return '';
  const lo = formatAcres(range.requestedMinAcres);
  const hi = formatAcres(range.requestedMaxAcres);
  if (range.requestedMinAcres === range.requestedMaxAcres) return lo;
  return `${lo} – ${hi}`;
}

export function buildGuidedLabel(state: GuidedSearchState): string {
  const parts: string[] = [];
  parts.push(state.intent === 'buy' ? 'Buy' : 'Rent');
  const catMap = { residence: 'Residence', commercial: 'Commercial', plot: 'Plot/Land' };
  parts.push(catMap[state.category]);
  if (state.area)  parts.push(state.area);
  else if (state.city) parts.push(state.city);
  if (state.category === 'residence') {
    if (state.bedrooms.length) parts.push(state.bedrooms.join(', '));
  }
  if (state.category === 'plot' && state.plotSize) {
    parts.push(plotSizeLabel(state.plotSize));
  }
  return parts.join(' · ');
}
