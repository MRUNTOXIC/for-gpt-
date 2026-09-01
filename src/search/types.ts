// ─── SEARCH STATE ─────────────────────────────────────────────────────────────
// Central state object for the entire search experience.
// Search UI reads/writes this. Query builder converts it to API params.

export type TransactionType = 'buy' | 'rent' | 'commercial' | 'plot' | 'new';

export interface SearchState {
  transactionType: TransactionType;

  // Location
  city: string;          // display name e.g. "Rajkot"
  area: string;          // locality display name e.g. "Mavdi"

  // Budget — stored as raw numbers (rupees). null = not set.
  budgetMin: number | null;
  budgetMax: number | null;

  // Property filters
  propertySubTypes: string[];   // e.g. ["Apartment", "Villa"]
  bedrooms: string[];           // e.g. ["2 BHK", "3 BHK"]
}

export const DEFAULT_SEARCH_STATE: SearchState = {
  transactionType: 'buy',
  city: '',
  area: '',
  budgetMin: null,
  budgetMax: null,
  propertySubTypes: [],
  bedrooms: [],
};

// ─── RECENT SEARCH ────────────────────────────────────────────────────────────
export interface RecentSearch {
  id: string;
  state: SearchState;
  label: string;   // human-readable summary e.g. "Buy · Mavdi · 2 BHK"
  timestamp: number;
}

// ─── BUDGET OPTIONS ───────────────────────────────────────────────────────────
export const BUDGET_OPTIONS = [
  { label: 'No Min', value: null },
  { label: '₹5 Lakh',    value: 500_000 },
  { label: '₹10 Lakh',   value: 1_000_000 },
  { label: '₹20 Lakh',   value: 2_000_000 },
  { label: '₹30 Lakh',   value: 3_000_000 },
  { label: '₹40 Lakh',   value: 4_000_000 },
  { label: '₹50 Lakh',   value: 5_000_000 },
  { label: '₹75 Lakh',   value: 7_500_000 },
  { label: '₹1 Crore',   value: 10_000_000 },
  { label: '₹1.5 Crore', value: 15_000_000 },
  { label: '₹2 Crore',   value: 20_000_000 },
  { label: '₹3 Crore',   value: 30_000_000 },
  { label: '₹5 Crore',   value: 50_000_000 },
  { label: '₹5 Crore+',  value: 999_999_999 },
] as const;

export const BUDGET_MAX_OPTIONS = [
  { label: 'No Max', value: null },
  { label: '₹10 Lakh',   value: 1_000_000 },
  { label: '₹20 Lakh',   value: 2_000_000 },
  { label: '₹30 Lakh',   value: 3_000_000 },
  { label: '₹40 Lakh',   value: 4_000_000 },
  { label: '₹50 Lakh',   value: 5_000_000 },
  { label: '₹75 Lakh',   value: 7_500_000 },
  { label: '₹1 Crore',   value: 10_000_000 },
  { label: '₹1.5 Crore', value: 15_000_000 },
  { label: '₹2 Crore',   value: 20_000_000 },
  { label: '₹3 Crore',   value: 30_000_000 },
  { label: '₹5 Crore',   value: 50_000_000 },
  { label: 'Above ₹5 Cr', value: null },
] as const;

// ─── TRANSACTION TYPE CONFIG ──────────────────────────────────────────────────
export interface TransactionTypeConfig {
  label: string;
  value: TransactionType;
  apiType: string;       // maps to propertyType on the API
  showBeds: boolean;
  subTypes: string[];
}

export const TRANSACTION_TYPES: TransactionTypeConfig[] = [
  {
    label: 'Buy',
    value: 'buy',
    apiType: 'buy',
    showBeds: true,
    subTypes: ['Apartment', 'Flat / Apartment', 'House / Villa', 'Penthouse', 'Builder Floor', 'Studio', 'Independent House', 'Row House'],
  },
  {
    label: 'Rent / PG',
    value: 'rent',
    apiType: 'rent',
    showBeds: true,
    subTypes: ['Apartment', 'Flat / Apartment', 'House / Villa', 'Bungalow', 'Room', 'PG / Hostel', 'Builder Floor'],
  },
  {
    label: 'Commercial',
    value: 'commercial',
    apiType: 'commercial',
    showBeds: false,
    subTypes: ['Shop', 'Office', 'Showroom', 'Warehouse', 'Hospital', 'Hotel', 'Industrial Plot'],
  },
  {
    label: 'Plot',
    value: 'plot',
    apiType: 'plot',
    showBeds: false,
    subTypes: ['Residential Plot', 'Agricultural Land', 'Commercial Plot', 'Industrial Plot', 'Farm Land'],
  },
  {
    label: 'New Projects',
    value: 'new',
    apiType: 'buy',
    showBeds: true,
    subTypes: ['Flat / Apartment', 'House / Villa', 'Project', 'Township'],
  },
];

export const BED_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK', 'Studio'];

// ─── DEFAULT CITIES ───────────────────────────────────────────────────────────
export const DEFAULT_CITIES = ['Rajkot', 'Ahmedabad', 'Surat', 'Vadodara', 'Gandhinagar'];
