import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Animated,
  TextInput, Linking, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getProperties } from '../services/api';
import { Property } from '../types/Property';
import { getFullImageUrl } from '../utils/imageUrl';
import AnimatedPressable from '../components/AnimatedPressable';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/ThemeContext';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';

// ─── BUILDER CARD ─────────────────────────────────────────────────────────────
function BuilderCard({ property, index, colors }: { property: Property; index: number; colors: any }) {
  const nav = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 80, useNativeDriver: true }),
    ]).start();
  }, []);

  const image = getFullImageUrl(property.images?.[0]);
  const priceText = property.priceFrom
    ? `₹${property.priceFrom} – ₹${property.priceTo || '...'}`
    : property.price ? `₹${property.price}` : 'Price on Request';

  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <AnimatedPressable onPress={() => nav.navigate('PropertyDetail', { propertyId: property._id })}>
        <View>
          {/* Cover image */}
          <View style={styles.imgWrap}>
            <Image
              source={image ? { uri: image } : require('../../assets/placeholder.png')}
              style={styles.img}
              contentFit="cover"
              transition={200}
              cachePolicy="memory-disk"
            />
            {property.badge && (
              <View style={[styles.badge, property.badge === 'Under Construction' ? styles.badgeOrange : styles.badgeGreen]}>
                <Text style={styles.badgeText}>{property.badge}</Text>
              </View>
            )}
            {property.rera ? (
              <View style={styles.reraTag}>
                <Ionicons name="shield-checkmark" size={10} color="#fff" />
                <Text style={styles.reraText}>RERA</Text>
              </View>
            ) : null}
            {(property.images?.length ?? 0) > 1 && (
              <View style={styles.imgCount}>
                <Ionicons name="images-outline" size={10} color="#fff" />
                <Text style={styles.imgCountText}>{property.images.length}</Text>
              </View>
            )}
          </View>

          {/* Info */}
          <View style={styles.info}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {property.title}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
              <Text style={[styles.location, { color: colors.textTertiary }]} numberOfLines={1}>
                {property.area}, {property.city}
              </Text>
            </View>

            {/* Beds / sqft row */}
            <View style={styles.statsRow}>
              {(property.beds?.length ?? 0) > 0 && (
                <View style={styles.statItem}>
                  <Ionicons name="bed-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>
                    {property.beds?.join(', ')}
                  </Text>
                </View>
              )}
              {property.sqft ? (
                <View style={styles.statItem}>
                  <Ionicons name="resize-outline" size={12} color={colors.textSecondary} />
                  <Text style={[styles.statText, { color: colors.textSecondary }]}>{property.sqft}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.cardFooter}>
              <Text style={[styles.price, { color: colors.primary }]}>{priceText}</Text>
              {property.projectEndDate ? (
                <View style={[styles.possessionTag, { backgroundColor: colors.statusApproved + '18' }]}>
                  <Text style={[styles.possessionText, { color: colors.statusApproved }]}>
                    Possession: {new Date(property.projectEndDate).getFullYear()}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* CTA row */}
            <View style={styles.ctaRow}>
              {property.contactPhone ? (
                <AnimatedPressable
                  style={[styles.ctaBtn, { borderColor: colors.accent + '55', backgroundColor: colors.accent + '10' }]}
                  onPress={() => Linking.openURL(`tel:${property.contactPhone}`)}
                >
                  <View style={styles.ctaBtnInner}>
                    <Ionicons name="call-outline" size={13} color={colors.accent} />
                    <Text style={[styles.ctaBtnText, { color: colors.accent }]}>Call</Text>
                  </View>
                </AnimatedPressable>
              ) : null}
              {property.whatsappNumber ? (
                <AnimatedPressable
                  style={[styles.ctaBtn, { borderColor: '#25d36640', backgroundColor: '#25d36610' }]}
                  onPress={() => Linking.openURL(`whatsapp://send?phone=${property.whatsappNumber}`)}
                >
                  <View style={styles.ctaBtnInner}>
                    <Ionicons name="logo-whatsapp" size={13} color="#25d366" />
                    <Text style={[styles.ctaBtnText, { color: '#25d366' }]}>WhatsApp</Text>
                  </View>
                </AnimatedPressable>
              ) : null}
              {property.brochureUrl ? (
                <AnimatedPressable
                  style={[styles.ctaBtn, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryBg }]}
                  onPress={() => Linking.openURL(`https://www.ivantaproperty.com${property.brochureUrl}`)}
                >
                  <View style={styles.ctaBtnInner}>
                    <Ionicons name="document-outline" size={13} color={colors.primary} />
                    <Text style={[styles.ctaBtnText, { color: colors.primary }]}>Brochure</Text>
                  </View>
                </AnimatedPressable>
              ) : null}
            </View>
          </View>
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

const MemoizedBuilderCard = React.memo(BuilderCard, (p, n) =>
  p.property._id === n.property._id && p.index === n.index
);

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
export default function BuildersScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const [projects, setProjects] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!user) return;
    Animated.timing(heroAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    getProperties({ type: 'new' }).then(all => {
      const newProjects = all.filter(p => p.isNewProject);
      setProjects(newProjects);
      setFiltered(newProjects);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (!search.trim()) {
      setFiltered(projects);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(projects.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.area?.toLowerCase().includes(q) ||
      p.subType?.toLowerCase().includes(q)
    ));
  }, [search, projects, user]);

  // ── AUTH GATE ──
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.authCenter}>
          <View style={[styles.authIconWrap, { backgroundColor: colors.accent + '18' }]}>
            <Ionicons name="construct-outline" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.authTitle, { color: colors.textPrimary }]}>Sign in to explore projects</Text>
          <Text style={[styles.authSub, { color: colors.textTertiary }]}>
            Browse RERA-approved new projects, contact builders directly, and download brochures.
          </Text>
          <PremiumGradientButton
            title="Sign In / Register"
            icon="person-outline"
            onPress={() => nav.navigate('Login')}
            style={{ width: '100%', marginBottom: 12 }}
          />
        </View>
      </View>
    );
  }

  const WHY_ITEMS = [
    { icon: 'shield-checkmark-outline', label: 'RERA Protected',   color: colors.statusApproved, bg: colors.statusApproved + '18' },
    { icon: 'cash-outline',             label: 'Flexible Payment', color: colors.accent,         bg: colors.accent + '18'         },
    { icon: 'sparkles-outline',         label: 'Brand New',        color: colors.statusPending,  bg: colors.statusPending + '18'  },
    { icon: 'document-text-outline',    label: 'Clear Title',      color: colors.roleBuilder,    bg: colors.roleBuilder + '18'    },
    { icon: 'people-outline',           label: 'Direct Builder',   color: colors.primary,        bg: colors.primaryBg              },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* Hero */}
        <Animated.View style={[styles.hero, { opacity: heroAnim, backgroundColor: colors.accent }]}>
          <Text style={styles.heroTitle}>Explore New Projects</Text>
          <Text style={styles.heroSub}>
            RERA-approved projects from trusted builders across Rajkot
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{projects.length}+</Text>
              <Text style={styles.heroStatLabel}>Projects</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>RERA</Text>
              <Text style={styles.heroStatLabel}>Approved</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>0</Text>
              <Text style={styles.heroStatLabel}>Brokerage</Text>
            </View>
          </View>
        </Animated.View>

        {/* Search */}
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Search projects, area, type..."
            placeholderTextColor={colors.textTertiary}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <AnimatedPressable onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </AnimatedPressable>
          ) : null}
        </View>

        {/* Why new projects */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Why Buy a New Project?</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.whyRow}>
              {WHY_ITEMS.map(w => (
                <View key={w.label} style={styles.whyCard}>
                  <View style={[styles.whyIcon, { backgroundColor: w.bg }]}>
                    <Ionicons name={w.icon as any} size={18} color={w.color} />
                  </View>
                  <Text style={[styles.whyLabel, { color: colors.textSecondary }]}>{w.label}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Projects list */}
        <View style={styles.section}>
          <View style={styles.listHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              {search ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : 'All Projects'}
            </Text>
            <AnimatedPressable onPress={() => nav.navigate('Properties', { type: 'new' })}>
              <View style={[styles.viewAllBtn, { borderColor: colors.primary }]}>
                <Text style={[styles.viewAllText, { color: colors.primary }]}>View All</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </AnimatedPressable>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loaderText, { color: colors.textTertiary }]}>Loading projects...</Text>
            </View>
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="construct-outline" size={48} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No projects found</Text>
            </View>
          ) : (
            filtered.map((p, i) => (
              <MemoizedBuilderCard key={p._id} property={p} index={i} colors={colors} />
            ))
          )}
        </View>


      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Auth wall
  authCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  authIconWrap: {
    width: 96, height: 96, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  authTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  authSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },

  // Hero
  hero: { paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center' },
  heroTitle: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  heroStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 20, gap: 16,
  },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontSize: 18, fontWeight: '900', color: '#fff' },
  heroStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.3)' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 16, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginBottom: 12 },

  // Why chips
  whyRow: { flexDirection: 'row', gap: 10 },
  whyCard: { alignItems: 'center', width: 80 },
  whyIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  whyLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },

  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  viewAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  viewAllText: { fontSize: 12, fontWeight: '600' },

  // Project card
  card: {
    borderRadius: 14, marginBottom: 16, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  imgWrap: { height: 200, position: 'relative' },
  img: { width: '100%', height: '100%' },
  badge: {
    position: 'absolute', top: 10, left: 10,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  badgeGreen: { backgroundColor: '#059669' },
  badgeOrange: { backgroundColor: '#f59e0b' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  reraTag: {
    position: 'absolute', bottom: 10, left: 10,
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#059669', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 12,
  },
  reraText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  imgCount: {
    position: 'absolute', bottom: 10, right: 10,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 12,
  },
  imgCountText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  info: { padding: 14 },
  title: { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  location: { fontSize: 12, flex: 1 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 11 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  price: { fontSize: 16, fontWeight: '800' },
  possessionTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  possessionText: { fontSize: 10, fontWeight: '700' },

  ctaRow: { flexDirection: 'row', gap: 8 },
  ctaBtn: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 8, alignItems: 'center' },
  ctaBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ctaBtnText: { fontSize: 12, fontWeight: '700' },

  loader: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loaderText: { fontSize: 13 },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, fontWeight: '600' },

  // Builder CTA
  builderCta: { borderRadius: 14, padding: 20, alignItems: 'center', borderWidth: 1 },
  builderCtaTitle: { fontSize: 18, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  builderCtaSub: { fontSize: 12, textAlign: 'center', lineHeight: 17, marginBottom: 14 },
  builderCtaBtn: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  builderCtaBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
