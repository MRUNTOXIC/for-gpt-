import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ScrollView, FlatList, Keyboard, Platform, Dimensions, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import { useTheme } from '../theme/ThemeContext';
import SearchSuggestions, { SuggestionItem } from '../components/SearchSuggestions';
import PropertyCard from '../components/PropertyCard';
import PropertySkeleton from '../components/PropertySkeleton';
import { GLOBAL_CARD_WIDTH, COL_GAP, BOTTOM_NAV_HEIGHT, RADIUS } from '../theme/layout';
import {
  getRecentSearches,
  saveRecentSearch,
  removeRecentSearch,
  clearRecentSearches,
} from '../services/recentSearches';
import { getProperties } from '../services/api';
import { Property } from '../types/Property';
import type { MobileFilters } from '../filters/types';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const POPULAR_LOCATIONS = [
  'Raiya Road', 'Kalawad Road', 'Mavdi', '150 Feet Ring Road',
  'University Road', 'Yagnik Road', 'Kothariya', 'Rajkot',
];

const POPULAR_CATEGORIES = [
  { label: 'Buy',         type: 'buy',        icon: 'home-outline'      },
  { label: 'Rent',        type: 'rent',        icon: 'key-outline'       },
  { label: 'Commercial',  type: 'commercial',  icon: 'business-outline'  },
  { label: 'Plots',       type: 'plot',        icon: 'map-outline'       },
  { label: 'Projects',    type: 'new',         icon: 'sparkles-outline'  },
  { label: 'PG / Hostel', type: 'pg',          icon: 'people-outline'    },
] as const;

const BHK_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '4+ BHK'];

// Build the default MobileFilters once so it's a stable reference
const BASE_FILTERS: MobileFilters = {
  searchQuery: '',
  selectedTypes: [],
  selectedSubTypes: [],
  selectedBedrooms: [],
  budgetMode: 'ranges',
  selectedBudgetRanges: [],
  minPrice: '',
  maxPrice: '',
  minSqft: '',
  maxSqft: '',
  selectedFacing: [],
  selectedAreas: [],
  nearbyOnly: false,
};

// ─── RESULT CARD (memoized) ───────────────────────────────────────────────────

interface ResultCardProps {
  property: Property;
  onPress: () => void;
}

const ResultCard = React.memo(
  ({ property, onPress }: ResultCardProps) => (
    <View style={{ width: GLOBAL_CARD_WIDTH, marginBottom: COL_GAP }}>
      <PropertyCard
        property={property}
        onPress={onPress}
      />
    </View>
  ),
  (prev, next) =>
    prev.property._id === next.property._id && prev.onPress === next.onPress,
);
ResultCard.displayName = 'ResultCard';

// ─── SCREEN ───────────────────────────────────────────────────────────────────

export default function SearchScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // ── Bootstrap ──────────────────────────────────────────────────────────────
  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
    getProperties().then(setAllProperties).catch(() => {});
  }, []);

  // ── Debounce ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 280);
    return () => clearTimeout(t);
  }, [query]);

  // ── Inline search results ──────────────────────────────────────────────────
  const suggestions = useMemo<SuggestionItem[]>(() => {
    const clean = debouncedQuery.trim().toLowerCase();
    if (!clean) return [];

    const out: SuggestionItem[] = [];

    POPULAR_LOCATIONS
      .filter(loc => loc.toLowerCase().includes(clean))
      .forEach(loc =>
        out.push({ id: `loc-${loc}`, type: 'location', title: loc, subtitle: 'Locality in Rajkot', query: loc })
      );

    ['1 BHK', '2 BHK', '3 BHK', '4 BHK', 'Apartment', 'Villa', 'Office', 'Plot', 'Shop']
      .filter(pt => pt.toLowerCase().includes(clean))
      .forEach(pt =>
        out.push({ id: `pt-${pt}`, type: 'property', title: pt, subtitle: 'Property Type', query: pt })
      );

    return out.slice(0, 6);
  }, [debouncedQuery]);

  const results = useMemo<Property[]>(() => {
    const clean = debouncedQuery.trim().toLowerCase();
    if (!clean) return [];
    return allProperties.filter(p => {
      const t = (p.title  || '').toLowerCase();
      const a = (p.area   || '').toLowerCase();
      const c = (p.city   || '').toLowerCase();
      const s = (p.subType|| '').toLowerCase();
      return t.includes(clean) || a.includes(clean) || c.includes(clean) || s.includes(clean);
    });
  }, [debouncedQuery, allProperties]);

  const isSearching = debouncedQuery.trim().length > 0;

  // ── Handlers ───────────────────────────────────────────────────────────────

  // Navigate to PropertiesScreen with the query + optional extra filters
  const executeSearch = useCallback((
    searchStr: string,
    extraFilters?: Partial<MobileFilters>,
  ) => {
    const clean = searchStr.trim();
    Keyboard.dismiss();
    if (clean) {
      saveRecentSearch(clean).then(setRecentSearches);
    }
    nav.navigate('Properties', {
      filters: { ...BASE_FILTERS, searchQuery: clean, ...extraFilters },
    });
  }, [nav]);

  const handleSelectSuggestion = useCallback((item: SuggestionItem | string) => {
    if (typeof item === 'string') {
      setQuery(item);
      executeSearch(item);
    } else {
      setQuery(item.query);
      executeSearch(item.query, (item as any).filterParams);
    }
  }, [executeSearch]);

  const handleSubmit = useCallback(() => {
    executeSearch(query);
  }, [query, executeSearch]);

  const handleViewAll = useCallback(() => {
    executeSearch(query);
  }, [query, executeSearch]);

  const handleBhk = useCallback((bhk: string) => {
    nav.navigate('Properties', {
      filters: { ...BASE_FILTERS, selectedBedrooms: [bhk] },
    });
  }, [nav]);

  const handleCategory = useCallback((type: string) => {
    nav.navigate('Properties', { type });
  }, [nav]);

  const handleLocality = useCallback((loc: string) => {
    executeSearch(loc);
  }, [executeSearch]);

  const handleRemoveRecent = useCallback(async (q: string) => {
    const updated = await removeRecentSearch(q);
    setRecentSearches(updated);
  }, []);

  const handleClearRecent = useCallback(async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  }, []);

  const handleClearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // ── Render item ────────────────────────────────────────────────────────────
  const renderResult = useCallback(({ item }: { item: Property }) => (
    <ResultCard
      property={item}
      onPress={() => nav.navigate('PropertyDetail', { propertyId: item._id })}
    />
  ), [nav]);

  const keyExtractor = useCallback((item: Property) => item._id, []);

  // ── Layout values ──────────────────────────────────────────────────────────
  const showActive = isSearching && query.trim().length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top']}
    >
      {/* ── Search bar ── */}
      <View style={[styles.searchBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.inputRow, { backgroundColor: colors.surfaceSunken, borderColor: isFocused ? colors.primary : colors.border }]}>
          <Ionicons name="search" size={18} color={isFocused ? colors.primary : colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.textPrimary }]}
            value={query}
            onChangeText={setQuery}
            placeholder="City, area, 3 BHK, builder…"
            placeholderTextColor={colors.textTertiary}
            returnKeyType="search"
            onSubmitEditing={handleSubmit}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            // NO autoFocus — would pop keyboard on every tab switch
          />
          {query.length > 0 && (
            <Pressable
              onPress={handleClearQuery}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {showActive && (
          <TouchableOpacity
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
          >
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Results mode ── */}
      {showActive ? (
        <View style={styles.flex}>
          {/* Inline suggestion chips */}
          {suggestions.length > 0 && (
            <SearchSuggestions
              suggestions={suggestions}
              recentSearches={[]}
              onSelectSuggestion={handleSelectSuggestion}
              onRemoveRecent={handleRemoveRecent}
              onClearAllRecent={handleClearRecent}
            />
          )}

          {/* Results header */}
          <View style={[styles.resultsHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </Text>
            {results.length > 0 && (
              <TouchableOpacity onPress={handleViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.viewAll, { color: colors.primary }]}>
                  View All →
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={styles.skeletonWrap}>
              <PropertySkeleton />
              <PropertySkeleton />
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={keyExtractor}
              numColumns={2}
              columnWrapperStyle={styles.columnWrapperStyle}
              contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 }]}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={5}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={Platform.OS === 'android'}
              renderItem={renderResult}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Ionicons name="search-outline" size={44} color={colors.border} />
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No results for "{debouncedQuery}"
                  </Text>
                  <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                    Try a location name, property type, or builder.
                  </Text>
                  <TouchableOpacity
                    style={[styles.clearBtn, { backgroundColor: colors.primary }]}
                    onPress={handleClearQuery}
                  >
                    <Text style={styles.clearBtnText}>Clear Search</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      ) : (
        /* ── Discovery mode ── */
        <ScrollView
          style={styles.flex}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 }}
        >
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <SearchSuggestions
              suggestions={[]}
              recentSearches={recentSearches}
              onSelectSuggestion={handleSelectSuggestion}
              onRemoveRecent={handleRemoveRecent}
              onClearAllRecent={handleClearRecent}
            />
          )}

          {/* Browse by category */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              BROWSE BY CATEGORY
            </Text>
            <View style={styles.categoryGrid}>
              {POPULAR_CATEGORIES.map(cat => (
                <TouchableOpacity
                  key={cat.type}
                  style={[styles.categoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleCategory(cat.type)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: colors.primaryBg }]}>
                    <Ionicons name={cat.icon as any} size={20} color={colors.primary} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: colors.textPrimary }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* BHK shortcuts */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              BY BEDROOMS
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {BHK_OPTIONS.map(bhk => (
                <TouchableOpacity
                  key={bhk}
                  style={[styles.bhkChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleBhk(bhk)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="bed-outline" size={14} color={colors.primary} />
                  <Text style={[styles.bhkText, { color: colors.textPrimary }]}>{bhk}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Top localities */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textTertiary }]}>
              TOP LOCALITIES IN RAJKOT
            </Text>
            <View style={styles.localityWrap}>
              {POPULAR_LOCATIONS.map(loc => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.localityChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleLocality(loc)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="location-outline" size={13} color={colors.primary} />
                  <Text style={[styles.localityText, { color: colors.textPrimary }]}>{loc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Search bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 46,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Results
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultsCount: { fontSize: 13, fontWeight: '600' },
  viewAll: { fontSize: 13, fontWeight: '700' },

  columnWrapperStyle: {
    paddingHorizontal: 16,
    marginBottom: COL_GAP,
    justifyContent: 'space-between',
  },
  listContent: { paddingTop: 12 },
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 12 },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingTop: 72,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  clearBtn: {
    paddingHorizontal: 24,
    paddingVertical: 11,
    borderRadius: 12,
  },
  clearBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Discovery
  section: { paddingHorizontal: 16, marginTop: 24 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  categoryIconWrap: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryLabel: { fontSize: 13, fontWeight: '700' },

  chipRow: { gap: 8, paddingVertical: 2, paddingRight: 16 },
  bhkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    minWidth: 72,
  },
  bhkText: { fontSize: 13, fontWeight: '600' },

  localityWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  localityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  localityText: { fontSize: 12, fontWeight: '600' },
});
