// ─── DYNAMIC SEARCH TYPES ─────────────────────────────────────────────────────
// Types for the dynamic, database-driven property search filter system.
// 1 Vaar = 9 Sq Ft (standard Gujarati unit)

export type SizeUnit = 'vaar' | 'sqft';

// ─── ACTIVE SEARCH FILTERS ────────────────────────────────────────────────────
// The full filter state maintained in Step 3 of the guided search.

export interface ActiveSearchFilters {
  // Step 1 + 2
  intent: 'buy' | 'rent';
  category: 'residence' | 'commercial' | 'plot';

  // Location — empty array = "All"
  areas: string[];

  // Sub-type — empty array = "All"
  subTypes: string[];

  // Bedrooms (residence only) — empty array = "All"
  bedrooms: string[];

  // Facing — empty array = "All"
  facing: string[];

  // Property size — user enters a target value in their chosen unit
  // Converted to sqft internally before matching, ±10% tolerance applied
  sizeUnit: SizeUnit;
  sizeTarget: number | null;

  // Commercial only — Face/Frontage in Feet, ±10% tolerance
  faceFt: number | null;

  // Residential + Commercial — Carpet Area in Sq Ft, ±10% tolerance
  carpetAreaSqft: number | null;

  // Budget — target mode: user enters one value, ±10% applied
  budgetTarget: number | null;

  // Budget — explicit range mode: user enters min/max, no tolerance
  // If both budgetTarget and budgetMin/Max are set, range mode takes precedence
  budgetMin: number | null;
  budgetMax: number | null;
}

export const DEFAULT_ACTIVE_FILTERS: ActiveSearchFilters = {
  intent: 'buy',
  category: 'residence',
  areas: [],
  subTypes: [],
  bedrooms: [],
  facing: [],
  sizeUnit: 'vaar',
  sizeTarget: null,
  faceFt: null,
  carpetAreaSqft: null,
  budgetTarget: null,
  budgetMin: null,
  budgetMax: null,
};

// ─── DERIVED FILTER OPTIONS ───────────────────────────────────────────────────
// What the filter engine returns after deriving available options from
// the current property dataset. Used to render the dynamic filter UI.

export interface DerivedFilterOptions {
  // Dimension options — derived from current matched property set
  areas: string[];
  subTypes: string[];
  bedrooms: string[];         // empty for commercial/plot
  facingOptions: string[];    // only directions that actually exist in data

  // Size range derived from parseable sqft values in dataset
  sqftRange: { min: number; max: number } | null;

  // Visibility flags — hide filter section when false
  hasAnyFacing: boolean;
  hasAnySqft: boolean;
  hasAnyBedrooms: boolean;
  hasAnySubTypes: boolean;

  // Commercial/residential specific — derived from custom DB fields
  // Will be false until backend adds faceFt / carpetAreaSqft fields
  hasFaceData: boolean;
  hasCarpetAreaData: boolean;

  // Live count of matching properties given current active filters
  propertyCount: number;
}
