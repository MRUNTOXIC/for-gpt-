import React, { useRef, useCallback } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle,
  Animated, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import { RADIUS } from '../../theme/layout';

interface FilterChipProps {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  count?: number; // optional badge count
}

export default function FilterChip({
  label, selected = false, onPress, icon, style, textStyle, count,
}: FilterChipProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn  = useCallback(() =>
    Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 0 }).start(), [scale]);
  const pressOut = useCallback(() =>
    Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 50, bounciness: 5 }).start(), [scale]);

  const bg          = selected ? colors.primary     : colors.surface;
  const borderColor = selected ? colors.primary     : colors.border;
  const textColor   = selected ? '#FFFFFF'          : colors.textSecondary;
  const iconColor   = selected ? '#FFFFFF'          : colors.textTertiary;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Animated.View
        style={[
          s.chip,
          { backgroundColor: bg, borderColor },
          { transform: [{ scale }] },
          style,
        ]}
      >
        {icon ? (
          <Ionicons name={icon as any} size={14} color={iconColor} style={s.icon} />
        ) : null}
        <Text style={[s.label, { color: textColor }, textStyle]} numberOfLines={1}>
          {label}
        </Text>
        {count != null && count > 0 ? (
          <View style={[s.badge, { backgroundColor: selected ? 'rgba(255,255,255,0.3)' : colors.primaryBg }]}>
            <Text style={[s.badgeText, { color: selected ? '#fff' : colors.primary }]}>{count}</Text>
          </View>
        ) : null}
        {selected ? (
          <Ionicons name="checkmark" size={12} color="#fff" style={s.check} />
        ) : null}
      </Animated.View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    minHeight: 38,
  },
  icon: {
    marginRight: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  check: {
    marginLeft: 4,
  },
  badge: {
    marginLeft: 5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
