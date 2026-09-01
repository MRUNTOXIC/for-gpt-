import React, { useCallback, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, RefreshControl, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import PropertyCard from '../components/PropertyCard';
import PropertySkeleton from '../components/PropertySkeleton';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../auth/context';
import { getFavorites, removeFavorite, getProperties, addFavorite } from '../services/api';
import { Property } from '../types/Property';
import { useTheme } from '../theme/ThemeContext';
import { GLOBAL_CARD_WIDTH, GUTTER, COL_GAP, RADIUS, BOTTOM_NAV_HEIGHT, SPACE } from '../theme/layout';

// ─── STABLE CARD WRAPPER ──────────────────────────────────────────────────────
// Avoids inline arrow closures in renderItem which defeat React.memo.
// Each card gets a stable ID-keyed callback via useMemo in the parent.

interface FavCardProps {
  item: Property;
  onPress: () => void;
  onRemove: () => void;
  isFavorite: boolean;
}

const FavCard = React.memo(
  ({ item, onPress, onRemove, isFavorite }: FavCardProps) => (
    <PropertyCard
      property={item}
      onPress={onPress}
      isFavorite={isFavorite}
      onFavoritePress={onRemove}
    />
  ),
  (p, n) =>
    p.item._id   === n.item._id &&
    p.isFavorite === n.isFavorite &&
    p.onPress    === n.onPress &&
    p.onRemove   === n.onRemove,
);

// ─── SUGGESTED CARD ───────────────────────────────────────────────────────────

interface SuggestedCardProps {
  item: Property;
  isFav: boolean;
  onPress: () => void;
  onToggleFav: () => void;
}

const SuggestedCard = React.memo(
  ({ item, isFav, onPress, onToggleFav }: SuggestedCardProps) => (
    <View style={{ marginRight: 12 }}>
      <PropertyCard
        property={item}
        onPress={onPress}
        isFavorite={isFav}
        onFavoritePress={onToggleFav}
      />
    </View>
  ),
  (p, n) =>
    p.item._id === n.item._id &&
    p.isFav    === n.isFav &&
    p.onPress  === n.onPress &&
    p.onToggleFav === n.onToggleFav,
);

// ─── AUTH WALL ────────────────────────────────────────────────────────────────

function AuthWall({ colors }: { colors: any }) {
  const nav = useNavigation<any>();
  return (
    <View style={s.center}>
      <View style={[s.emptyIcon, { backgroundColor: colors.primaryBg }]}>
        <Ionicons name="heart-outline" size={34} color={colors.primary} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>
        Sign in to view saved properties
      </Text>
      <Text style={[s.emptySub, { color: colors.textTertiary }]}>
        Save properties you love by tapping the heart icon.
      </Text>
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={() => nav.navigate('Login')}
        activeOpacity={0.88}
      >
        <Text style={s.primaryBtnText}>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.outlineBtn, { borderColor: colors.border }]}
        onPress={() => nav.navigate('Properties')}
        activeOpacity={0.75}
      >
        <Text style={[s.outlineBtnText, { color: colors.textPrimary }]}>Browse Properties</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── EMPTY STATE ─────────────────────────────────────────────────────────────

function EmptyState({ colors }: { colors: any }) {
  const nav = useNavigation<any>();
  return (
    <View style={s.center}>
      <View style={[s.emptyIcon, { backgroundColor: colors.surfaceRaised }]}>
        <Ionicons name="heart-outline" size={34} color={colors.border} />
      </View>
      <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No saved properties</Text>
      <Text style={[s.emptySub, { color: colors.textTertiary }]}>
        Tap ♥ on any listing to save it here for later.
      </Text>
      <TouchableOpacity
        style={[s.primaryBtn, { backgroundColor: colors.primary }]}
        onPress={() => nav.navigate('Properties')}
        activeOpacity={0.88}
      >
        <Text style={s.primaryBtnText}>Browse Properties</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function FavoritesScreen() {
  const nav        = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user }   = useAuth();
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();

  const [properties,   setProperties]   = useState<Property[]>([]);
  const [allProps,     setAllProps]      = useState<Property[]>([]);
  const [loading,      setLoading]       = useState(false);
  const [refreshing,   setRefreshing]    = useState(false);
  // tracks which suggested cards the user has also saved in this session
  const [sugFavIds,    setSugFavIds]     = useState<Set<string>>(new Set());

  // ── Load favorites ──────────────────────────────────────────────────────────
  const load = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const [favs, all] = await Promise.all([
        getFavorites(user.id),
        getProperties(),
      ]);
      setProperties(Array.isArray(favs) ? favs.filter(p => p?._id) : []);
      setAllProps(all);
    } catch {
      setProperties([]);
    } finally {
      isRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // ── Remove a saved property ─────────────────────────────────────────────────
  const handleRemove = useCallback(async (propertyId: string) => {
    if (!user?.id || !propertyId) return;
    setProperties(prev => prev.filter(p => p?._id !== propertyId));
    await removeFavorite(user.id, propertyId);
  }, [user?.id]);

  // ── Suggested properties logic ──────────────────────────────────────────────
  // Computed once per render: properties similar to any of the user's favorites
  // that the user has NOT already saved.
  const suggested = useMemo<Property[]>(() => {
    if (properties.length === 0 || allProps.length === 0) return [];
    const favIdSet   = new Set(properties.map(p => p._id));
    const favTypes   = new Set(properties.map(p => p.propertyType).filter(Boolean));
    const favSubTypes = new Set(properties.map(p => p.subType).filter(Boolean));
    const favAreas   = new Set(properties.map(p => p.area).filter(Boolean));

    // Score each non-favorited property: +1 for type match, +1 for subType, +1 for area
    const scored = allProps
      .filter(p => !favIdSet.has(p._id))
      .map(p => {
        let score = 0;
        if (favTypes.has(p.propertyType))  score += 3;
        if (favSubTypes.has(p.subType))    score += 2;
        if (favAreas.has(p.area))          score += 1;
        return { p, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(({ p }) => p);

    return scored;
  }, [properties, allProps]);

  // Toggle favorite on a suggested card
  const toggleSugFav = useCallback(async (item: Property) => {
    if (!user?.id) { nav.navigate('Login'); return; }
    const isFav = sugFavIds.has(item._id);
    setSugFavIds(prev => {
      const n = new Set(prev);
      isFav ? n.delete(item._id) : n.add(item._id);
      return n;
    });
    if (isFav) {
      await removeFavorite(user.id, item._id);
      setProperties(prev => prev.filter(p => p._id !== item._id));
    } else {
      await addFavorite(user.id, item._id, item);
      setProperties(prev => [...prev, item]);
    }
  }, [user?.id, sugFavIds, nav]);

  // ── Stable callbacks for FavCard (avoid new arrow per render) ──────────────
  // Keyed by property ID so they never change for the same item.
  const pressCallbacks = useMemo(() => {
    const map: Record<string, () => void> = {};
    properties.forEach(p => {
      map[`press_${p._id}`]  = () => nav.navigate('PropertyDetail', { propertyId: p._id });
      map[`remove_${p._id}`] = () => handleRemove(p._id);
    });
    return map;
  }, [properties, nav, handleRemove]);

  const keyExtractor = useCallback(
    (item: Property, i: number) => item?._id ?? String(i), [],
  );

  const renderItem = useCallback(({ item }: { item: Property }) => {
    if (!item?._id) return null;
    return (
      <FavCard
        item={item}
        isFavorite={true}
        onPress={pressCallbacks[`press_${item._id}`] ?? (() => nav.navigate('PropertyDetail', { propertyId: item._id }))}
        onRemove={pressCallbacks[`remove_${item._id}`] ?? (() => handleRemove(item._id))}
      />
    );
  }, [pressCallbacks, nav, handleRemove]);

  const bottomPad = insets.bottom + BOTTOM_NAV_HEIGHT + 16;

  // ── Auth gate ────────────────────────────────────────────────────────────
  if (!user?.id) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Saved</Text>
        </View>
        <AuthWall colors={colors} />
      </SafeAreaView>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[s.header, { borderBottomColor: colors.border }]}>
          <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Saved</Text>
        </View>
        <View style={s.skeletonRow}>
          <PropertySkeleton />
          <PropertySkeleton />
        </View>
        <View style={[s.skeletonRow, { marginTop: COL_GAP }]}>
          <PropertySkeleton />
          <PropertySkeleton />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.textPrimary }]}>Saved</Text>
        {properties.length > 0 && (
          <View style={[s.countBadge, { backgroundColor: colors.primaryBg }]}>
            <Text style={[s.countText, { color: colors.primary }]}>{properties.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={properties}
        keyExtractor={keyExtractor}
        numColumns={2}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={[s.listContent, { paddingBottom: bottomPad }]}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={renderItem}
        // ── Suggested Properties as ListFooterComponent ─────────────────────
        ListFooterComponent={
          suggested.length > 0 ? (
            <View style={[s.sugSection, { borderTopColor: colors.borderLight }]}>
              {/* Section header */}
              <View style={s.sugHeader}>
                <View style={[s.sugHeaderDot, { backgroundColor: colors.primary }]} />
                <Text style={[s.sugTitle, { color: colors.textPrimary }]}>
                  You Might Also Like
                </Text>
              </View>
              <Text style={[s.sugSub, { color: colors.textTertiary }]}>
                Based on properties you've saved
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.sugScroll}
              >
                {suggested.map(item => (
                  <SuggestedCard
                    key={item._id}
                    item={item}
                    isFav={sugFavIds.has(item._id)}
                    onPress={() => nav.navigate('PropertyDetail', { propertyId: item._id })}
                    onToggleFav={() => toggleSugFav(item)}
                  />
                ))}
              </ScrollView>
            </View>
          ) : null
        }
        ListEmptyComponent={<EmptyState colors={colors} />}
      />
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  countBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  countText: { fontSize: 13, fontWeight: '700' },

  skeletonRow: {
    flexDirection: 'row',
    paddingHorizontal: GUTTER,
    gap: COL_GAP,
    marginTop: 12,
  },

  columnWrapper: {
    paddingHorizontal: GUTTER,
    marginBottom: COL_GAP,
    justifyContent: 'space-between',
  },
  listContent: { paddingTop: 12, flexGrow: 1 },

  // Empty / auth wall
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 20,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  primaryBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    width: '100%',
    paddingVertical: 13,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },

  // Suggested section
  sugSection: {
    marginTop: SPACE['2xl'],
    paddingTop: SPACE.xl,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: GUTTER,
    marginBottom: 4,
  },
  sugHeaderDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sugTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sugSub: {
    fontSize: 12,
    paddingHorizontal: GUTTER,
    marginBottom: SPACE.md,
  },
  sugScroll: {
    paddingLeft: GUTTER,
    paddingRight: SPACE.lg,
    paddingBottom: 4,
  },
});
