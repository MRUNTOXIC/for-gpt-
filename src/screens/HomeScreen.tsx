import React, {
  useEffect, useState, useCallback, useRef, useMemo,
} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Animated, Platform, FlatList, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PropertyCard from '../components/PropertyCard';
import DrawerMenu from '../components/DrawerMenu';
import FilterChip from '../components/modern/FilterChip';
import { RootStackParamList } from '../navigation';
import { GLOBAL_CARD_WIDTH, RADIUS, SPACE, BOTTOM_NAV_HEIGHT } from '../theme/layout';
import {
  getPropertiesByCategory, getProperties,
  getFavorites, addFavorite, removeFavorite,
} from '../services/api';
import { Property } from '../types/Property';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/ThemeContext';

const { width: SW } = Dimensions.get('window');
const CARD_SPACING  = 12;
const HERO_IMAGE    = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=1200';

const CATEGORY_ORDER = [
  'Featured Property',
  'Luxury Property',
  'Popular Property',
  'Upcoming Projects',
];

const CATEGORY_LINKS: Record<string, { type?: string; category?: string }> = {
  'Upcoming Projects': { type: 'new' },
};

const BROWSE_TYPES = [
  { id: 'buy',        label: 'Buy',         icon: 'home-outline'      },
  { id: 'rent',       label: 'Rent',        icon: 'key-outline'       },
  { id: 'commercial', label: 'Commercial',  icon: 'business-outline'  },
  { id: 'plot',       label: 'Plots',       icon: 'map-outline'       },
  { id: 'new',        label: 'Projects',    icon: 'sparkles-outline'  },
  { id: 'pg',         label: 'PG / Hostel', icon: 'people-outline'    },
] as const;

const HERO_SCRIM: readonly [string, string, string] = ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.48)', 'rgba(0,0,0,0.72)'];

// ─── SECTION HEADER ───────────────────────────────────────────────────────────

function SectionHeader({
  title, count, onSeeAll, colors,
}: {
  title: string; count: number; onSeeAll: () => void; colors: any;
}) {
  return (
    <View style={sh.row}>
      <View>
        <Text style={[sh.title, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[sh.sub, { color: colors.textTertiary }]}>
          {count} {count === 1 ? 'property' : 'properties'}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onSeeAll}
        style={[sh.btn, { borderColor: colors.border }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel={`See all ${title}`}
      >
        <Text style={[sh.btnText, { color: colors.primary }]}>See all</Text>
        <Ionicons name="chevron-forward" size={13} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const sh = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: SPACE.lg,
    marginBottom: 4,
  },
  title: { fontSize: 19, fontWeight: '800', letterSpacing: -0.3 },
  sub:   { fontSize: 12, marginTop: 2 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  btnText: { fontSize: 12, fontWeight: '700' },
});

// ─── CAROUSEL ROW ─────────────────────────────────────────────────────────────

interface CarouselRowProps {
  cat: string;
  items: Property[];
  favoriteIds: Set<string>;
  onToggle: (id: string) => void;
  onSeeAll: () => void;
  onCard: (id: string) => void;
  colors: any;
}

const CarouselRow = React.memo(function CarouselRow({
  cat, items, favoriteIds, onToggle, onSeeAll, onCard, colors,
}: CarouselRowProps) {
  const renderCard = useCallback(({ item }: { item: Property }) => (
    <View style={{ marginRight: CARD_SPACING }}>
      <PropertyCard
        property={item}
        onPress={() => onCard(item._id)}
        isFavorite={favoriteIds.has(item._id)}
        onFavoritePress={() => onToggle(item._id)}
      />
    </View>
  ), [favoriteIds, onCard, onToggle]);

  const keyExtractor = useCallback((p: Property) => p._id, []);

  return (
    <View style={cs.section}>
      <SectionHeader title={cat} count={items.length} onSeeAll={onSeeAll} colors={colors} />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderCard}
        contentContainerStyle={{ paddingRight: SPACE.lg, paddingTop: 4 }}
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        getItemLayout={(_, i) => ({
          length: GLOBAL_CARD_WIDTH + CARD_SPACING,
          offset: (GLOBAL_CARD_WIDTH + CARD_SPACING) * i,
          index: i,
        })}
      />
    </View>
  );
});

const cs = StyleSheet.create({
  section: { paddingLeft: SPACE.lg, marginTop: 28 },
});

// ─── SUGGESTED STYLES ────────────────────────────────────────────────────────
const sug = StyleSheet.create({
  section: {
    paddingLeft: 0,
    marginTop: 32,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: SPACE.lg,
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 12,
    marginTop: 2,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  seeAllText: { fontSize: 12, fontWeight: '700' },
});

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user }   = useAuth();
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();

  const [byCategory,  setByCategory]  = useState<Record<string, Property[]>>({});
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [favProps,    setFavProps]    = useState<Property[]>([]);
  const [drawerOpen,  setDrawerOpen]  = useState(false);

  // Entrance animation
  const fade  = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(14)).current;
  const ran   = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const loadData = useCallback(async () => {
    const [cats, all] = await Promise.all([
      getPropertiesByCategory(),
      getProperties(),
    ]);
    setByCategory(cats);
    setAllProperties(all);
    setTotalCount(Object.values(cats).reduce((s, a) => s + a.length, 0));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    getFavorites(user.id).then(f => {
      setFavProps(f);
      setFavoriteIds(new Set(f.map(p => p._id)));
    });
  }, [user?.id]));

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user?.id) { nav.navigate('Login'); return; }
    const isFav = favoriteIds.has(id);
    setFavoriteIds(prev => { const n = new Set(prev); isFav ? n.delete(id) : n.add(id); return n; });
    // Find the property object so it gets cached for offline use
    const allProps = Object.values(byCategory).flat();
    const prop = allProps.find(p => p._id === id);
    isFav
      ? await removeFavorite(user.id, id)
      : await addFavorite(user.id, id, prop ?? undefined);
  }, [user?.id, favoriteIds, nav, byCategory]);

  // ── Suggested Properties ────────────────────────────────────────────────────
  // Only shown when the user has at least one saved property.
  // Scores all non-saved properties by similarity to saved ones.
  const suggested = useMemo<Property[]>(() => {
    if (favProps.length === 0 || allProperties.length === 0) return [];
    const favIdSet    = new Set(favProps.map(p => p._id));
    const favTypes    = new Set(favProps.map(p => p.propertyType).filter(Boolean));
    const favSubTypes = new Set(favProps.map(p => p.subType).filter(Boolean));
    const favAreas    = new Set(favProps.map(p => p.area).filter(Boolean));

    return allProperties
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
  }, [favProps, allProperties]);

  const categories = useMemo(
    () => CATEGORY_ORDER.filter(c => byCategory[c]?.length > 0),
    [byCategory],
  );

  // Easter egg: 5 taps on headline → test notifications
  const tapCount = useRef(0);
  const handleHeadlineTap = useCallback(() => {
    tapCount.current++;
    if (tapCount.current >= 5) { tapCount.current = 0; (global as any).__triggerTestNotifications?.(); }
  }, []);

  const firstName      = user?.name?.split(' ')[0] || 'there';
  const builderCount   = byCategory['Upcoming Projects']?.length ?? 0;
  const heroPaddingTop = insets.top + SPACE.base;

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <DrawerMenu
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(screen, params) => {
          setDrawerOpen(false);
          setTimeout(() => nav.navigate(screen as any, params as any), 50);
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={Platform.OS === 'ios'}
        overScrollMode="never"
        contentContainerStyle={{ paddingBottom: insets.bottom + BOTTOM_NAV_HEIGHT + 24 }}
      >
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

          {/* ─────────────────── HERO ─────────────────── */}
          <View style={[s.hero, { paddingTop: heroPaddingTop }]}>
            <Image
              source={{ uri: HERO_IMAGE }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="disk"
            />
            <LinearGradient
              colors={HERO_SCRIM}
              style={StyleSheet.absoluteFillObject}
              locations={[0, 0.4, 1]}
            />

            {/* Top row */}
            <View style={s.heroTop}>
              <View style={s.heroGreet}>
                <Text style={s.heroHi}>Hello, {firstName} 👋</Text>
                <View style={s.heroLoc}>
                  <Ionicons name="location" size={12} color="#EF554B" />
                  <Text style={s.heroLocText}>Rajkot, Gujarat</Text>
                </View>
              </View>
              <View style={s.heroActions}>
                <TouchableOpacity
                  style={s.heroIconBtn}
                  onPress={() => nav.navigate('Notifications')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Notifications"
                >
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                  <View style={s.notifDot} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.avatarWrap}
                  onPress={() => nav.navigate('Profile' as any)}
                  accessibilityLabel="Profile"
                >
                  <Image
                    source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'G')}&background=EF554B&color=fff&bold=true` }}
                    style={s.avatar}
                    cachePolicy="memory-disk"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Headline */}
            <Pressable onPress={handleHeadlineTap}>
              <Text style={s.headline}>
                Find a place{'\n'}worth calling{' '}
                <Text style={s.headlineAccent}>home.</Text>
              </Text>
            </Pressable>

            {/* Stats pills */}
            <View style={s.pills}>
              <View style={s.pill}>
                <Ionicons name="home-outline" size={12} color="rgba(255,255,255,0.65)" />
                <Text style={s.pillText}>{totalCount}+ Properties</Text>
              </View>
              {builderCount > 0 && (
                <View style={s.pill}>
                  <Ionicons name="business-outline" size={12} color="rgba(255,255,255,0.65)" />
                  <Text style={s.pillText}>{builderCount}+ Projects</Text>
                </View>
              )}
            </View>

            {/* Search bar proxy */}
            <TouchableOpacity
              style={[s.searchBar, { backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.14)' }]}
              activeOpacity={0.88}
              onPress={() => nav.navigate('MainTabs' as any, { screen: 'ExploreTab' } as any)}
              accessibilityLabel="Search properties"
            >
              <Ionicons name="search" size={16} color="rgba(255,255,255,0.5)" />
              <Text style={s.searchPlaceholder}>Search properties, locations…</Text>
              <View style={s.searchFilter}>
                <Ionicons name="options-outline" size={15} color="#EF554B" />
              </View>
            </TouchableOpacity>
          </View>

          {/* ─────────────────── BROWSE CHIPS ─────────────────── */}
          <View style={[s.browseWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.browseChips}
            >
              {BROWSE_TYPES.map(t => (
                <FilterChip
                  key={t.id}
                  label={t.label}
                  icon={t.icon}
                  onPress={() => nav.navigate('Properties', { type: t.id })}
                />
              ))}
            </ScrollView>
          </View>

        </Animated.View>

        {/* ─────────────────── SUGGESTED (only when user has favorites) ─── */}
        {suggested.length > 0 && (
          <View style={sug.section}>
            {/* Header */}
            <View style={sug.headerRow}>
              <View style={sug.headerLeft}>
                <View style={[sug.dot, { backgroundColor: colors.primary }]} />
                <View>
                  <Text style={[sug.title, { color: colors.textPrimary }]}>
                    Suggested For You
                  </Text>
                  <Text style={[sug.sub, { color: colors.textTertiary }]}>
                    Based on your saved properties
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[sug.seeAllBtn, { borderColor: colors.border }]}
                onPress={() => nav.navigate('Properties')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[sug.seeAllText, { color: colors.primary }]}>See all</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Horizontal carousel */}
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={suggested}
              keyExtractor={p => p._id}
              contentContainerStyle={{ paddingLeft: SPACE.lg, paddingRight: SPACE.lg, paddingTop: 4 }}
              initialNumToRender={3}
              maxToRenderPerBatch={3}
              windowSize={3}
              removeClippedSubviews={Platform.OS === 'android'}
              getItemLayout={(_, i) => ({
                length: GLOBAL_CARD_WIDTH + 12,
                offset: (GLOBAL_CARD_WIDTH + 12) * i,
                index: i,
              })}
              renderItem={({ item }) => (
                <View style={{ marginRight: 12 }}>
                  <PropertyCard
                    property={item}
                    onPress={() => nav.navigate('PropertyDetail', { propertyId: item._id })}
                    isFavorite={favoriteIds.has(item._id)}
                    onFavoritePress={() => toggleFavorite(item._id)}
                  />
                </View>
              )}
            />
          </View>
        )}

        {/* ─────────────────── CATEGORY CAROUSELS ─────────────────── */}
        {categories.map(cat => {
          const link = CATEGORY_LINKS[cat];
          return (
            <CarouselRow
              key={cat}
              cat={cat}
              items={byCategory[cat]}
              favoriteIds={favoriteIds}
              onToggle={toggleFavorite}
              onSeeAll={() => nav.navigate('Properties', link ?? { category: cat })}
              onCard={id => nav.navigate('PropertyDetail', { propertyId: id })}
              colors={colors}
            />
          );
        })}
        {/* ─────────────────── FOOTER ─────────────────── */}
        <View style={[s.footer, { borderTopColor: colors.borderLight }]}>
          <Text style={[s.footerText, { color: colors.textTertiary }]}>
            © {new Date().getFullYear()} Ivanta Ventures LLP
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1 },

  // Hero
  hero: {
    paddingHorizontal: SPACE.lg,
    paddingBottom: SPACE.xl,
    borderBottomLeftRadius: RADIUS.xl,
    borderBottomRightRadius: RADIUS.xl,
    overflow: 'hidden',
    minHeight: 320,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACE.xl,
  },
  heroGreet:   { flex: 1 },
  heroHi:      { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  heroLoc:     { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heroLocText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  heroActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  heroIconBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  notifDot: {
    position: 'absolute', top: 10, right: 10,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#EF554B',
    borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.5)',
  },
  avatarWrap: {
    width: 40, height: 40, borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.22)',
  },
  avatar: { width: '100%', height: '100%' },

  headline: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 38,
    letterSpacing: -0.6,
    marginBottom: SPACE.base,
  },
  headlineAccent: { color: '#EF554B' },

  pills: { flexDirection: 'row', gap: SPACE.sm, marginBottom: SPACE.lg },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.10)',
    paddingHorizontal: 11, paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  pillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.base, paddingVertical: 13,
    borderWidth: 1,
  },
  searchPlaceholder: { flex: 1, fontSize: 14, color: 'rgba(255,255,255,0.4)' },
  searchFilter: {
    width: 30, height: 30, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(239,85,75,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Browse chips bar
  browseWrap: { borderBottomWidth: StyleSheet.hairlineWidth },
  browseChips: {
    paddingHorizontal: SPACE.base,
    paddingVertical: 10,
    gap: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.xl,
    marginTop: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  footerText: { fontSize: 11 },
});
