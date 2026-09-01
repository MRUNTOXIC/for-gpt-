// ─── FILTER ENGINE ────────────────────────────────────────────────────────────
// Pure TypeScript — no React imports.
// Database is the source of truth. All filter options are derived from
// the live property dataset. Never use hardcoded filter values.

import type { Property } from '../types/Property';
import type { MobileFilters } from '../filters/types';
import type { ActiveSearchFilters, DerivedFilterOptions } from './dynamicSearchTypes';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SQFT_PER_VAAR = 9;

// ─── UNIT CONVERSION ─────────────────────────────────────────────────────────

export function vaarToSqft(vaar: number): number {
  return vaar * SQFT_PER_VAAR;
}

export function sqftToVaar(sqft: number): number {
  return sqft / SQFT_PER_VAAR;
}

// ─── TOLERANCE ───────────────────────────────────────────────────────────────
// All target-based numeric searches use ±10% tolerance.
// User enters a target value; search range = target × 0.90 → target × 1.10

export function applyTolerance(
  target: number,
  pct = 0.10,
): { min: number; max: number } {
  return {
    min: target * (1 - pct),
    max: target * (1 + pct),
  };
}

// ─── PARSERS ─────────────────────────────────────────────────────────────────

/**
 * Parse a raw sqft string from the database.
 * Handles: "1450", "1600 - 2400" (returns lower bound), "2,500", "—", "-"
 * Returns null if the string is unparseable or represents no data.
 */
export function parsePropertySqft(raw: string | undefined): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === '—' || trimmed === '-' || trimmed === '') return null;

  // Handle range "1600 - 2400" → take lower bound
  const rangeParts = trimmed.split(/\s*[-–]\s*/);
  const candidate = rangeParts[0].replace(/[,\s]/g, '');
  const n = parseFloat(candidate);
  return isNaN(n) || n <= 0 ? null : n;
}

/**
 * Parse a price string from the database.
 * Handles: "65 Lakh", "2.10 Cr", "85,00,000", "16,500/month", "₹50 Lakh"
 * Returns the value in rupees, or null if unparseable.
 */
export function parsePropertyPrice(
  price: string | undefined,
  priceFrom?: string,
): number | null {
  const raw = priceFrom || price;
  if (!raw) return null;
  // Handle ranges like "78 Lakh - 1.10 Cr" → take lower bound
  const lowerBound = raw.split(/\s*[-–]\s*/)[0];
  const clean = lowerBound.replace(/[₹,\s]/g, '').replace(/\/month$/i, '').toLowerCase();
  let mul = 1;
  let num = clean;
  if (clean.includes('cr') || clean.includes('crore')) {
    mul = 10_000_000;
    num = clean.replace(/crore|cr/g, '');
  } else if (clean.includes('lakh') || /\bl\b/.test(clean)) {
    mul = 100_000;
    num = clean.replace(/lakh|l/g, '');
  } else if (clean.includes('k')) {
    mul = 1_000;
    num = clean.replace(/k/g, '');
  }
  const n = parseFloat(num);
  return isNaN(n) ? null : n * mul;
}

// ─── DERIVE FILTER OPTIONS ────────────────────────────────────────────────────
// Extract all available filter values from the current property dataset.
// NEVER hardcode areas, facing directions, sub-types, or bedrooms.

// Keywords that identify commercial-only subtypes
const COMMERCIAL_SUBTYPE_KEYWORDS = [
  'office', 'shop', 'showroom', 'warehouse', 'factory',
  'godown', 'industrial', 'commercial', 'shed', 'studio commercial',
];

// Keywords that identify residential-only subtypes
const RESIDENCE_SUBTYPE_KEYWORDS = [
  'apartment', 'flat', 'villa', 'bungalow', 'tenament', 'row house',
  'duplex', 'penthouse', 'society', 'bhk', 'studio',
];

export function deriveFilterOptions(
  properties: Property[],
  category: string,
): DerivedFilterOptions {
  // Areas
  const areas = [...new Set(properties.map(p => p.area).filter(Boolean))].sort();

  // Sub-types — filter by category to prevent cross-contamination
  const allSubTypes = [...new Set(properties.map(p => p.subType).filter(Boolean))].sort();
  let subTypes: string[];
  if (category === 'residence') {
    // Exclude any subtype that looks commercial
    const filtered = allSubTypes.filter(
      s => !COMMERCIAL_SUBTYPE_KEYWORDS.some(kw => s.toLowerCase().includes(kw))
    );
    // Pin priority types first — but only add them if not already in the filtered list
    const priority = ['Tenament/Bungalow', 'Apartment'];
    // Simpler: unique ordered list with priority first, then rest
    const seen = new Set<string>();
    const ordered: string[] = [];
    // First add priority items (use DB casing if exists, else our label)
    for (const p of priority) {
      const match = filtered.find(s => s.toLowerCase() === p.toLowerCase());
      const label = match ?? p;
      if (!seen.has(label.toLowerCase())) { seen.add(label.toLowerCase()); ordered.push(label); }
    }
    // Then add remaining filtered items not already added
    for (const s of filtered) {
      if (!seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); ordered.push(s); }
    }
    subTypes = ordered;
  } else if (category === 'commercial') {
    // Exclude purely residential subtypes
    subTypes = allSubTypes.filter(
      s => !RESIDENCE_SUBTYPE_KEYWORDS.some(kw => s.toLowerCase().includes(kw))
    );
  } else {
    subTypes = allSubTypes;
  }

  // Bedrooms — flatten beds arrays across all properties
  const bedSet: string[] = [];
  properties.forEach(p => {
    if (Array.isArray(p.beds)) {
      p.beds.forEach(b => { if (b) bedSet.push(b); });
    }
  });
  const bedrooms = [...new Set(bedSet)].sort();

  // Facing — only directions that actually exist in the data
  const facingOptions = [
    ...new Set(
      properties.map(p => p.facing).filter((f): f is string => !!f),
    ),
  ].sort();

  // Sqft range
  const sqftValues = properties
    .map(p => parsePropertySqft(p.sqft))
    .filter((v): v is number => v !== null);
  const sqftRange =
    sqftValues.length > 0
      ? { min: Math.min(...sqftValues), max: Math.max(...sqftValues) }
      : null;

  // Face/Frontage and Carpet Area — optional DB fields not on current schema
  const hasFaceData = properties.some(
    p => (p as any).faceFt != null && (p as any).faceFt > 0,
  );
  const hasCarpetAreaData = properties.some(
    p => (p as any).carpetAreaSqft != null && (p as any).carpetAreaSqft > 0,
  );

  return {
    areas,
    subTypes,
    bedrooms,
    facingOptions,
    sqftRange,
    hasAnyFacing:       facingOptions.length > 0,
    hasAnySqft:         sqftRange !== null,
    hasAnyBedrooms:     bedrooms.length > 0,
    hasAnySubTypes:     subTypes.length > 0,
    hasFaceData,
    hasCarpetAreaData,
    propertyCount:      properties.length,
  };
}

// ─── APPLY FILTERS ────────────────────────────────────────────────────────────
// Filter a property list by the current active filter state.
// All numeric target filters use ±10% tolerance.

export function applyFilters(
  properties: Property[],
  filters: ActiveSearchFilters,
): Property[] {
  let list = [...properties];

  // ── Areas (empty = All) ───────────────────────────────────────────────────
  if (filters.areas.length > 0) {
    list = list.filter(p => filters.areas.includes(p.area));
  }

  // ── Sub-types (empty = All) ───────────────────────────────────────────────
  if (filters.subTypes.length > 0) {
    list = list.filter(p => filters.subTypes.includes(p.subType));
  }

  // ── Bedrooms (empty = All, residence only) ────────────────────────────────
  if (filters.bedrooms.length > 0) {
    list = list.filter(
      p =>
        Array.isArray(p.beds) &&
        p.beds.some(b => filters.bedrooms.includes(b)),
    );
  }

  // ── Facing (empty = All) ──────────────────────────────────────────────────
  if (filters.facing.length > 0) {
    list = list.filter(p => !!p.facing && filters.facing.includes(p.facing));
  }

  // ── Property Size (target → sqft → ±10%) ─────────────────────────────────
  if (filters.sizeTarget !== null && filters.sizeTarget > 0) {
    const targetSqft =
      filters.sizeUnit === 'vaar'
        ? vaarToSqft(filters.sizeTarget)
        : filters.sizeTarget;
    const { min, max } = applyTolerance(targetSqft);
    list = list.filter(p => {
      const v = parsePropertySqft(p.sqft);
      return v !== null && v >= min && v <= max;
    });
  }

  // ── Budget — target mode (±10%) ───────────────────────────────────────────
  if (
    filters.budgetTarget !== null &&
    filters.budgetTarget > 0 &&
    filters.budgetMin === null &&
    filters.budgetMax === null
  ) {
    const { min, max } = applyTolerance(filters.budgetTarget);
    list = list.filter(p => {
      const v = parsePropertyPrice(p.price, p.priceFrom);
      return v !== null && v >= min && v <= max;
    });
  }

  // ── Budget — explicit range mode (no tolerance) ───────────────────────────
  if (filters.budgetMin !== null || filters.budgetMax !== null) {
    const lo = filters.budgetMin ?? 0;
    const hi = filters.budgetMax ?? Infinity;
    list = list.filter(p => {
      const v = parsePropertyPrice(p.price, p.priceFrom);
      return v !== null && v >= lo && v <= hi;
    });
  }

  // ── Face / Frontage (commercial, Feet, ±10%) ──────────────────────────────
  if (filters.faceFt !== null && filters.faceFt > 0) {
    const { min, max } = applyTolerance(filters.faceFt);
    list = list.filter(p => {
      const v = (p as any).faceFt as number | undefined;
      return v != null && v >= min && v <= max;
    });
  }

  // ── Carpet Area (Sq Ft, ±10%) ─────────────────────────────────────────────
  if (filters.carpetAreaSqft !== null && filters.carpetAreaSqft > 0) {
    const { min, max } = applyTolerance(filters.carpetAreaSqft);
    list = list.filter(p => {
      const v = (p as any).carpetAreaSqft as number | undefined;
      return v != null && v >= min && v <= max;
    });
  }

  return list;
}

// ─── RECALCULATE OPTIONS ──────────────────────────────────────────────────────
// After each filter change, derive the new available options from the
// currently-matching property subset.
//
// Standard faceted search: options for dimension X are derived from properties
// that pass ALL filters EXCEPT the filter on X itself — so users can still
// see what other values exist for that dimension.
//
// For simplicity at current scale, we derive from the full matched set.
// This means selecting Facing=East will hide North/West/South from the
// facing options, which is the correct "narrowing" behaviour.

export function recalculateOptions(
  baseDataset: Property[],
  activeFilters: ActiveSearchFilters,
  category: string,
): DerivedFilterOptions {
  // For proper faceted search, each filter dimension's available options
  // are derived from the dataset with ALL OTHER filters applied except itself.
  // This prevents chips from disappearing when one is selected.

  // Full filtered set (for count and numeric ranges)
  const fullMatched = applyFilters(baseDataset, activeFilters);

  // For subTypes: apply all filters EXCEPT subTypes filter
  const forSubTypes = applyFilters(baseDataset, { ...activeFilters, subTypes: [] });
  // For bedrooms: apply all filters EXCEPT bedrooms filter
  const forBedrooms = applyFilters(baseDataset, { ...activeFilters, bedrooms: [] });
  // For facing: apply all filters EXCEPT facing filter
  const forFacing = applyFilters(baseDataset, { ...activeFilters, facing: [] });
  // For areas: apply all filters EXCEPT areas filter
  const forAreas = applyFilters(baseDataset, { ...activeFilters, areas: [] });

  // Derive from appropriate subsets
  const base = deriveFilterOptions(fullMatched, category);

  // Override each dimension with its facet-correct options
  const subTypesFromFacet = deriveFilterOptions(forSubTypes, category).subTypes;
  const bedroomsFromFacet = deriveFilterOptions(forBedrooms, category).bedrooms;
  const facingFromFacet = deriveFilterOptions(forFacing, category).facingOptions;
  const areasFromFacet = deriveFilterOptions(forAreas, category).areas;

  return {
    ...base,
    subTypes: subTypesFromFacet,
    bedrooms: bedroomsFromFacet,
    facingOptions: facingFromFacet,
    areas: areasFromFacet,
    hasAnySubTypes: subTypesFromFacet.length > 0,
    hasAnyBedrooms: bedroomsFromFacet.length > 0,
    hasAnyFacing:   facingFromFacet.length > 0,
    // propertyCount reflects the fully filtered set
    propertyCount: fullMatched.length,
  };
}

// ─── TO MOBILE FILTERS (ADAPTER) ─────────────────────────────────────────────
// Convert ActiveSearchFilters → existing MobileFilters shape so that
// PropertiesScreen and FiltersScreen continue to work without modification.

export function toMobileFilters(
  filters: ActiveSearchFilters,
): MobileFilters {
  const typeMap: Record<string, string> = {
    'buy-residence':   'buy',
    'buy-commercial':  'commercial',
    'buy-plot':        'plot',
    'rent-residence':  'rent',
    'rent-commercial': 'commercial',
    'rent-plot':       'plot',
  };
  const typeKey = `${filters.intent}-${filters.category}`;
  const propertyType = typeMap[typeKey] ?? filters.intent;

  // Convert size target → sqft range string for minSqft/maxSqft
  let minSqft = '';
  let maxSqft = '';
  if (filters.sizeTarget !== null && filters.sizeTarget > 0) {
    const targetSqft =
      filters.sizeUnit === 'vaar'
        ? vaarToSqft(filters.sizeTarget)
        : filters.sizeTarget;
    const { min, max } = applyTolerance(targetSqft);
    minSqft = String(Math.round(min));
    maxSqft = String(Math.round(max));
  }

  // Convert budget target → price range strings
  let minPrice = '';
  let maxPrice = '';
  if (filters.budgetMin !== null) {
    minPrice = String(filters.budgetMin);
  } else if (filters.budgetTarget !== null && filters.budgetTarget > 0) {
    minPrice = String(Math.round(applyTolerance(filters.budgetTarget).min));
  }
  if (filters.budgetMax !== null) {
    maxPrice = String(filters.budgetMax);
  } else if (filters.budgetTarget !== null && filters.budgetTarget > 0) {
    maxPrice = String(Math.round(applyTolerance(filters.budgetTarget).max));
  }

  return {
    searchQuery:          '',
    selectedTypes:        [propertyType],
    selectedSubTypes:     filters.subTypes,
    selectedBedrooms:     filters.bedrooms,
    budgetMode:           'custom',
    selectedBudgetRanges: [],
    minPrice,
    maxPrice,
    minSqft,
    maxSqft,
    selectedFacing:       filters.facing,
    selectedAreas:        filters.areas,
    nearbyOnly:           false,
    // Carry active filters through for PropertiesScreen
    __activeFilters:      filters,
  } as any;
}
