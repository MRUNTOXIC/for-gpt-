import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  ScrollView, Dimensions, Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, UrlTile, Region } from '../components/CustomMapView';
import * as Location from 'expo-location';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Image } from 'expo-image';
import { RootStackParamList } from '../navigation';
import { getProperties } from '../services/api';
import { nearbyProperties, propertyLocation, LatLng, getDistanceKm } from '../services/location';
import type { Property } from '../types/Property';
import { getFullImageUrl } from '../utils/imageUrl';
import type { MobileFilters } from '../filters/types';
import { applyFilters } from '../services/filterEngine';
import {
  getPropertyCategoryMeta, PROPERTY_CATEGORIES,
  PropertyCategoryType, getPropertyCategory, isPropertyInCategory
} from '../utils/propertyCategory';
import { useTheme } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

function extractPriceValue(price?: string, priceFrom?: string): number | null {
  const str = priceFrom || price;
  if (!str) return null;
  const clean = str.replace(/[₹,\s]/g, '').toLowerCase();
  let mul = 1, num = clean;
  if (clean.includes('cr')) { mul = 10000000; num = clean.replace(/cr(ore)?/g, ''); }
  else if (clean.includes('l') || clean.includes('lakh')) { mul = 100000; num = clean.replace(/l(akh)?/g, ''); }
  else if (clean.includes('k')) { mul = 1000; num = clean.replace(/k/g, ''); }
  const n = parseFloat(num);
  return isNaN(n) ? null : n * mul;
}

function extractSqftValue(sqft?: string): number | null {
  if (!sqft) return null;
  const clean = sqft.replace(/[,\s]/g, '').match(/[\d.]+/);
  if (!clean) return null;
  const n = parseFloat(clean[0]);
  return isNaN(n) ? null : n;
}

const formatMarkerPrice = (p: Property) => {
  const price = p.price?.trim();
  const priceFrom = p.priceFrom?.trim();

  if (price) {
    let pr = price.replace('₹', '').trim();
    if (pr) {
      pr = pr.replace(/Lakh/gi, 'L').replace(/Crore/gi, 'Cr').replace(/\s/g, '');
      return `₹${pr}`;
    }
  }

  if (priceFrom) {
    let pf = priceFrom.replace('₹', '').trim();
    if (pf) {
      pf = pf.replace(/Lakh/gi, 'L').replace(/Crore/gi, 'Cr').replace(/\s/g, '');
      return `₹${pf}`;
    }
  }

  return 'Call';
};

export default function NearbyMapScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'NearbyMap'>>();
  const { colors, mode } = useTheme();
  const initialLocation = route.params?.initialLocation;

  const [location, setLocation] = useState<LatLng | null>(initialLocation ?? null);
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PropertyCategoryType>('all');

  const filters = route.params?.filters;

  const mapRef = useRef<MapView>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  const loadLocation = async () => {
    setStatus('requesting');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        setLoading(false);
        return;
      }
      setStatus('granted');

      const current = await Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced
      });
      const coords = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setLocation(coords);

      mapRef.current?.animateToRegion({
        ...coords,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      }, 1000);

    } catch {
      setStatus('denied');
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      const data = await getProperties();
      setAllProperties(data);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProperties = useMemo(() => {
    let list = filters ? applyFilters(allProperties, filters) : [...allProperties];

    if (filters?.nearbyOnly && location) {
      list = list.filter(p => {
        if (!p.latitude || !p.longitude) return false;
        const dist = getDistanceKm(location, { latitude: Number(p.latitude), longitude: Number(p.longitude) });
        return dist <= 5;
      });
    }

    return list;
  }, [allProperties, filters, location]);

  const displayProperties = useMemo(() => {
    let list = filteredProperties.filter(p => propertyLocation(p) !== null);
    if (!showAll && location) {
      list = nearbyProperties(list, location, 10).slice(0, 50);
    }
    if (selectedCategory !== 'all') {
      list = list.filter(p => isPropertyInCategory(p, selectedCategory));
    }
    return list;
  }, [filteredProperties, location, showAll, selectedCategory]);

  useEffect(() => {
    if (displayProperties.length > 0) {
      setTracksViewChanges(true);
      const timer = setTimeout(() => setTracksViewChanges(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [displayProperties, selectedPropertyId, selectedCategory]);

  // Default region center: fallback to Rajkot coordinates if user location is null
  const defaultCenter = useMemo(() => {
    if (location) return location;
    const firstWithCoords = displayProperties.find(p => propertyLocation(p) !== null);
    if (firstWithCoords) {
      const coords = propertyLocation(firstWithCoords);
      if (coords) return coords;
    }
    return { latitude: 22.2858, longitude: 70.7712 };
  }, [location, displayProperties]);

  const region: Region = {
    latitude: defaultCenter.latitude,
    longitude: defaultCenter.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };

  const onMarkerPress = (property: Property, index: number) => {
    setSelectedPropertyId(property._id);
    setTracksViewChanges(true);
    scrollRef.current?.scrollTo({ x: index * (width * 0.75 + 12), animated: true });
  };

  const activeFilterCount = filters ?
    (filters.searchQuery?.trim() ? 1 : 0) +
    (filters.selectedTypes?.length || 0) +
    (filters.selectedSubTypes?.length || 0) +
    (filters.selectedBedrooms?.length || 0) +
    (filters.minPrice || filters.maxPrice ? 1 : 0) +
    (filters.minSqft || filters.maxSqft ? 1 : 0) +
    (filters.selectedFacing?.length || 0) +
    (filters.selectedAreas?.length || 0) +
    (filters.nearbyOnly ? 1 : 0)
    : 0;

  // Floating header now has its own back button (native header is hidden)
  React.useLayoutEffect(() => {}, []);   // no-op — keep hook order stable

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        showsUserLocation={status === 'granted'}
        showsMyLocationButton={false}
        showsCompass={false}
      >
        <UrlTile
          urlTemplate={mode === 'dark' ? "https://a.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png" : "https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"}
          maximumZ={19}
          maximumNativeZ={19}
          tileSize={256}
          flipY={false}
        />
        {displayProperties.map((property, idx) => {
          const coords = propertyLocation(property);
          if (!coords) return null;
          const isSelected = selectedPropertyId === property._id;
          const meta = getPropertyCategoryMeta(property);

          return (
            <Marker
              key={property._id}
              coordinate={coords}
              onPress={() => onMarkerPress(property, idx)}
              tracksViewChanges={tracksViewChanges || isSelected}
            >
              <View style={[styles.pinWrapper, isSelected && styles.pinWrapperActive]}>
                {/* Category Badge Pin (No Price) */}
                <View style={[
                  styles.pinBadge,
                  { backgroundColor: isSelected ? '#1e293b' : meta.color },
                  isSelected && styles.pinBadgeActive
                ]}>
                  <Ionicons name={meta.icon} size={12} color="#ffffff" />
                  <Text style={styles.pinCategoryText}>{meta.label}</Text>
                </View>

                {/* Pin Pointer Arrow */}
                <View style={[styles.pinPointer, { borderTopColor: isSelected ? '#1e293b' : meta.color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* MODERN FLOATING HEADER WITH CATEGORY CHIPS */}
      <View style={[styles.floatingHeader, { paddingTop: insets.top + 8 }]}>
        <View style={[styles.headerContent, { backgroundColor: colors.surface }]}>
          {/* Back button */}
          <TouchableOpacity
            style={[styles.circleBtn, { backgroundColor: colors.surfaceSunken }]}
            onPress={() => nav.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.searchBar}>
            <Text style={[styles.searchTitle, { color: colors.textPrimary }]}>
              {!showAll ? 'Nearby Properties' : 'Property Map'}
            </Text>
            <Text style={[styles.searchSub, { color: colors.textTertiary }]}>
              {displayProperties.length} pins shown
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.togglePill,
              { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder },
              !showAll && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={async () => {
              if (showAll) {
                if (!location) await loadLocation();
                setShowAll(false);
              } else {
                setShowAll(true);
              }
            }}
          >
            <Ionicons
              name={!showAll ? 'location' : 'location-outline'}
              size={16}
              color={!showAll ? '#fff' : colors.primary}
            />
            <Text style={[styles.toggleText, { color: !showAll ? '#fff' : colors.primary }]}>
              {!showAll ? 'Nearby' : 'All'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.circleBtn,
              { backgroundColor: activeFilterCount > 0 ? colors.primaryBg : colors.surfaceSunken },
            ]}
            onPress={() => {
              nav.navigate('Filters', {
                properties: allProperties,
                initial: filters ?? undefined,
                returnTo: 'NearbyMap',
                returnParams: { initialLocation: location ?? undefined },
              });
            }}
          >
            <View>
              <Ionicons name="options-outline" size={20} color={colors.primary} />
              {activeFilterCount > 0 && <View style={styles.filterBadge} />}
            </View>
          </TouchableOpacity>
        </View>

        {/* CATEGORY FILTER CHIPS */}
        <View style={styles.chipsRowContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsScroll}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                { backgroundColor: colors.surface, borderColor: colors.border },
                selectedCategory === 'all' && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
              ]}
              onPress={() => setSelectedCategory('all')}
            >
              <Text style={[
                styles.categoryChipText,
                { color: selectedCategory === 'all' ? '#fff' : colors.textSecondary },
              ]}>
                All ({filteredProperties.length})
              </Text>
            </TouchableOpacity>

            {(['flat', 'bungalow', 'tenement', 'commercial', 'plot'] as const).map(catKey => {
              const meta = PROPERTY_CATEGORIES[catKey];
              const isCatSelected = selectedCategory === catKey;
              const count = filteredProperties.filter(p => isPropertyInCategory(p, catKey)).length;

              return (
                <TouchableOpacity
                  key={catKey}
                  style={[
                    styles.categoryChip,
                    { borderColor: meta.borderColor, backgroundColor: isCatSelected ? meta.color : meta.bgColor },
                  ]}
                  onPress={() => setSelectedCategory(catKey)}
                >
                  <Ionicons name={meta.icon} size={13} color={isCatSelected ? '#fff' : meta.color} />
                  <Text style={[styles.categoryChipText, { color: isCatSelected ? '#fff' : meta.color }]}>
                    {meta.pluralLabel} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>

      {/* FLOATING ACTION BUTTONS */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={[styles.fab, { backgroundColor: colors.surface }]} onPress={loadLocation}>
          <Ionicons name="navigate" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* MODERN BOTTOM LIST */}
      <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 15 }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={width * 0.75 + 12}
          decelerationRate="fast"
          contentContainerStyle={styles.listContainer}
        >
          {displayProperties.map((property) => {
            const coords = propertyLocation(property);
            const dist = location && coords ? getDistanceKm(location, coords) : null;
            const img = getFullImageUrl(property.images?.[0]);

            const priceFrom = property.priceFrom?.trim();
            const price = property.price?.trim();
            const priceText = priceFrom
              ? `₹${priceFrom}`
              : (price ? `₹${price}` : 'Call for Price');

            return (
              <TouchableOpacity
                key={property._id}
                style={[
                  styles.card,
                  { backgroundColor: colors.surface },
                  selectedPropertyId === property._id && { borderWidth: 2, borderColor: colors.primary },
                ]}
                onPress={() => nav.navigate('PropertyDetail', { propertyId: property._id })}
                activeOpacity={0.9}
              >
                <Image
                  source={img ? { uri: img } : require('../../assets/placeholder.png')}
                  style={[styles.cardImg, { backgroundColor: colors.surfaceSunken }]}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardPrice, { color: colors.primary }]} numberOfLines={1}>{priceText}</Text>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>{property.title}</Text>
                  <View style={styles.cardLocRow}>
                    <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
                    <Text style={[styles.cardLoc, { color: colors.textTertiary }]} numberOfLines={1}>{property.area}</Text>
                    {dist !== null && (
                      <Text style={[styles.cardDist, { color: colors.textTertiary }]}>
                        {' '}• {dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {loading && (
        <View style={[styles.loaderOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {status === 'denied' && !location && (
        <View style={[styles.errorOverlay, { backgroundColor: colors.background }]}>
          <Ionicons name="location-outline" size={60} color={colors.primary} />
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>Location Access Required</Text>
          <Text style={[styles.errorSub, { color: colors.textSecondary }]}>
            Please enable GPS to explore properties near you.
          </Text>
          <TouchableOpacity style={[styles.errorBtn, { backgroundColor: colors.primary }]} onPress={loadLocation}>
            <Text style={styles.errorBtnText}>Allow Access</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Custom Category Pins
  pinWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinWrapperActive: {
    zIndex: 999,
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  pinBadgeActive: {
    borderColor: '#ffffff',
    borderWidth: 2,
    elevation: 8,
    transform: [{ scale: 1.1 }],
  },
  pinCategoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  pinPointer: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },

  // Category Chips Row
  chipsRowContainer: {
    marginTop: 8,
  },
  categoryChipsScroll: {
    paddingHorizontal: 2,
    gap: 6,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingHorizontal: 12,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    gap: 8,
  },
  circleBtn: {
    width: 40, height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: -2, right: -2,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 1,
    borderColor: '#fff',
  },
  searchBar: {
    flex: 1,
    marginLeft: 4,
  },
  searchTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  searchSub: {
    fontSize: 11,
    marginTop: 1,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // FAB
  fabContainer: {
    position: 'absolute',
    right: 16,
    bottom: 230,
    gap: 12,
  },
  fab: {
    width: 46, height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },

  // Bottom Sheet Properties
  bottomSheet: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: 'transparent',
  },
  listContainer: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingTop: 10,
    paddingBottom: 20,
  },
  card: {
    width: width * 0.75,
    borderRadius: 12,
    flexDirection: 'row',
    marginRight: 12,
    padding: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardSelected: {},  // selection handled inline via colors.primary
  cardImg: {
    width: 80, height: 80,
    borderRadius: 14,
  },
  cardInfo: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  cardLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLoc: {
    fontSize: 11,
  },
  cardDist: {
    fontSize: 11,
    fontWeight: '600',
  },

  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },

  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 20,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
  errorBtn: {
    marginTop: 24,
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 16,
  },
  errorBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
