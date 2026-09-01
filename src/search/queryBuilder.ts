import type { SearchState, TransactionTypeConfig } from './types';
import { TRANSACTION_TYPES } from './types';
import type { GuidedSearchState } from './guidedSearchTypes';
import { plotMatchScore, parseSizeToAcres } from './guidedSearchTypes';

/**
 * Converts a SearchState into URL query params for the existing
 * getProperties(filters?) API which accepts Record<string, string>.
 *
 * Only sends params that are actually set — never sends empty strings or nulls.
 */
export function buildPropertySearchQuery(state: SearchState): Record<string, string> {
  const config: TransactionTypeConfig | undefined = TRANSACTION_TYPES.find(t => t.value === state.transactionType);
  const params: Record<string, string> = {};

  // Transaction / property type
  if (state.transactionType === 'new') {
    params.isNewProject = 'true';
  } else if (config) {
    params.type = config.apiType;
  }

  // Location — use area if set, otherwise city
  if (state.area.trim()) {
    params.area = state.area.trim();
  } else if (state.city.trim()) {
    params.city = state.city.trim();
  }

  // Budget
  if (state.budgetMin !== null) {
    params.priceMin = String(state.budgetMin);
  }
  if (state.budgetMax !== null) {
    params.priceMax = String(state.budgetMax);
  }

  return params;
}

/**
 * Converts SearchState into the MobileFilters shape that PropertiesScreen
 * already understands. This bridges the new search flow with the existing
 * filter/results infrastructure without rewriting PropertiesScreen.
 */
export function buildMobileFilters(state: SearchState) {
  return {
    searchQuery: '',
    selectedTypes: state.transactionType === 'new'
      ? ['new']
      : state.transactionType
      ? [state.transactionType]
      : [],
    selectedSubTypes: state.propertySubTypes,
    selectedBedrooms: state.bedrooms,
    budgetMode: 'custom' as const,
    selectedBudgetRanges: [],
    minPrice: state.budgetMin !== null ? String(state.budgetMin) : '',
    maxPrice: state.budgetMax !== null ? String(state.budgetMax) : '',
    minSqft: '',
    maxSqft: '',
    selectedFacing: [],
    selectedAreas: state.area ? [state.area] : [],
    nearbyOnly: false,
  };
}

// ─── GUIDED SEARCH → MOBILE FILTERS ──────────────────────────────────────────

/**
 * Converts a GuidedSearchState into the MobileFilters shape so that
 * PropertiesScreen can consume it without any changes to its filter pipeline.
 *
 * For plot searches the plotSize is encoded into minSqft/maxSqft using the
 * EFFECTIVE (tolerance-expanded) range so that PropertiesScreen fetches the
 * wider net. Ranking by closeness to the requested range is handled separately
 * in PropertiesScreen via the __plotSize param.
 */
export function buildGuidedMobileFilters(state: GuidedSearchState) {
  // Map category + intent → propertyType string the API understands
  const typeMap: Record<string, string> = {
    'buy-residence':   'buy',
    'buy-commercial':  'commercial',
    'buy-plot':        'plot',
    'rent-residence':  'rent',
    'rent-commercial': 'commercial',
    'rent-plot':       'plot',
  };
  const typeKey = `${state.intent}-${state.category}`;
  const propertyType = typeMap[typeKey] ?? state.intent;

  // Sub types depend on category
  const subTypes =
    state.category === 'residence'  ? state.residenceSubTypes :
    state.category === 'commercial' ? state.commercialSubTypes :
    state.plotSubTypes;

  // Plot size → sqft range (using effective range for wider net)
  let minSqft = '';
  let maxSqft = '';
  if (state.category === 'plot' && state.plotSize) {
    const ps = state.plotSize;
    // Convert effective acres back to sqft for client-side sqft filter
    // (PropertiesScreen will re-parse this via extractSqft)
    const SQFT_PER_ACRE = 43_560;
    minSqft = String(Math.round(ps.effectiveMinAcres * SQFT_PER_ACRE));
    maxSqft = String(Math.round(ps.effectiveMaxAcres * SQFT_PER_ACRE));
  }

  return {
    searchQuery: '',
    selectedTypes: [propertyType],
    selectedSubTypes: subTypes,
    selectedBedrooms: state.category === 'residence' ? state.bedrooms : [],
    budgetMode: 'custom' as const,
    selectedBudgetRanges: [],
    minPrice: state.budgetMin !== null ? String(state.budgetMin) : '',
    maxPrice: state.budgetMax !== null ? String(state.budgetMax) : '',
    minSqft,
    maxSqft,
    selectedFacing: [],
    selectedAreas: state.area ? [state.area] : [],
    nearbyOnly: false,
    // Carry guided state through for ranking in PropertiesScreen
    __guidedState: state,
  } as any;
}

/**
 * Builds a human-readable label from a SearchState for recent searches display.
 */
export function buildSearchLabel(state: SearchState): string {
  const parts: string[] = [];
  const typeConfig = TRANSACTION_TYPES.find(t => t.value === state.transactionType);
  if (typeConfig) parts.push(typeConfig.label);
  if (state.area) parts.push(state.area);
  else if (state.city) parts.push(state.city);
  if (state.bedrooms.length) parts.push(state.bedrooms.join(', '));
  if (state.budgetMin !== null || state.budgetMax !== null) {
    const min = state.budgetMin ? formatAmount(state.budgetMin) : '';
    const max = state.budgetMax ? formatAmount(state.budgetMax) : '';
    if (min && max) parts.push(`${min}–${max}`);
    else if (min) parts.push(`From ${min}`);
    else if (max) parts.push(`Up to ${max}`);
  }
  return parts.join(' · ');
}

function formatAmount(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(n % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (n >= 100_000)   return `₹${(n / 100_000).toFixed(n % 100_000 === 0 ? 0 : 1)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
}
