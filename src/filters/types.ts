import type { Property } from '../types/Property';

export type BudgetMode = 'ranges' | 'custom' | 'target';

export type MobileFilters = {
  searchQuery: string;
  selectedTypes: string[];
  selectedSubTypes: string[];
  selectedBedrooms: string[];
  budgetMode: BudgetMode;
  selectedBudgetRanges: string[];
  minPrice: string;
  maxPrice: string;
  minSqft: string;
  maxSqft: string;
  selectedFacing: string[];
  selectedAreas: string[];
  nearbyOnly?: boolean;

  // Dynamic search measurement & target fields (±10% matching)
  sizeUnit?: 'vaar' | 'sqft';
  sizeTarget?: number | null;
  faceFt?: number | null;
  carpetAreaTarget?: number | null;
  targetBudget?: number | null;
};

export type FilterPropertyLite = Pick<
  Property,
  '_id' | 'title' | 'propertyType' | 'subType' | 'beds' | 'price' | 'priceFrom' | 'sqft' | 'area' | 'latitude' | 'longitude'
> & {
  facing?: string;
  isNewProject?: boolean;
};
