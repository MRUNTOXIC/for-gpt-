import React, { createContext, useContext } from 'react';
import type { MobileFilters } from './filters/types';
import type { UserRole } from './auth/types';
import type { GuidedSearchState } from './search/guidedSearchTypes';
import type { Property } from './types/Property';

export type RootStackParamList = {
  MainTabs: undefined;
  Properties: {
    type?: string;
    category?: string;
    filters?: MobileFilters & { __guidedState?: GuidedSearchState };
  } | undefined;
  PropertyDetail: { propertyId: string };
  Favorites: undefined;
  Profile: undefined;
  PostProperty: undefined;
  Notifications: undefined;  Filters: {
    type?: string;
    initial?: MobileFilters;
    properties: Property[];   // full Property[] — FiltersScreen needs all fields for faceting
    returnTo?: keyof RootStackParamList;
    returnParams?: any;
  };
  Login: { role?: UserRole } | undefined;
  NearbyMap: { initialLocation?: { latitude: number; longitude: number }; filters?: MobileFilters } | undefined;
  Loans: undefined;
  Builders: undefined;
};
