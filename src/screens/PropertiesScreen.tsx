import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ScrollView, Modal, Pressable, Platform, Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import PropertyCard from '../components/PropertyCard';
import PropertySkeleton from '../components/PropertySkeleton';
import GlobalFilterButton from '../components/GlobalFilterButton';
import ActiveFilterChip from '../components/ActiveFilterChip';
import { GLOBAL_CARD_WIDTH, GUTTER, COL_GAP, RADIUS, BOTTOM_NAV_HEIGHT } from '../theme/layout';
import { getProperties, getFavorites, addFavorite, removeFavorite } from '../services/api';
import { Property } from '../types/Property';
import { RootStackParamList } from '../navigation';
import type { MobileFilters } from '../filters/types';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/ThemeContext';
import { parseSizeToAcres, plotMatchScore } from '../search/guidedSearchTypes';
import type { GuidedSearchState } from '../search/guidedSearchTypes';
import { applyFilters, extractNumericPrice, extractSqftValue } from '../services/filterEngine';
import * as Location from 'expo-location';
import { getDistanceKm, type LatLng } from '../services/location';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const EMPTY_FILTERS: MobileFilters = {
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
  sizeUnit: 'sqft',
  sizeTarget: null,
  faceFt: null,
  carpetAreaTarget: null,
  targetBudget: null,
};

const PROP_TYPE_LABELS: Record<string, string> = {
  buy: 'Buy',
  rent: 'Rent',
  commercial: 'Commercial',
  plot: 'Plots',
  pg: 'PG / Hostel',
  new: 'Projects',
};

// Pill tabs shown at top of the screen — tapping one filters by type
const TYPE_TABS = [
  { id: 'all',        label: 'All',         icon: 'apps-outline'      },
  { id: 'buy',        label: 'Buy',         icon: 'home-outline'      },
  { id: 'rent',       label: 'Rent',        icon: 'key-outline'       },
  { id: 'commercial', label: 'Commercial',  icon: 'business-outline'  },
  { id: 'plot',       label: 'Plots',       icon: 'map-outline'       },
  { id: 'new',        label: 'Projects',    icon: 'sparkles-outline'  },
  { id: 'pg',         label: 'PG / Hostel', icon: 'people-outline'    },
] as const;

type TabId = typeof TYPE_TABS[number]['id'];

const SORT_OPTIONS = [
  { id: 'relevance', label: 'Relevance',           icon: 'sparkles-outline'   },
  { id: 'newest',    label: 'Newest First',        icon: 'time-outline'       },
  { id: 'price_low', label: 'Price: Low → High',   icon: 'arrow-down-outline' },
  { id: 'price_high',label: 'Price: High → Low',   icon: 'arrow-up-outline'   },
  { id: 'area_high', label: 'Largest Area First',  icon: 'resize-outline'     },
] as const;

type SortId = typeof SORT_OPTIONS[number]['id'];

// ─── PROP ITEM (memoized so FlatList never re-renders unchanged rows) ─────────

interface PropItemProps {
  item: Property;
  isFavorite: boolean;
  onPress: () => void;
  onFavoritePress: () => void;
}

const PropItem = React.memo(({ item, isFavorite, onPress, onFavoritePress }: PropItemProps) => (
  <PropertyCard
    property={item}
    onPress={onPress}
    isFavorite={isFavorite}
    onFavoritePress={onFavoritePress}
  />
), (p, n) =>
  p.item._id === n.item._id &&
  p.isFavorite === n.isFavorite &&
  p.onPress === n.onPress &&
  p.onFavoritePress === n.onFavoritePress
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function PropertiesScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Properties'>>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortId>('relevance');
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [filters, setFilters] = useState<MobileFilters>(EMPTY_FILTERS);
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  // Active pill tab — synced from route.params.type on mount
  const [activeTab, setActiveTab] = useState<TabId>('all');

  // Track the last params string we loaded so we don't double-load
  const lastLoadedKey = useRef('');

  // ── DATA LOADING ────────────────────────────────────────────────────────────

  const load = useCallback(async (isRefresh = false) => {
    const type = route.params?.type;
    const key = type ?? '__all__';
    if (!isRefresh && lastLoadedKey.current === key) return;
    lastLoadedKey.current = key;

    isRefresh ? setRefreshing(true) : setLoading(true);

    const apiParams: Record<string, string> = {};
    if (type && type !== 'new') apiParams.type = type;
    if (type === 'new') apiParams.isNewProject = 'true';

    const data = await getProperties(Object.keys(apiParams).length ? apiParams : undefined);
    const category = (route.params as any)?.category as string | undefined;
    const list = category ? data.filter(p => (p as any).category === category) : data;

    setAllProperties(list);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [route.params?.type, (route.params as any)?.category]);

  useEffect(() => {
    lastLoadedKey.current = ''; // reset so new type params force a reload
    load();
  }, [route.params?.type]);

  // ── SYNC INCOMING FILTERS FROM ROUTE PARAMS ─────────────────────────────────
  // Use a ref to track the last filters string to avoid calling setState with
  // the same value (prevents infinite render loops from JSON.stringify dep).
  const lastFiltersRef = useRef<string>('');
  useEffect(() => {
    const incoming = (route.params as any)?.filters as MobileFilters | undefined;
    if (!incoming) return;
    const serialised = JSON.stringify(incoming);
    if (serialised === lastFiltersRef.current) return;
    lastFiltersRef.current = serialised;
    setFilters(incoming);
  });

  // ── SEED TYPE FILTER FROM ROUTE ─────────────────────────────────────────────
  const routeTypeSeeded = useRef(false);
  useEffect(() => {
    if (routeTypeSeeded.current) return;
    const routeType = route.params?.type;
    if (routeType) {
      routeTypeSeeded.current = true;
      setActiveTab(routeType as TabId);
      setFilters(prev =>
        prev.selectedTypes.length === 0
          ? { ...prev, selectedTypes: [routeType] }
          : prev
      );
    }
  }, [route.params?.type]);

  // ── FAVORITES ───────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      const uid = user?.id || 'guest';
      getFavorites(uid).then(favs => setFavoriteIds(new Set(favs.map(p => p._id))));
    }, [user?.id])
  );

  const toggleFavorite = useCallback(async (propertyId: string) => {
    const uid = user?.id || 'guest';
    const isFav = favoriteIds.has(propertyId);
    setFavoriteIds(prev => {
      const n = new Set(prev);
      isFav ? n.delete(propertyId) : n.add(propertyId);
      return n;
    });
    const prop = allProperties.find(p => p._id === propertyId);
    isFav
      ? await removeFavorite(uid, propertyId)
      : await addFavorite(uid, propertyId, prop ?? undefined);
  }, [user?.id, favoriteIds, allProperties]);

  // ── NEARBY LOCATION ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!filters.nearbyOnly || userLoc) return;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLoc({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })();
  }, [filters.nearbyOnly]);

  // ── FILTERED + SORTED LIST ──────────────────────────────────────────────────

  const guidedState: GuidedSearchState | undefined =
    (route.params as any)?.filters?.__guidedState;

  const filtered = useMemo(() => {
    let list = applyFilters(allProperties, filters);

    if (filters.nearbyOnly && userLoc) {
      list = list.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const dist = getDistanceKm(
          userLoc,
          { latitude: Number(p.latitude), longitude: Number(p.longitude) }
        );
        return dist <= 5;
      });
    }

    if (guidedState?.category === 'plot' && guidedState.plotSize) {
      const range = guidedState.plotSize;
      list = list
        .map(p => ({ p, score: plotMatchScore(parseSizeToAcres(p.sqft) ?? 0, range) }))
        .filter(({ score }) => score < 2)
        .sort((a, b) => a.score - b.score)
        .map(({ p }) => p);
    }

    if (sortBy === 'newest') {
      list = [...list].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
    } else if (sortBy === 'price_low') {
      list = [...list].sort((a, b) =>
        (extractNumericPrice(a.price, a.priceFrom) || 0) -
        (extractNumericPrice(b.price, b.priceFrom) || 0)
      );
    } else if (sortBy === 'price_high') {
      list = [...list].sort((a, b) =>
        (extractNumericPrice(b.price, b.priceFrom) || 0) -
        (extractNumericPrice(a.price, a.priceFrom) || 0)
      );
    } else if (sortBy === 'area_high') {
      list = [...list].sort((a, b) =>
        (extractSqftValue(b.sqft) || 0) - (extractSqftValue(a.sqft) || 0)
      );
    }

    return list;
  }, [allProperties, filters, userLoc, guidedState, sortBy]);

  const activeCount = useMemo(() => (
    (filters.searchQuery ? 1 : 0) +
    filters.selectedTypes.length +
    filters.selectedSubTypes.length +
    filters.selectedBedrooms.length +
    (filters.selectedAreas.includes('All') ? 0 : filters.selectedAreas.length) +
    (filters.selectedFacing.includes('All') ? 0 : filters.selectedFacing.length) +
    (filters.sizeTarget ? 1 : 0) +
    (filters.faceFt ? 1 : 0) +
    (filters.carpetAreaTarget ? 1 : 0) +
    (filters.targetBudget ? 1 : ((filters.selectedBudgetRanges.length || filters.minPrice || filters.maxPrice) ? 1 : 0))
  ), [filters]);

  const clearAll = useCallback(() => setFilters(EMPTY_FILTERS), []);

  // ── TAB PRESS ───────────────────────────────────────────────────────────────
  const handleTabPress = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    if (tabId === 'all') {
      setFilters(prev => ({ ...prev, selectedTypes: [] }));
    } else {
      setFilters(prev => ({ ...prev, selectedTypes: [tabId] }));
    }
  }, []);

  // ── RENDER ITEM ─────────────────────────────────────────────────────────────

  const renderProperty = useCallback(({ item }: { item: Property }) => (
    <PropItem
      item={item}
      isFavorite={favoriteIds.has(item._id)}
      onPress={() => nav.navigate('PropertyDetail', { propertyId: item._id })}
      onFavoritePress={() => toggleFavorite(item._id)}
    />
  ), [favoriteIds, nav, toggleFavorite]);

  const keyExtractor = useCallback((item: Property) => item._id, []);

  // ── HEADER ──────────────────────────────────────────────────────────────────

  const routeType = route.params?.type;
  const screenTitle = routeType ? (PROP_TYPE_LABELS[routeType] ?? 'Properties') : 'Properties';
  const currentSortLabel = SORT_OPTIONS.find(s => s.id === sortBy)?.label ?? 'Sort';

  React.useLayoutEffect(() => {
    nav.setOptions({
      title: screenTitle,
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerCompactBtn}
            onPress={() => setSortModalVisible(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="swap-vertical" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerCompactBtn}
            onPress={() => nav.navigate('NearbyMap', { initialLocation: userLoc ?? undefined, filters })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="map-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>



          <GlobalFilterButton
            activeCount={activeCount}
            onPress={() => nav.navigate('Filters', {
              type: route.params?.type,
              properties: allProperties,
              initial: filters,
              returnTo: 'Properties',
              returnParams: {
                type: route.params?.type,
                category: (route.params as any)?.category,
              },
            })}
          />
        </View>
      ),
    });
  }, [nav, screenTitle, colors, allProperties, filters, route.params, activeCount, userLoc]);

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      {/* ── Pill type tab bar ── */}
      <View style={[styles.tabBarWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {TYPE_TABS.map((tab, index) => {
            const isFirst  = index === 0;
            const isLast   = index === TYPE_TABS.length - 1;
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => handleTabPress(tab.id)}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                style={[
                  styles.tab,
                  isFirst  && styles.tabFirst,
                  isLast   && styles.tabLast,
                  isActive
                    ? { backgroundColor: colors.primary, borderColor: colors.primary }
                    : { backgroundColor: colors.surfaceRaised, borderColor: colors.border },
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={13}
                  color={isActive ? '#fff' : colors.textTertiary}
                />
                <Text style={[
                  styles.tabLabel,
                  { color: isActive ? '#fff' : colors.textSecondary,
                    fontWeight: isActive ? '700' : '500' },
                ]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Toolbar: count + active filter chips ── */}
      <View style={[styles.toolbar, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
        <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
          {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'property' : 'properties'}`}
        </Text>
        {activeCount > 0 && (
          <TouchableOpacity
            style={[styles.clearAllBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}
            onPress={clearAll}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={11} color={colors.primary} />
            <Text style={[styles.clearAllText, { color: colors.primary }]}>
              Clear {activeCount}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Active filter chips (only when filters beyond type are active) ── */}
      {activeCount > 0 && (
        <View style={[styles.pillsBar, { backgroundColor: colors.background, borderBottomColor: colors.borderLight }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillsContent}
            keyboardShouldPersistTaps="handled"
          >
            {filters.selectedBedrooms.map(b => (
              <ActiveFilterChip
                key={`bed-${b}`}
                label={b}
                onRemove={() => setFilters(p => ({ ...p, selectedBedrooms: p.selectedBedrooms.filter(x => x !== b) }))}
              />
            ))}
            {filters.selectedSubTypes.map(st => (
              <ActiveFilterChip
                key={`sub-${st}`}
                label={st}
                onRemove={() => setFilters(p => ({ ...p, selectedSubTypes: p.selectedSubTypes.filter(x => x !== st) }))}
              />
            ))}
            {filters.selectedAreas.filter(a => a !== 'All').map(a => (
              <ActiveFilterChip
                key={`area-${a}`}
                label={a}
                onRemove={() => setFilters(p => ({ ...p, selectedAreas: p.selectedAreas.filter(x => x !== a) }))}
              />
            ))}
            {filters.selectedFacing.filter(f => f !== 'All').map(f => (
              <ActiveFilterChip
                key={`facing-${f}`}
                label={f}
                onRemove={() => setFilters(p => ({ ...p, selectedFacing: p.selectedFacing.filter(x => x !== f) }))}
              />
            ))}
            {filters.sizeTarget ? (
              <ActiveFilterChip
                label={`~${filters.sizeTarget} ${filters.sizeUnit === 'vaar' ? 'Vaar' : 'Sq Ft'}`}
                onRemove={() => setFilters(p => ({ ...p, sizeTarget: null }))}
              />
            ) : null}
            {filters.targetBudget ? (
              <ActiveFilterChip
                label={`~₹${filters.targetBudget.toLocaleString('en-IN')}`}
                onRemove={() => setFilters(p => ({ ...p, targetBudget: null }))}
              />
            ) : null}
            {filters.searchQuery ? (
              <ActiveFilterChip
                label={`"${filters.searchQuery}"`}
                onRemove={() => setFilters(p => ({ ...p, searchQuery: '' }))}
              />
            ) : null}
          </ScrollView>
        </View>
      )}

      {/* ── Property Grid ── */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          <PropertySkeleton />
          <PropertySkeleton />
          <PropertySkeleton />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 16 },
          ]}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { lastLoadedKey.current = ''; load(true); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderItem={renderProperty}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="home-outline" size={52} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                No properties found
              </Text>
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Try adjusting your filters or broadening your search.
              </Text>
              {activeCount > 0 && (
                <TouchableOpacity
                  style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                  onPress={clearAll}
                >
                  <Text style={styles.emptyBtnText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── Sort bottom sheet ── */}
      <Modal
        visible={sortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSortModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setSortModalVisible(false)}
        >
          <View
            style={[
              styles.sortSheet,
              { backgroundColor: colors.surface, paddingBottom: insets.bottom + 16 },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
              Sort By
            </Text>
            {SORT_OPTIONS.map(opt => {
              const active = sortBy === opt.id;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[
                    styles.sortRow,
                    active && { backgroundColor: colors.primaryBg },
                  ]}
                  onPress={() => { setSortBy(opt.id); setSortModalVisible(false); }}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={20}
                    color={active ? colors.primary : colors.textSecondary}
                  />
                  <Text style={[
                    styles.sortLabel,
                    { color: active ? colors.primary : colors.textPrimary,
                      fontWeight: active ? '700' : '500' },
                  ]}>
                    {opt.label}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 16,
  },
  headerCompactBtn: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Pill tab bar ──────────────────────────────────────────────────────────
  tabBarWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    alignItems: 'center',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderWidth: 1.5,
    // default radius — overridden for first/last to make island shape
    borderRadius: RADIUS.full,
    minHeight: 36,
  },
  tabFirst: {
    borderTopLeftRadius: RADIUS.full,
    borderBottomLeftRadius: RADIUS.full,
    borderTopRightRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
  },
  tabLast: {
    borderTopLeftRadius: RADIUS.full,
    borderBottomLeftRadius: RADIUS.full,
    borderTopRightRadius: RADIUS.full,
    borderBottomRightRadius: RADIUS.full,
  },
  tabLabel: { fontSize: 12, letterSpacing: 0.1 },

  // ── Toolbar ──────────────────────────────────────────────────────────────
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: GUTTER,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultCount: { fontSize: 12, fontWeight: '600' },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  clearAllText: { fontSize: 11, fontWeight: '700' },

  // ── Active filter pills ───────────────────────────────────────────────────
  pillsBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pillsContent: {
    paddingHorizontal: GUTTER,
    paddingVertical: 8,
    gap: 6,
    alignItems: 'center',
  },

  // ── Grid ─────────────────────────────────────────────────────────────────
  skeletonWrap: {
    flexDirection: 'row',
    paddingHorizontal: GUTTER,
    gap: COL_GAP,
    paddingTop: 16,
    flexWrap: 'wrap',
  },
  columnWrapper: {
    paddingHorizontal: GUTTER,
    marginBottom: COL_GAP,
    justifyContent: 'space-between',
  },
  listContent: { paddingTop: 12 },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: RADIUS.md,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // ── Sort bottom sheet ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    marginBottom: 2,
  },
  sortLabel: { flex: 1, fontSize: 15 },
});
