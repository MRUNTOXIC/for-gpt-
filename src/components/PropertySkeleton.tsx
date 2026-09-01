import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { GLOBAL_CARD_WIDTH, GLOBAL_IMAGE_HEIGHT, RADIUS } from '../theme/layout';

// ─── SINGLE BONE ─────────────────────────────────────────────────────────────

function Bone({
  width, height, style, opacity,
}: {
  width: number | string; height: number; style?: object; opacity: Animated.Value;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: 6, backgroundColor: colors.surfaceRaised },
        { opacity },
        style,
      ]}
    />
  );
}

// ─── CARD SKELETON ────────────────────────────────────────────────────────────

export default function PropertySkeleton() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View
      style={[
        s.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      {/* Image placeholder */}
      <Bone width={GLOBAL_CARD_WIDTH} height={GLOBAL_IMAGE_HEIGHT} style={{ borderRadius: 0 }} opacity={opacity} />

      {/* Info */}
      <View style={s.info}>
        {/* Price line */}
        <Bone width="55%" height={14} opacity={opacity} />
        {/* Title line */}
        <Bone width="85%" height={13} opacity={opacity} style={{ marginTop: 8 }} />
        {/* Location line */}
        <Bone width="65%" height={11} opacity={opacity} style={{ marginTop: 6 }} />
        {/* Specs row */}
        <View style={s.specsRow}>
          <Bone width="50%" height={10} opacity={opacity} />
          <Bone width={40}  height={18} opacity={opacity} style={{ borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
}

// ─── LIST SKELETON (horizontal row) ──────────────────────────────────────────

export function PropertySkeletonRow() {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <View style={[sr.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Bone width={88} height={88} style={{ borderRadius: RADIUS.md }} opacity={opacity} />
      <View style={sr.body}>
        <Bone width="70%"  height={13} opacity={opacity} />
        <Bone width="50%"  height={11} opacity={opacity} style={{ marginTop: 6 }} />
        <Bone width="40%"  height={10} opacity={opacity} style={{ marginTop: 6 }} />
        <View style={sr.footer}>
          <Bone width={52} height={18} opacity={opacity} style={{ borderRadius: 6 }} />
          <Bone width={52} height={18} opacity={opacity} style={{ borderRadius: 6 }} />
        </View>
      </View>
    </View>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    width: GLOBAL_CARD_WIDTH,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  info: {
    paddingHorizontal: 11,
    paddingTop: 9,
    paddingBottom: 10,
    gap: 0,
  },
  specsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
});

const sr = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 12,
    marginBottom: 12,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
});
