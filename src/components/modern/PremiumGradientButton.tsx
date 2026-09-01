import React, { useRef } from 'react';
import {
  TouchableOpacity, Text, StyleSheet, ViewStyle,
  TextStyle, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';

// Pre-defined gradient arrays — never recreated on re-render
const GRADIENT_START = { x: 0, y: 0 };
const GRADIENT_END   = { x: 1, y: 0 };

interface PremiumGradientButtonProps {
  title: string;
  onPress: () => void;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function PremiumGradientButton({
  title, onPress, icon, style, textStyle, disabled = false, size = 'md',
}: PremiumGradientButtonProps) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 0,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4,
    }).start();
  };

  // Use a stable gradient array that depends on theme colors
  const gradientColors: readonly [string, string] = [colors.primary, colors.accent];

  const paddingVertical = size === 'sm' ? 11 : size === 'lg' ? 18 : 14;
  const fontSize        = size === 'sm' ? 13 : size === 'lg' ? 17 : 15;

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={disabled ? undefined : onPress}
      onPressIn={disabled ? undefined : handlePressIn}
      onPressOut={disabled ? undefined : handlePressOut}
      disabled={disabled}
      style={[style, disabled && { opacity: 0.45 }]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled }}
    >
      <Animated.View style={[styles.container, { transform: [{ scale }] }]}>
        <LinearGradient
          colors={gradientColors}
          start={GRADIENT_START}
          end={GRADIENT_END}
          style={[styles.gradient, { paddingVertical }]}
        >
          {icon && (
            <Ionicons name={icon as any} size={fontSize + 3} color="#fff" style={styles.icon} />
          )}
          <Text style={[styles.title, { fontSize }, textStyle]}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#c0392b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  icon: { marginRight: 8 },
});
