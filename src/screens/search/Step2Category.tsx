import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StepProgress from '../../components/StepProgress';
import { useTheme } from '../../theme/ThemeContext';
import type { CategoryType, IntentType, GuidedSearchState } from '../../search/guidedSearchTypes';

interface Props {
  state: GuidedSearchState;
  onSelect: (category: CategoryType) => void;
  onBack: () => void;
  categoryCounts?: Record<string, number>;
}

const OPTIONS: {
  value: CategoryType;
  title: string;
  description: string;
  icon: string;
  accentColor: string;
  accentBg: string;
}[] = [
  {
    value: 'residence',
    title: 'Residence',
    description: 'Home, apartment, villa, etc.',
    icon: 'home-outline',
    accentColor: '#c0392b',
    accentBg: '#fef2f2',
  },
  {
    value: 'commercial',
    title: 'Commercial',
    description: 'Office, shop, warehouse, factory, etc.',
    icon: 'business-outline',
    accentColor: '#2563eb',
    accentBg: '#eff6ff',
  },
  {
    value: 'plot',
    title: 'Plot / Land',
    description: 'Residential, commercial or agricultural land.',
    icon: 'map-outline',
    accentColor: '#059669',
    accentBg: '#f0fdf4',
  },
];

export default function Step2Category({ state, onSelect, onBack, categoryCounts }: Props) {
  const { colors } = useTheme();
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start();
  }, []);

  const intentLabel = state.intent === 'buy' ? 'Buy' : 'Rent';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StepProgress
        currentStep={2}
        totalSteps={3}
        stepLabels={['Purpose', 'Type', 'Preferences']}
        onBack={onBack}
      />

      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        {/* Context pill */}
        <View style={[styles.pill, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]}>
          <Ionicons name={state.intent === 'buy' ? 'home-outline' : 'key-outline'} size={12} color={colors.primary} />
          <Text style={[styles.pillText, { color: colors.primary }]}>{intentLabel}</Text>
        </View>

        <Text style={[styles.headline, { color: colors.textPrimary }]}>
          What are you{'\n'}looking for?
        </Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>
          Choose the type of property
        </Text>

        <View style={styles.cards}>
          {OPTIONS.map(opt => {
            const selected = state.category === opt.value;
            const count = categoryCounts?.[opt.value] ?? null;
            const isDisabled = categoryCounts !== undefined && count === 0;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.card,
                  {
                    backgroundColor: selected ? opt.accentBg : colors.surface,
                    borderColor: selected ? opt.accentColor : colors.border,
                    shadowColor: opt.accentColor,
                    shadowOpacity: selected ? 0.14 : 0.04,
                    opacity: isDisabled ? 0.4 : 1,
                  },
                ]}
                onPress={() => !isDisabled && onSelect(opt.value)}
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
                    size={24}
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

                {count !== null && count > 0 && (
                  <View style={[styles.countBadge, { backgroundColor: selected ? opt.accentColor : colors.surfaceSunken, borderColor: selected ? opt.accentColor : colors.border }]}>
                    <Text style={[styles.countBadgeText, { color: selected ? '#fff' : colors.textTertiary }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },

  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1,
    marginBottom: 18,
  },
  pillText: { fontSize: 12, fontWeight: '700' },

  headline: { fontSize: 28, fontWeight: '800', marginBottom: 6, lineHeight: 36 },
  sub: { fontSize: 14, marginBottom: 32 },

  cards: { gap: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    padding: 18, borderRadius: 16, borderWidth: 2,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 3,
  },
  iconWrap: {
    width: 48, height: 48, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: '800', marginBottom: 3 },
  cardDesc:  { fontSize: 12, lineHeight: 17 },
  radio: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, borderWidth: 1, marginLeft: 6 },
  countBadgeText: { fontSize: 10, fontWeight: '700' },
});
