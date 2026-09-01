import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  label: string;
  onRemove: () => void;
  style?: ViewStyle;
}

export default function ActiveFilterChip({ label, onRemove, style }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.pill,
        { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder },
        style,
      ]}
      onPress={onRemove}
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
    >
      <Text style={[styles.pillText, { color: colors.primary }]}>{label}</Text>
      <Ionicons name="close" size={12} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
