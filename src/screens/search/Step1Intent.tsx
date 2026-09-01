import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme/ThemeContext';
import type { IntentType, GuidedSearchState } from '../../search/guidedSearchTypes';

interface Props {
  state: GuidedSearchState;
  onSelect: (intent: IntentType) => void;
  onClose: () => void;
}

const OPTIONS: {
  value: IntentType;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  accentBg: string;
}[] = [
  {
    value: 'buy',
    title: 'Buy',
    description: 'Find a property to own',
    icon: 'home-outline',
    accentColor: '#c0392b',
    accentBg: '#fef2f2',
  },
  {
    value: 'rent',
    title: 'Rent',
    description: 'Find a property to rent',
    icon: 'key-outline',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
  },
];

export default function Step1Intent({ state, onSelect, onClose }: Props) {
  const { colors } = useTheme();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Close */}
      <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceSunken }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textTertiary }]}>
          Step 1 of 3
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <Animated.View
        style={[
          styles.body,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          Looking to
        </Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>
          Tell us what brings you here
        </Text>

        <View style={styles.cards}>
          {OPTIONS.map(opt => {
            const selected = state.intent === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.card,
                  {
                    backgroundColor: selected ? opt.accentBg : colors.surface,
                    borderColor: selected ? opt.accentColor : colors.border,
                    shadowColor: opt.accentColor,
                    shadowOpacity: selected ? 0.15 : 0.04,
                  },
                ]}
                onPress={() => onSelect(opt.value)}
                activeOpacity={0.82}
              >
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: selected ? opt.accentColor : colors.surfaceSunken },
                  ]}
                >
                  <Ionicons
                    name={opt.icon as any}
                    size={28}
                    color={selected ? '#fff' : opt.accentColor}
                  />
                </View>

                <View style={styles.cardText}>
                  <Text style={[styles.cardTitle, { color: selected ? opt.accentColor : colors.textPrimary }]}>
                    {opt.title}
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.textTertiary }]}>
                    {opt.description}
                  </Text>
                </View>

                {/* Selection indicator */}
                <View
                  style={[
                    styles.radio,
                    {
                      borderColor: selected ? opt.accentColor : colors.border,
                      backgroundColor: selected ? opt.accentColor : 'transparent',
                    },
                  ]}
                >
                  {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 12, fontWeight: '600' },

  body: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  headline: { fontSize: 30, fontWeight: '800', marginBottom: 6 },
  sub: { fontSize: 14, marginBottom: 40 },

  cards: { gap: 16 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 16, borderWidth: 2,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  iconWrap: {
    width: 56, height: 56, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  cardDesc:  { fontSize: 13 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
});
