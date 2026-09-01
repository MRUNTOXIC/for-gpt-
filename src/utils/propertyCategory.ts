import { Ionicons } from '@expo/vector-icons';
import type { Property } from '../types/Property';

export type PropertyCategoryType = 'all' | 'flat' | 'bungalow' | 'tenement' | 'commercial' | 'plot';

export interface PropertyCategoryMeta {
  typeKey: Exclude<PropertyCategoryType, 'all'>;
  label: string;
  pluralLabel: string;
  emoji: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PROPERTY_CATEGORIES: Record<Exclude<PropertyCategoryType, 'all'>, PropertyCategoryMeta> = {
  flat: {
    typeKey: 'flat',
    label: 'Flat',
    pluralLabel: 'Flats',
    emoji: '🏢',
    icon: 'business',
    color: '#2563eb', // Blue
    bgColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  bungalow: {
    typeKey: 'bungalow',
    label: 'Bungalow',
    pluralLabel: 'Bungalows',
    emoji: '🏡',
    icon: 'home',
    color: '#7c3aed', // Purple
    bgColor: '#f5f3ff',
    borderColor: '#8b5cf6',
  },
  tenement: {
    typeKey: 'tenement',
    label: 'Tenement',
    pluralLabel: 'Tenements',
    emoji: '🏠',
    icon: 'storefront',
    color: '#d97706', // Orange / Amber
    bgColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  commercial: {
    typeKey: 'commercial',
    label: 'Commercial',
    pluralLabel: 'Commercial',
    emoji: '💼',
    icon: 'briefcase',
    color: '#dc2626', // Red
    bgColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  plot: {
    typeKey: 'plot',
    label: 'Plot',
    pluralLabel: 'Plots',
    emoji: '🌳',
    icon: 'map',
    color: '#059669', // Green
    bgColor: '#ecfdf5',
    borderColor: '#10b981',
  },
};

export function getPropertyCategory(property: Property): Exclude<PropertyCategoryType, 'all'> {
  const pType = (property.propertyType || '').toLowerCase();
  const subType = (property.subType || '').toLowerCase();
  const title = (property.title || '').toLowerCase();

  // 1. Plot / Land
  if (
    pType === 'plot' ||
    subType.includes('plot') ||
    subType.includes('land') ||
    title.includes('plot') ||
    title.includes('land')
  ) {
    return 'plot';
  }

  // 2. Commercial
  if (
    pType === 'commercial' ||
    subType.includes('commercial') ||
    subType.includes('shop') ||
    subType.includes('office') ||
    subType.includes('showroom') ||
    subType.includes('warehouse') ||
    subType.includes('hospital') ||
    subType.includes('hotel') ||
    title.includes('shop') ||
    title.includes('office') ||
    title.includes('showroom')
  ) {
    return 'commercial';
  }

  // 3. Tenement (Supports both DB spellings: "Tenement", "Tenament", "Tenament/Bungalow", "Tenement House")
  if (
    subType.includes('tenement') ||
    subType.includes('tenament') ||
    title.includes('tenement') ||
    title.includes('tenament') ||
    subType.includes('row house') ||
    subType.includes('small house')
  ) {
    return 'tenement';
  }

  // 4. Bungalow / Villa
  if (
    subType.includes('bungalow') ||
    subType.includes('villa') ||
    title.includes('bungalow') ||
    title.includes('villa')
  ) {
    return 'bungalow';
  }

  // 5. Default: Flat / Apartment
  return 'flat';
}

export function isPropertyInCategory(property: Property, category: PropertyCategoryType): boolean {
  if (category === 'all') return true;

  const subType = (property.subType || '').toLowerCase();
  const title = (property.title || '').toLowerCase();
  const pType = (property.propertyType || '').toLowerCase();

  if (category === 'tenement') {
    return (
      subType.includes('tenement') ||
      subType.includes('tenament') ||
      title.includes('tenement') ||
      title.includes('tenament') ||
      subType.includes('row house') ||
      subType.includes('small house') ||
      subType.includes('independent house')
    );
  }

  if (category === 'bungalow') {
    return (
      subType.includes('bungalow') ||
      subType.includes('villa') ||
      title.includes('bungalow') ||
      title.includes('villa')
    );
  }

  if (category === 'plot') {
    return (
      pType === 'plot' ||
      subType.includes('plot') ||
      subType.includes('land') ||
      title.includes('plot') ||
      title.includes('land')
    );
  }

  if (category === 'commercial') {
    return (
      pType === 'commercial' ||
      subType.includes('commercial') ||
      subType.includes('shop') ||
      subType.includes('office') ||
      subType.includes('showroom') ||
      subType.includes('warehouse') ||
      subType.includes('hospital') ||
      subType.includes('hotel') ||
      title.includes('shop') ||
      title.includes('office')
    );
  }

  return getPropertyCategory(property) === category;
}

export function getPropertyCategoryMeta(property: Property): PropertyCategoryMeta {
  const cat = getPropertyCategory(property);
  return PROPERTY_CATEGORIES[cat];
}
