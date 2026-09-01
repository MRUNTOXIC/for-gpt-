import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Linking,
  ActivityIndicator,
  Animated,
  Share,
  Platform,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import {
  RouteProp,
  useRoute,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  getPropertyById,
  getFavorites,
  addFavorite,
  removeFavorite,
  getSimilarProperties,
} from '../services/api';

import { Property } from '../types/Property';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../auth/context';
import { getFullImageUrl } from '../utils/imageUrl';
import PropertyCard from '../components/PropertyCard';
import { useTheme } from '../theme/ThemeContext';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';
import { GLOBAL_CARD_WIDTH } from '../theme/layout';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const { width: W } = Dimensions.get('window');

const IMG_HEIGHT = W * 0.88;

const DEFAULT_PHONE = '+918460567890';

// ─────────────────────────────────────────────────────────────────────────────
// FROSTED VIEW
// ─────────────────────────────────────────────────────────────────────────────

const Frost = ({
  intensity,
  tint,
  style,
  children,
}: any) => {
  if (Platform.OS === 'android') {
    const bg =
      tint === 'dark'
        ? 'rgba(15,15,15,0.88)'
        : 'rgba(255,255,255,0.95)';

    return (
      <View
        style={[
          style,
          {
            backgroundColor: bg,
            overflow: 'hidden',
          },
        ]}
      >
        {children}
      </View>
    );
  }

  return (
    <BlurView
      intensity={intensity}
      tint={tint}
      style={[
        style,
        {
          overflow: 'hidden',
        },
      ]}
    >
      {children}
    </BlurView>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIMILAR PROPERTY CARD
// ─────────────────────────────────────────────────────────────────────────────

interface SimilarCardProps {
  property: Property;
  onPress: () => void;
}

const SimilarCard = React.memo(
  ({ property, onPress }: SimilarCardProps) => (
    <View style={{ marginRight: 12 }}>
      <PropertyCard
        property={property}
        onPress={onPress}
      />
    </View>
  ),
  (prev, next) =>
    prev.property._id === next.property._id
);

// ─────────────────────────────────────────────────────────────────────────────
// STAT BOX
// ─────────────────────────────────────────────────────────────────────────────

interface StatBoxProps {
  icon: string;
  label: string;
  value: string;
  colors: any;
}

const StatBox = React.memo(
  ({
    icon,
    label,
    value,
    colors,
  }: StatBoxProps) => (
    <View
      style={[
        stat.box,
        {
          backgroundColor: colors.surfaceSunken,
          borderColor: colors.borderLight,
        },
      ]}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={colors.textSecondary}
      />

      <View>
        <Text
          style={[
            stat.val,
            {
              color: colors.textPrimary,
            },
          ]}
        >
          {value}
        </Text>

        <Text
          style={[
            stat.lbl,
            {
              color: colors.textTertiary,
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </View>
  )
);

const stat = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    width: (W - 52) / 2,
  },

  val: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 1,
  },

  lbl: {
    fontSize: 11,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function PropertyDetailScreen() {
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'PropertyDetail'>>();

  const nav = useNavigation<any>();

  const { user } = useAuth();

  const { colors, mode } = useTheme();

  const insets = useSafeAreaInsets();

  // ───────────────────────────────────────────────────────────────────────────
  // STATE
  // ───────────────────────────────────────────────────────────────────────────

  const [property, setProperty] =
    useState<Property | null>(null);

  const [similar, setSimilar] =
    useState<Property[]>([]);

  const [imgIndex, setImgIndex] =
    useState(0);

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [previewVisible, setPreviewVisible] =
    useState(false);

  const [previewIndex, setPreviewIndex] =
    useState(0);

  // ───────────────────────────────────────────────────────────────────────────
  // REFS
  // ───────────────────────────────────────────────────────────────────────────

  const scrollY =
    useRef(new Animated.Value(0)).current;

  const fadeAnim =
    useRef(new Animated.Value(0)).current;

  const previewListRef =
    useRef<FlatList<string | null>>(null);
    
  const galleryListRef =
    useRef<FlatList<string | null>>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // LOAD PROPERTY
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const loadProperty = async () => {
      try {
        const p = await getPropertyById(
          params.propertyId
        );

        if (cancelled || !p) {
          return;
        }

        setProperty(p);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }).start();

        try {
          const s =
            await getSimilarProperties(p);

          if (!cancelled) {
            setSimilar(s || []);
          }
        } catch {
          if (!cancelled) {
            setSimilar([]);
          }
        }
      } catch {
        if (!cancelled) {
          setProperty(null);
        }
      }
    };

    loadProperty();

    return () => {
      cancelled = true;
    };
  }, [params.propertyId, fadeAnim]);

  // ───────────────────────────────────────────────────────────────────────────
  // FAVORITES
  // ───────────────────────────────────────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      if (!property) {
        return;
      }

      let cancelled = false;

      const uid = user?.id || 'guest';

      getFavorites(uid)
        .then((favs) => {
          if (cancelled) {
            return;
          }

          setIsFavorite(
            favs.some(
              (p) => p._id === property._id
            )
          );
        })
        .catch(() => {
          if (!cancelled) {
            setIsFavorite(false);
          }
        });

      return () => {
        cancelled = true;
      };
    }, [user?.id, property?._id])
  );

  // ───────────────────────────────────────────────────────────────────────────
  // DERIVED VALUES
  // ───────────────────────────────────────────────────────────────────────────

  const priceText = property
    ? property.priceFrom
      ? `₹${property.priceFrom}${
          property.priceTo
            ? ` – ₹${property.priceTo}`
            : '+'
        }`
      : property.price
      ? `₹${property.price}`
      : 'Call for Price'
    : '';

  const lat = Number(property?.latitude);

  const lng = Number(property?.longitude);

  const hasCoords =
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat !== 0 &&
    lng !== 0;

  const address = property
    ? [
        property.street1,
        property.street2,
        property.street3,
        property.area,
        property.city,
        property.state,
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  const phoneNum =
    property?.contactPhone ||
    DEFAULT_PHONE;

  const whatsappNum = (
    property?.whatsappNumber ||
    property?.contactPhone ||
    DEFAULT_PHONE
  ).replace(/\D/g, '');

  const waMsg = property
    ? encodeURIComponent(
        `Hi, I'm interested in: ${property.title} (${property.area}, ${property.city})`
      )
    : '';

  const images: (string | null)[] =
    property?.images?.length
      ? property.images
      : [null];

  // ───────────────────────────────────────────────────────────────────────────
  // FAVORITE
  // ───────────────────────────────────────────────────────────────────────────

  const toggleFavorite = useCallback(
    async () => {
      if (!property) {
        return;
      }

      const uid = user?.id || 'guest';

      const wasFavorite = isFavorite;

      // Optimistic UI
      setIsFavorite(!wasFavorite);

      try {
        if (wasFavorite) {
          await removeFavorite(
            uid,
            property._id
          );
        } else {
          await addFavorite(
            uid,
            property._id,
            property,
          );
        }
      } catch {
        // Roll back if API fails
        setIsFavorite(wasFavorite);
      }
    },
    [
      property,
      user?.id,
      isFavorite,
    ]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // SHARE
  // ───────────────────────────────────────────────────────────────────────────

  const shareProperty = useCallback(
    async () => {
      if (!property) {
        return;
      }

      try {
        await Share.share({
          title: property.title,

          message:
            `${property.title} — ${property.area}, ${property.city}\n` +
            `Price: ${priceText}\n` +
            `Contact: ${phoneNum}`,
        });
      } catch {
        // User cancelled share
      }
    },
    [
      property,
      priceText,
      phoneNum,
    ]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // OPEN MAP
  // ───────────────────────────────────────────────────────────────────────────

  const openMap = useCallback(
    async () => {
      const gApp = Platform.select({
        ios: hasCoords
          ? `maps:0,0?q=${encodeURIComponent(
              property?.title || ''
            )}@${lat},${lng}`
          : `maps:0,0?q=${encodeURIComponent(
              address || 'Rajkot'
            )}`,

        android: hasCoords
          ? `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(
              property?.title || ''
            )})`
          : `geo:0,0?q=${encodeURIComponent(
              address || 'Rajkot'
            )}`,
      }) || '';

      const gWeb = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            address || 'Rajkot'
          )}`;

      try {
        const can =
          await Linking.canOpenURL(gApp);

        await Linking.openURL(
          can ? gApp : gWeb
        );
      } catch {
        await Linking.openURL(gWeb);
      }
    },
    [
      property,
      hasCoords,
      lat,
      lng,
      address,
    ]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // HEADER
  // ───────────────────────────────────────────────────────────────────────────

  const headerContent = (
    <View
      style={[
        styles.customHeader,
        {
          paddingTop: insets.top,
          backgroundColor:
            colors.headerBg,
          borderBottomColor:
            colors.border,
        },
      ]}
    >
      <TouchableOpacity
        onPress={() => nav.goBack()}
        style={styles.headerBtn}
        hitSlop={8}
      >
        <Ionicons
          name="arrow-back"
          size={24}
          color={colors.headerIcon}
        />
      </TouchableOpacity>

      <Text
        style={[
          styles.headerTitle,
          {
            color: colors.headerText,
          },
        ]}
        numberOfLines={1}
      >
        {property?.title || ''}
      </Text>

      <View
        style={{
          flexDirection: 'row',
          gap: 16,
        }}
      >
        <TouchableOpacity
          style={styles.headerBtnAction}
          onPress={shareProperty}
          hitSlop={8}
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={colors.headerIcon}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerBtnAction}
          onPress={toggleFavorite}
          hitSlop={8}
        >
          <Ionicons
            name={
              isFavorite
                ? 'heart'
                : 'heart-outline'
            }
            size={22}
            color={
              isFavorite
                ? '#ef4444'
                : colors.headerIcon
            }
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ───────────────────────────────────────────────────────────────────────────
  // IMAGE KEY
  // ───────────────────────────────────────────────────────────────────────────

  const imgKeyExtractor = useCallback(
    (
      item: string | null,
      index: number
    ) => item ?? `placeholder-${index}`,
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GALLERY IMAGE
  // ───────────────────────────────────────────────────────────────────────────

  const renderImage = useCallback(
    ({
      item,
      index,
    }: {
      item: string | null;
      index: number;
    }) => {
      return (
        <View
          style={{
            width: W,
            height: IMG_HEIGHT,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => {
              setPreviewIndex(index);
              setPreviewVisible(true);
            }}
            style={{
              flex: 1,
            }}
          >
            <Image
              source={
                item
                  ? {
                      uri: getFullImageUrl(
                        item
                      ),
                    }
                  : require('../../assets/placeholder.png')
              }
              style={{
                width: W,
                height: IMG_HEIGHT,
              }}
              contentFit="cover"
              transition={
                Platform.OS === 'ios'
                  ? 200
                  : 0
              }
              cachePolicy="memory-disk"
            />
          </TouchableOpacity>
        </View>
      );
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // GALLERY SCROLL
  // ───────────────────────────────────────────────────────────────────────────

  const handleGalleryScrollEnd = useCallback(
    (
      event: NativeSyntheticEvent<NativeScrollEvent>
    ) => {
      const x =
        event.nativeEvent.contentOffset.x;

      const index = Math.round(x / W);

      setImgIndex(
        Math.max(
          0,
          Math.min(index, images.length - 1)
        )
      );
    },
    [images.length]
  );

  // ───────────────────────────────────────────────────────────────────────────
  // PREVIEW
  // ───────────────────────────────────────────────────────────────────────────

  const openPreview = useCallback(
    (index: number) => {
      setPreviewIndex(index);
      setPreviewVisible(true);
    },
    []
  );

  const closePreview = useCallback(() => {
    setPreviewVisible(false);
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // PREVIEW FAILED SCROLL
  // ───────────────────────────────────────────────────────────────────────────

  const handlePreviewScrollFailure = useCallback(
    (info: {
      index: number;
    }) => {
      setTimeout(() => {
        previewListRef.current?.scrollToIndex({
          index: info.index,
          animated: false,
        });
      }, 100);
    },
    []
  );

  // ───────────────────────────────────────────────────────────────────────────
  // LOADING
  // ───────────────────────────────────────────────────────────────────────────

  if (!property) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor:
              colors.background,
          },
        ]}
      >
        {headerContent}

        <View style={styles.loading}>
          <ActivityIndicator
            size="large"
            color={colors.primary}
          />
        </View>
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // CONTENT
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor:
            colors.background,
        },
      ]}
    >
      {headerContent}

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
        }}
      >
        {/* 
          IMPORTANT:
          The vertical ScrollView owns the vertical gesture.
          The horizontal FlatList owns the horizontal gesture.
        */}
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
          directionalLockEnabled
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          onScroll={Animated.event(
            [
              {
                nativeEvent: {
                  contentOffset: {
                    y: scrollY,
                  },
                },
              },
            ],
            {
              useNativeDriver: true,
            }
          )}
          contentContainerStyle={{
            paddingBottom:
              insets.bottom + 96,
          }}
        >
          {/* ────────────────────────────────────────────────────────────────
              IMAGE GALLERY
          ──────────────────────────────────────────────────────────────── */}

          <View
            style={styles.galleryWrap}
          >
            <FlatList
              ref={galleryListRef}
              horizontal
              pagingEnabled
              nestedScrollEnabled
              directionalLockEnabled
              showsHorizontalScrollIndicator={
                false
              }
              scrollEnabled
              bounces
              data={images}
              keyExtractor={
                imgKeyExtractor
              }
              renderItem={
                renderImage
              }
              getItemLayout={(
                _,
                index
              ) => ({
                length: W,
                offset: W * index,
                index,
              })}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              removeClippedSubviews={
                Platform.OS ===
                'android'
              }
              decelerationRate={
                Platform.OS === 'ios'
                  ? 'fast'
                  : 0.98
              }
              onMomentumScrollEnd={
                handleGalleryScrollEnd
              }
              onScrollEndDrag={
                handleGalleryScrollEnd
              }
              // Helps React Native recognize this as a horizontal list.
              contentContainerStyle={{
                alignItems: 'stretch',
              }}
            />

            {/* ────────────────────────────────────────────────────────────
                IMAGE COUNTER
            ──────────────────────────────────────────────────────────── */}

            {images.length > 1 && (
              <View
                style={
                  styles.imgCounter
                }
              >
                <Frost
                  intensity={60}
                  tint="dark"
                  style={
                    StyleSheet.absoluteFill
                  }
                />

                <Text
                  style={
                    styles.imgCounterText
                  }
                >
                  {imgIndex + 1} /{' '}
                  {images.length}
                </Text>
              </View>
            )}

            {/* ────────────────────────────────────────────────────────────
                DOT INDICATORS
            ──────────────────────────────────────────────────────────── */}

            {images.length > 1 &&
              images.length <= 8 && (
                <View
                  style={
                    styles.dotRow
                  }
                >
                  {images.map(
                    (_, i) => (
                      <TouchableOpacity
                        key={i}
                        activeOpacity={0.8}
                        onPress={() => {
                          // Gallery list isn't kept in a ref because
                          // normal swiping is preferred.
                          // The dots remain visual indicators.
                        }}
                      >
                        <View
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                i ===
                                imgIndex
                                  ? '#fff'
                                  : 'rgba(255,255,255,0.4)',
                            },
                          ]}
                        />
                      </TouchableOpacity>
                    )
                  )}
                </View>
              )}

            {/* ────────────────────────────────────────────────────────────
                LEFT / RIGHT ARROWS
            ──────────────────────────────────────────────────────────── */}
            {images.length > 1 && (
              <>
                {imgIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, { left: 16 }]}
                    onPress={() => {
                      const next = imgIndex - 1;
                      setImgIndex(next);
                      galleryListRef.current?.scrollToIndex({ index: next, animated: true });
                    }}
                  >
                    <Frost intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                {imgIndex < images.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowButton, { right: 16 }]}
                    onPress={() => {
                      const next = imgIndex + 1;
                      setImgIndex(next);
                      galleryListRef.current?.scrollToIndex({ index: next, animated: true });
                    }}
                  >
                    <Frost intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* ────────────────────────────────────────────────────────────────
              CONTENT CARD
          ──────────────────────────────────────────────────────────────── */}

          <View
            style={[
              styles.card,
              {
                backgroundColor:
                  colors.background,
              },
            ]}
          >
            {/* ──────────────────────────────────────────────────────────
                TITLE
            ────────────────────────────────────────────────────────── */}

            <View
              style={
                styles.titleBlock
              }
            >
              <View
                style={{
                  flex: 1,
                }}
              >
                {property.badge && (
                  <View
                    style={[
                      styles.badge,
                      {
                        backgroundColor:
                          colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.badgeText
                      }
                    >
                      {property.badge.toUpperCase()}
                    </Text>
                  </View>
                )}

                <Text
                  style={[
                    styles.title,
                    {
                      color:
                        colors.textPrimary,
                    },
                  ]}
                >
                  {property.title}
                </Text>

                <View
                  style={
                    styles.locationRow
                  }
                >
                  <Ionicons
                    name="location-outline"
                    size={13}
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.location,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    {property.area},{' '}
                    {property.city}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.priceBlock
                }
              >
                <Text
                  style={[
                    styles.priceLabel,
                    {
                      color:
                        colors.textTertiary,
                    },
                  ]}
                >
                  Price
                </Text>

                <Text
                  style={[
                    styles.price,
                    {
                      color:
                        colors.primary,
                    },
                  ]}
                >
                  {priceText}
                </Text>
              </View>
            </View>

            {/* ──────────────────────────────────────────────────────────
                STATS
            ────────────────────────────────────────────────────────── */}

            <View
              style={
                styles.statsGrid
              }
            >
              {property.beds?.[0] && (
                <StatBox
                  icon="bed-outline"
                  label="Bedrooms"
                  value={
                    property.beds[0]
                  }
                  colors={colors}
                />
              )}

              {property.baths && (
                <StatBox
                  icon="water-outline"
                  label="Bathrooms"
                  value={String(
                    property.baths
                  )}
                  colors={colors}
                />
              )}

              {property.sqft && (
                <StatBox
                  icon="resize-outline"
                  label="Area"
                  value={
                    property.sqft
                  }
                  colors={colors}
                />
              )}

              {property.propertyType && (
                <StatBox
                  icon="business-outline"
                  label="Type"
                  value={
                    property.propertyType
                  }
                  colors={colors}
                />
              )}
            </View>

            {/* ──────────────────────────────────────────────────────────
                ABOUT
            ────────────────────────────────────────────────────────── */}

            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.textPrimary,
                },
              ]}
            >
              About
            </Text>

            <Text
              style={[
                styles.desc,
                {
                  color:
                    colors.textSecondary,
                },
              ]}
            >
              {property.description ||
                'Contact us directly for full details about this property.'}
            </Text>

            {/* ──────────────────────────────────────────────────────────
                LOCATION
            ────────────────────────────────────────────────────────── */}

            {(hasCoords || address) && (
              <>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        colors.textPrimary,
                      marginTop: 28,
                    },
                  ]}
                >
                  Location
                </Text>

                {address ? (
                  <Text
                    style={[
                      styles.address,
                      {
                        color:
                          colors.textSecondary,
                      },
                    ]}
                  >
                    {address}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.mapBtn,
                    {
                      backgroundColor:
                        colors.surfaceSunken,
                      borderColor:
                        colors.border,
                    },
                  ]}
                  onPress={openMap}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="map-outline"
                    size={17}
                    color={
                      colors.primary
                    }
                  />

                  <Text
                    style={[
                      styles.mapBtnText,
                      {
                        color:
                          colors.textPrimary,
                      },
                    ]}
                  >
                    Open in Maps
                  </Text>

                  <Ionicons
                    name="open-outline"
                    size={15}
                    color={
                      colors.textTertiary
                    }
                  />
                </TouchableOpacity>
              </>
            )}

            {/* ──────────────────────────────────────────────────────────
                SIMILAR PROPERTIES
            ────────────────────────────────────────────────────────── */}

            {similar.length > 0 && (
              <View
                style={[
                  styles.similarSection,
                  {
                    borderTopColor:
                      colors.borderLight,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      color:
                        colors.textPrimary,
                    },
                  ]}
                >
                  Similar Properties
                </Text>

                <FlatList
                  horizontal
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={
                    false
                  }
                  data={similar}
                  keyExtractor={(p) =>
                    p._id
                  }
                  renderItem={({
                    item,
                  }) => (
                    <SimilarCard
                      property={
                        item
                      }
                      onPress={() =>
                        nav.push(
                          'PropertyDetail',
                          {
                            propertyId:
                              item._id,
                          }
                        )
                      }
                    />
                  )}
                  getItemLayout={(
                    _,
                    index
                  ) => ({
                    length:
                      GLOBAL_CARD_WIDTH +
                      12,
                    offset:
                      (GLOBAL_CARD_WIDTH +
                        12) *
                      index,
                    index,
                  })}
                  initialNumToRender={2}
                  maxToRenderPerBatch={2}
                  windowSize={3}
                  contentContainerStyle={{
                    paddingRight: 4,
                  }}
                />
              </View>
            )}
          </View>
        </Animated.ScrollView>

        {/* ────────────────────────────────────────────────────────────────
            BOTTOM CTA
        ──────────────────────────────────────────────────────────────── */}

        <Frost
          intensity={
            mode === 'dark'
              ? 60
              : 80
          }
          tint={
            mode === 'dark'
              ? 'dark'
              : 'light'
          }
          style={[
            styles.cta,
            {
              paddingBottom:
                Math.max(
                  insets.bottom,
                  12
                ) + 4,

              borderTopColor:
                colors.borderLight,
            },
          ]}
        >
          <PremiumGradientButton
            title="Call Now"
            icon="call"
            onPress={() =>
              Linking.openURL(
                `tel:${phoneNum}`
              )
            }
            style={{
              flex: 1,
            }}
          />

          <TouchableOpacity
            style={[
              styles.ctaWa,
              {
                backgroundColor:
                  '#16a34a',
              },
            ]}
            onPress={() =>
              Linking.openURL(
                `whatsapp://send?phone=${whatsappNum}&text=${waMsg}`
              )
            }
            activeOpacity={0.85}
          >
            <Ionicons
              name="logo-whatsapp"
              size={18}
              color="#fff"
            />

            <Text
              style={
                styles.ctaWaText
              }
            >
              WhatsApp
            </Text>
          </TouchableOpacity>
        </Frost>
      </Animated.View>

      {/* ─────────────────────────────────────────────────────────────────
          FULLSCREEN IMAGE PREVIEW
      ───────────────────────────────────────────────────────────────── */}

      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={
          closePreview
        }
        statusBarTranslucent
      >
        <View
          style={
            styles.previewContainer
          }
        >
          {/* Close */}
          <TouchableOpacity
            style={
              styles.closePreviewBtn
            }
            onPress={
              closePreview
            }
            hitSlop={8}
          >
            <Ionicons
              name="close"
              size={28}
              color="#fff"
            />
          </TouchableOpacity>

          {/* Counter */}
          {images.length > 1 && (
            <View
              style={
                styles.previewCounter
              }
            >
              <Text
                style={
                  styles.previewCounterText
                }
              >
                {previewIndex + 1} /{' '}
                {images.length}
              </Text>
            </View>
          )}

          {/* Preview Gallery */}
          <FlatList
            ref={previewListRef}
            horizontal
            pagingEnabled
            nestedScrollEnabled
            showsHorizontalScrollIndicator={
              false
            }
            data={images}
            keyExtractor={
              imgKeyExtractor
            }
            initialScrollIndex={
              previewIndex
            }
            getItemLayout={(
              _,
              index
            ) => ({
              length: W,
              offset: W * index,
              index,
            })}
            onScrollToIndexFailed={
              handlePreviewScrollFailure
            }
            onMomentumScrollEnd={(
              event
            ) => {
              const index =
                Math.round(
                  event.nativeEvent.contentOffset
                    .x / W
                );

              setPreviewIndex(
                Math.max(
                  0,
                  Math.min(
                    index,
                    images.length -
                      1
                  )
                )
              );
            }}
            renderItem={({
              item,
            }) => (
              <View
                style={[
                  styles.previewPage,
                  {
                    width: W,
                  },
                ]}
              >
                <Image
                  source={
                    item
                      ? {
                          uri: getFullImageUrl(
                            item
                          ),
                        }
                      : require('../../assets/placeholder.png')
                  }
                  style={
                    styles.previewImage
                  }
                  contentFit="contain"
                  transition={0}
                  cachePolicy="memory-disk"
                />
              </View>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HEADER
  // ─────────────────────────────────────────────────────────────────────────

  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },

  headerBtn: {
    padding: 4,
    marginRight: 12,
  },

  headerBtnAction: {
    padding: 4,
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // GALLERY
  // ─────────────────────────────────────────────────────────────────────────

  galleryWrap: {
    width: W,
    height: IMG_HEIGHT,
    overflow: 'hidden',
  },

  imgCounter: {
    position: 'absolute',
    bottom: 28,
    right: 14,
    borderRadius: 10,
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  imgCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  dotRow: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
  },

  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    zIndex: 10,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CONTENT CARD
  // ─────────────────────────────────────────────────────────────────────────

  card: {
    marginTop: -20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
  },

  titleBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 24,
  },

  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },

  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    letterSpacing: -0.3,
    marginBottom: 6,
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  location: {
    fontSize: 13,
    fontWeight: '500',
  },

  priceBlock: {
    alignItems: 'flex-end',
    paddingTop: 28,
  },

  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 3,
  },

  price: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'right',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────────────────────────

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // DESCRIPTION
  // ─────────────────────────────────────────────────────────────────────────

  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 10,
    letterSpacing: -0.2,
  },

  desc: {
    fontSize: 14,
    lineHeight: 22,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // MAP
  // ─────────────────────────────────────────────────────────────────────────

  address: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },

  mapBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SIMILAR
  // ─────────────────────────────────────────────────────────────────────────

  similarSection: {
    marginTop: 32,
    paddingTop: 28,
    borderTopWidth:
      StyleSheet.hairlineWidth,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // CTA
  // ─────────────────────────────────────────────────────────────────────────

  cta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth:
      StyleSheet.hairlineWidth,
    zIndex: 10,
  },

  ctaWa: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
  },

  ctaWaText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // FULLSCREEN PREVIEW
  // ─────────────────────────────────────────────────────────────────────────

  previewContainer: {
    flex: 1,
    backgroundColor:
      'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },

  previewPage: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },

  previewImage: {
    width: W,
    height: '80%',
  },

  closePreviewBtn: {
    position: 'absolute',
    top:
      Platform.OS === 'ios'
        ? 60
        : 40,
    right: 20,
    zIndex: 100,
    padding: 8,
    backgroundColor:
      'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },

  previewCounter: {
    position: 'absolute',
    top:
      Platform.OS === 'ios'
        ? 65
        : 45,
    left: 20,
    zIndex: 100,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor:
      'rgba(255,255,255,0.12)',
  },

  previewCounterText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});