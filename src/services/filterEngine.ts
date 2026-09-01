import type { Property } from '../types/Property';
import type { MobileFilters } from '../filters/types';

export const SQFT_PER_VAAR = 9; // 1 Vaar (Square Yard) = 9 Square Feet

/**
 * Extracts numeric price in INR from price string (e.g., "₹45 Lakh" -> 4500000)
 */
export function extractNumericPrice(price?: string, priceFrom?: string): number | null {
  const str = priceFrom || price;
  if (!str || typeof str !== 'string') return null;
  const clean = str.replace(/[₹,\s]/g, '').toLowerCase();
  let mul = 1, num = clean;
  if (clean.includes('cr')) { mul = 10000000; num = clean.replace(/cr(ore)?/g, ''); }
  else if (clean.includes('l') || clean.includes('lakh')) { mul = 100000; num = clean.replace(/l(akh)?/g, ''); }
  else if (clean.includes('k')) { mul = 1000; num = clean.replace(/k/g, ''); }
  const n = parseFloat(num);
  return isNaN(n) ? null : n * mul;
}

/**
 * Extracts property size in Sq Ft from property sqft field.
 * Handles both "100 Vaar" -> 900 Sq Ft and "1000 Sq Ft" -> 1000 Sq Ft.
 */
export function extractSqftValue(sqftStr?: string): number | null {
  if (!sqftStr || typeof sqftStr !== 'string') return null;
  const clean = sqftStr.toLowerCase().trim();
  const match = clean.match(/[\d.]+/);
  if (!match) return null;
  const num = parseFloat(match[0]);
  if (isNaN(num)) return null;

  if (clean.includes('vaar') || clean.includes('gaj') || clean.includes('yd')) {
    return num * SQFT_PER_VAAR;
  }
  return num;
}

/**
 * Derives dynamic filter options directly from property dataset
 */
export interface DerivedOptions {
  availableAreas: string[];
  availableSubTypes: string[];
  availableBedrooms: string[];
  availableFacing: string[];
  hasSizeData: boolean;
  hasCarpetData: boolean;
  hasFaceData: boolean;
  hasFacingData: boolean;
}

export function deriveFilterOptions(properties: Property[]): DerivedOptions {
  const areasSet = new Set<string>();
  const subTypesSet = new Set<string>();
  const bedroomsSet = new Set<string>();
  const facingSet = new Set<string>();

  let hasSizeData = false;
  let hasCarpetData = false;
  let hasFaceData = false;

  if (Array.isArray(properties)) {
    properties.forEach(p => {
      if (!p) return;

      if (typeof p.area === 'string' && p.area.trim()) {
        areasSet.add(p.area.trim());
      }
      if (typeof p.subType === 'string' && p.subType.trim()) {
        subTypesSet.add(p.subType.trim());
      }

      const facingStr = typeof p.facing === 'string' ? p.facing.trim() : (typeof (p as any).facing === 'string' ? (p as any).facing.trim() : '');
      if (facingStr) {
        facingSet.add(facingStr);
      }

      if (Array.isArray(p.beds)) {
        p.beds.forEach(b => {
          if (typeof b === 'string' && b.trim()) {
            bedroomsSet.add(b.trim());
          } else if (typeof b === 'number') {
            bedroomsSet.add(String(b));
          }
        });
      }

      if (p.sqft && extractSqftValue(p.sqft) !== null) {
        hasSizeData = true;
      }
      if ((p as any).carpetArea && parseFloat(String((p as any).carpetArea)) > 0) {
        hasCarpetData = true;
      }
      if ((p as any).faceFt && parseFloat(String((p as any).faceFt)) > 0) {
        hasFaceData = true;
      }
    });
  }

  return {
    availableAreas: ['All', ...Array.from(areasSet).sort()],
    availableSubTypes: Array.from(subTypesSet).sort(),
    availableBedrooms: Array.from(bedroomsSet).sort((a, b) => {
      const na = parseFloat(a) || 0;
      const nb = parseFloat(b) || 0;
      return na - nb;
    }),
    availableFacing: facingSet.size > 0 ? ['All', ...Array.from(facingSet).sort()] : [],
    hasSizeData,
    hasCarpetData,
    hasFaceData,
    hasFacingData: facingSet.size > 0,
  };
}

/**
 * Filter Properties applying ±10% target matching for numerical target fields
 */
export function applyFilters(properties: Property[], filters: MobileFilters): Property[] {
  if (!Array.isArray(properties) || !properties.length) return [];
  if (!filters) return [...properties];

  let list = [...properties];

  // 1. Search Query Filter
  if (filters.searchQuery?.trim()) {
    const q = filters.searchQuery.toLowerCase().trim();
    list = list.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.area || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q) ||
      (p.subType || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    );
  }

  // 2. Property Type Filter
  if (filters.selectedTypes && filters.selectedTypes.length > 0) {
    list = list.filter(p =>
      filters.selectedTypes.some(t => (t === 'new' ? p.isNewProject === true : p.propertyType === t))
    );
  }

  // 3. SubType Filter
  if (filters.selectedSubTypes && filters.selectedSubTypes.length > 0) {
    list = list.filter(p =>
      filters.selectedSubTypes.some(st =>
        p.subType?.toLowerCase() === st.toLowerCase() ||
        p.subType?.toLowerCase().includes(st.toLowerCase())
      )
    );
  }

  // 4. Bedrooms Filter
  if (filters.selectedBedrooms && filters.selectedBedrooms.length > 0) {
    list = list.filter(p =>
      Array.isArray(p.beds) && p.beds.some(b => filters.selectedBedrooms.includes(String(b)))
    );
  }

  // 5. Area Filter ('All' or explicit selections)
  if (filters.selectedAreas && filters.selectedAreas.length > 0 && !filters.selectedAreas.includes('All')) {
    list = list.filter(p => p.area && filters.selectedAreas.some(a => a.toLowerCase() === p.area.toLowerCase()));
  }

  // 6. Facing Filter ('All' or explicit selections)
  if (filters.selectedFacing && filters.selectedFacing.length > 0 && !filters.selectedFacing.includes('All')) {
    list = list.filter(p => {
      const fVal = typeof p.facing === 'string' ? p.facing.trim() : (typeof (p as any).facing === 'string' ? (p as any).facing.trim() : '');
      return fVal && filters.selectedFacing.some(f => f.toLowerCase() === fVal.toLowerCase());
    });
  }

  // 7. Property Size ±10% Matching with Unit Awareness (Vaar vs Sq Ft)
  if (filters.sizeTarget && filters.sizeTarget > 0) {
    const unit = filters.sizeUnit || 'sqft';
    const targetInSqft = unit === 'vaar' ? filters.sizeTarget * SQFT_PER_VAAR : filters.sizeTarget;
    const minSqft = targetInSqft * 0.90; // -10%
    const maxSqft = targetInSqft * 1.10; // +10%

    list = list.filter(p => {
      const sqftVal = extractSqftValue(p.sqft);
      return sqftVal !== null && sqftVal >= minSqft && sqftVal <= maxSqft;
    });
  } else if (filters.minSqft || filters.maxSqft) {
    const min = filters.minSqft ? parseFloat(filters.minSqft) : 0;
    const max = filters.maxSqft ? parseFloat(filters.maxSqft) : Infinity;
    list = list.filter(p => {
      const v = extractSqftValue(p.sqft);
      return v !== null && v >= min && v <= max;
    });
  }

  // 8. Commercial Face / Frontage (Feet) ±10% Matching
  if (filters.faceFt && filters.faceFt > 0) {
    const minFace = filters.faceFt * 0.90;
    const maxFace = filters.faceFt * 1.10;
    list = list.filter(p => {
      const faceVal = parseFloat(String((p as any).faceFt || '0'));
      return faceVal >= minFace && faceVal <= maxFace;
    });
  }

  // 9. Carpet Area (Sq Ft) ±10% Matching
  if (filters.carpetAreaTarget && filters.carpetAreaTarget > 0) {
    const minCarpet = filters.carpetAreaTarget * 0.90;
    const maxCarpet = filters.carpetAreaTarget * 1.10;
    list = list.filter(p => {
      const carpetVal = parseFloat(String((p as any).carpetArea || '0'));
      return carpetVal >= minCarpet && carpetVal <= maxCarpet;
    });
  }

  // 10. Budget ±10% Target Matching OR Custom Range OR Budget Range Labels
  if (filters.targetBudget && filters.targetBudget > 0) {
    // ±10% around a specific target budget
    const minBudget = filters.targetBudget * 0.90;
    const maxBudget = filters.targetBudget * 1.10;
    list = list.filter(p => {
      const priceVal = extractNumericPrice(p.price, p.priceFrom);
      return priceVal !== null && priceVal >= minBudget && priceVal <= maxBudget;
    });
  } else if (filters.minPrice || filters.maxPrice) {
    // Explicit numeric min/max (in INR as raw numbers)
    const min = filters.minPrice ? parseFloat(filters.minPrice) : 0;
    const max = filters.maxPrice ? parseFloat(filters.maxPrice) : Infinity;
    if (!isNaN(min) || !isNaN(max)) {
      list = list.filter(p => {
        const priceVal = extractNumericPrice(p.price, p.priceFrom);
        return priceVal !== null && priceVal >= (isNaN(min) ? 0 : min) && priceVal <= (isNaN(max) ? Infinity : max);
      });
    }
  } else if (filters.selectedBudgetRanges && filters.selectedBudgetRanges.length > 0) {
    // Budget range chips selected in FiltersScreen
    const BUDGET_RANGES = [
      { label: 'Below 5 Lakhs', min: 0,          max: 500_000 },
      { label: '5L – 25L',      min: 500_000,    max: 2_500_000 },
      { label: '25L – 50L',     min: 2_500_000,  max: 5_000_000 },
      { label: '50L – 1Cr',     min: 5_000_000,  max: 10_000_000 },
      { label: '1Cr – 5Cr',     min: 10_000_000, max: 50_000_000 },
      { label: 'Above 5Cr',     min: 50_000_000, max: Infinity },
    ];
    const activeRanges = BUDGET_RANGES.filter(r => filters.selectedBudgetRanges.includes(r.label));
    if (activeRanges.length > 0) {
      list = list.filter(p => {
        const priceVal = extractNumericPrice(p.price, p.priceFrom);
        if (priceVal === null) return false;
        return activeRanges.some(r => priceVal >= r.min && priceVal < r.max);
      });
    }
  }

  return list;
}

/**
 * Recalculates available facet options dynamically based on active filter selections
 */
export function recalculateOptions(allProperties: Property[], activeFilters: MobileFilters): DerivedOptions {
  const filtered = applyFilters(allProperties, activeFilters);
  return deriveFilterOptions(filtered.length > 0 ? filtered : allProperties);
}
