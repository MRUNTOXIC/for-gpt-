import React, { useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Property } from '../types/Property';
import { getFullImageUrl } from '../utils/imageUrl';
import { useTheme } from '../theme/ThemeContext';
import { GLOBAL_CARD_WIDTH, GLOBAL_IMAGE_HEIGHT, RADIUS, TYPE } from '../theme/layout';

// ─── PROP TYPES ───────────────────────────────────────────────────────────────

interface Props {
  property: Property;
  onPress: () => void;
  isFavorite?: boolean;
  onFavoritePress?: () => void;
}

// ─── STABLE REFS ─────────────────────────────────────────────────────────────
const BOTTOM_SCRIM: readonly [string, string, string] = [
  'transparent', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.82)',
];
const PLACEHOLDER_COLOR = '#1A1A1A';

// ─── ANIMATED HEART BUTTON ────────────────────────────────────────────────────
function HeartButton({
  isFavorite, onPress,
}: {
  isFavorite: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, speed: 80, bounciness: 8 }),
      Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 40, bounciness: 4 }),
    ]).start();
    onPress();
  }, [scale, onPress]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.85}
      accessibilityLabel={isFavorite ? 'Remove from saved' : 'Save property'}
      accessibilityRole="button"
    >
      <Animated.View style={[hb.btn, { transform: [{ scale }] }]}>
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
          size={16}
          color={isFavorite ? '#EF554B' : '#fff'}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

const hb = StyleSheet.create({
  btn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
  },
});

// ─── MAIN CARD ────────────────────────────────────────────────────────────────

function PropertyCardComponent({ property, onPress, isFavorite, onFavoritePress }: Props) {
  const { colors } = useTheme();

  const imageUri   = getFullImageUrl(property.images?.[0]);
  const location   = [property.area, property.city].filter(Boolean).join(', ');
  const beds       = Array.isArray(property.beds) ? property.beds[0] : property.beds;
  const priceText  = property.priceFrom
    ? `₹${property.priceFrom}${property.priceTo ? '–₹' + property.priceTo : '+'}`
    : property.price ? `₹${property.price}` : 'Price on Request';
  const typeLabel  = (property.propertyType ?? '').toUpperCase();
  const metaLine   = [beds ? `${beds} BHK` : null, property.sqft ?? null].filter(Boolean).join('  ·  ');

  // Press animation
  const cardScale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.spring(cardScale, { toValue: 0.975, useNativeDriver: true, speed: 60, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(cardScale, { toValue: 1,     useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${property.title}, ${priceText}`}
    >
      <Animated.View
        style={[
          s.card,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ scale: cardScale }],
            ...Platform.select({
              ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
              android: { elevation: 4 },
            }),
          },
        ]}
      >
        {/* ── Image ──────────────────────────────────────────────────── */}
        <View style={s.imgWrap}>
          <Image
            source={{ uri: imageUri }}
            style={s.img}
            contentFit="cover"
            cachePolicy="memory-disk"
            placeholder={PLACEHOLDER_COLOR}
            transition={200}
          />

          <LinearGradient
            colors={BOTTOM_SCRIM}
            style={s.bottomScrim}
            pointerEvents="none"
          />

          {/* Top row: badge + heart */}
          <View style={s.imgTopRow}>
            <View>
              {property.isSold ? (
                <View style={[s.badge, { backgroundColor: colors.statusSold }]}>
                  <Text style={s.badgeText}>SOLD</Text>
                </View>
              ) : property.badge ? (
                <View style={[s.badge, { backgroundColor: colors.primary }]}>
                  <Text style={s.badgeText}>{String(property.badge).toUpperCase()}</Text>
                </View>
              ) : null}
            </View>

            {onFavoritePress ? (
              <HeartButton isFavorite={!!isFavorite} onPress={onFavoritePress} />
            ) : null}
          </View>

          {/* Bottom overlay: verified + price */}
          <View style={s.imgBottom} pointerEvents="none">
            {property.isVerified && (
              <View style={s.verifiedRow}>
                <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
                <Text style={s.verifiedText}>VERIFIED</Text>
              </View>
            )}
            <Text style={s.priceText} numberOfLines={1}>{priceText}</Text>
          </View>
        </View>

        {/* ── Info ───────────────────────────────────────────────────── */}
        <View style={s.info}>
          {/* Title */}
          <Text style={[s.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {property.title}
          </Text>

          {/* Location */}
          {location ? (
            <View style={s.locRow}>
              <Ionicons name="location-outline" size={11} color={colors.textTertiary} />
              <Text style={[s.locText, { color: colors.textTertiary }]} numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}

          {/* Specs + type pill */}
          <View style={[s.specsRow, { borderTopColor: colors.borderLight }]}>
            <Text style={[s.specsText, { color: colors.textSecondary }]} numberOfLines={1}>
              {metaLine || '—'}
            </Text>
            {typeLabel ? (
              <View style={[s.typePill, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}>
                <Text style={[s.typePillText, { color: colors.primary }]}>{typeLabel}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: GLOBAL_CARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },

  // Image
  imgWrap: {
    height: GLOBAL_IMAGE_HEIGHT,
    backgroundColor: '#111',
  },
  img: {
    width: '100%',
    height: '100%',
  },
  bottomScrim: {
    ...StyleSheet.absoluteFillObject,
    top: '40%',
  },
  imgTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  badgeText: {
    color: '#fff',
    ...TYPE.badge,
  },
  imgBottom: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  verifiedText: {
    color: '#22C55E',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  priceText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Info
  info: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 10,
  },
  title: {
    ...TYPE.cardTitle,
    marginBottom: 3,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 8,
  },
  locText: {
    fontSize: 11,
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 7,
    gap: 4,
  },
  specsText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
  typePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  typePillText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

// ─── EXPORT ───────────────────────────────────────────────────────────────────
export const PropertyCard = React.memo(PropertyCardComponent, (prev, next) =>
  prev.property._id         === next.property._id &&
  prev.property.title       === next.property.title &&
  prev.property.images?.[0] === next.property.images?.[0] &&
  prev.property.price       === next.property.price &&
  prev.isFavorite           === next.isFavorite &&
  prev.onPress              === next.onPress &&
  prev.onFavoritePress      === next.onFavoritePress
);

export default PropertyCard;
