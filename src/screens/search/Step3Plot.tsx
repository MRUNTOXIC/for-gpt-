import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, Animated, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StepProgress from '../../components/StepProgress';
import BottomSheetSelect, { SelectOption } from '../../components/BottomSheetSelect';
import { useTheme } from '../../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation';
import type { Property } from '../../types/Property';
import type { GuidedSearchState } from '../../search/guidedSearchTypes';
import { ActiveSearchFilters, DEFAULT_ACTIVE_FILTERS, DerivedFilterOptions } from '../../search/dynamicSearchTypes';
import { recalculateOptions, toMobileFilters, sqftToVaar } from '../../search/filterEngine';
import { BUDGET_OPTIONS, BUDGET_MAX_OPTIONS } from '../../search/types';

const ACCENT = '#059669';

interface Props {
  state: GuidedSearchState;
  onChange: (patch: Partial<GuidedSearchState>) => void;
  onSearch: () => void;
  onBack: () => void;
  loading: boolean;
  baseDataset: Property[];
}

function AnimatedChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 4 }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity onPress={handlePress} activeOpacity={1}
        style={[cs.chip, { borderColor: selected ? ACCENT : colors.border, backgroundColor: selected ? (ACCENT + '22') : colors.chipOff }]}>
        <Text style={[cs.chipText, { color: selected ? ACCENT : colors.chipOffText, fontWeight: selected ? '700' : '600' }]}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}
const cs = StyleSheet.create({
  chip: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 12, borderWidth: 1.5 },
  chipText: { fontSize: 12 },
});

function ChipStrip({ options, selected, onToggle }: { options: string[]; selected: string[]; onToggle: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 2 }}>
      {[...new Set(options)].map((opt, idx) => (
        <AnimatedChip key={`${opt}-${idx}`} label={opt} selected={selected.includes(opt)} onPress={() => onToggle(opt)} />
      ))}
    </ScrollView>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={[scc.card, { backgroundColor: colors.surface }]}>
      <View style={scc.header}>
        <Ionicons name={icon as any} size={14} color={ACCENT} />
        <Text style={[scc.title, { color: colors.textSecondary }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}
const scc = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 } },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  title: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
});

function formatBudget(v: number | null, fallback: string): string {
  if (v === null) return fallback;
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(v % 10_000_000 === 0 ? 0 : 1)} Cr`;
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(v % 100_000 === 0 ? 0 : 1)} L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

export default function Step3Plot({ state, onBack, loading, baseDataset }: Props) {
  const { colors } = useTheme();
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const [activeFilters, setActiveFilters] = useState<ActiveSearchFilters>({
    ...DEFAULT_ACTIVE_FILTERS,
    intent: state.intent as 'buy' | 'rent',
    category: 'plot',
    sizeUnit: 'vaar',
  });
  const [sizeInput, setSizeInput] = useState('');

  const derivedOptions = useMemo<DerivedFilterOptions>(
    () => recalculateOptions(baseDataset, activeFilters, 'plot'),
    [baseDataset, activeFilters],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start();
  }, []);

  const patchFilters = useCallback((patch: Partial<ActiveSearchFilters>) => {
    setActiveFilters(prev => ({ ...prev, ...patch }));
  }, []);

  const toggleArr = (arr: string[], v: string) => arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const budgetMinOpts: SelectOption[] = BUDGET_OPTIONS.map(o => ({ label: o.label, value: o.value === null ? '__null__' : String(o.value) }));
  const budgetMaxOpts: SelectOption[] = BUDGET_MAX_OPTIONS.map(o => ({ label: o.label, value: o.value === null ? '__null__' : String(o.value) }));

  const handleSizeChange = (text: string) => {
    setSizeInput(text);
    const n = parseFloat(text);
    patchFilters({ sizeTarget: isNaN(n) || n <= 0 ? null : n });
  };

  const handleSearch = () => {
    const mobileFilters = toMobileFilters(activeFilters);
    nav.navigate('Properties', { type: 'plot', filters: mobileFilters });
  };

  const sqftRangeLabel = derivedOptions.sqftRange
    ? `${Math.round(sqftToVaar(derivedOptions.sqftRange.min))}–${Math.round(sqftToVaar(derivedOptions.sqftRange.max))} Vaar`
    : null;

  const intentLabel = state.intent === 'buy' ? 'Buy' : 'Rent';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StepProgress currentStep={3} totalSteps={3} stepLabels={['Purpose', 'Type', 'Preferences']} onBack={onBack} />
      <Animated.ScrollView
        style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      >
        <View style={styles.pills}>
          <View style={[styles.pill, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.pillText, { color: ACCENT }]}>{intentLabel}</Text>
          </View>
          <Ionicons name="chevron-forward" size={12} color={colors.textTertiary} />
          <View style={[styles.pill, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
            <Text style={[styles.pillText, { color: ACCENT }]}>Plot / Land</Text>
          </View>
        </View>
        <Text style={[styles.headline, { color: colors.textPrimary }]}>Your Preferences</Text>
        <Text style={[styles.sub, { color: colors.textTertiary }]}>{derivedOptions.propertyCount} matching properties</Text>

        {derivedOptions.areas.length > 0 && (
          <SectionCard title="Area" icon="location-outline">
            <ChipStrip options={derivedOptions.areas} selected={activeFilters.areas} onToggle={v => patchFilters({ areas: toggleArr(activeFilters.areas, v) })} />
          </SectionCard>
        )}

        {derivedOptions.hasAnySubTypes && (
          <SectionCard title="Land Type" icon="layers-outline">
            <ChipStrip options={derivedOptions.subTypes} selected={activeFilters.subTypes} onToggle={v => patchFilters({ subTypes: toggleArr(activeFilters.subTypes, v) })} />
          </SectionCard>
        )}

        {derivedOptions.hasAnySqft && (
          <SectionCard title="Plot Size" icon="resize-outline">
            <View style={styles.sizeInputRow}>
              <TextInput
                style={[styles.sizeInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.surfaceSunken }]}
                placeholder="Enter size in Vaar"
                placeholderTextColor={colors.textTertiary}
                keyboardType="numeric" value={sizeInput} onChangeText={handleSizeChange} />
              <Text style={[styles.sizeUnit, { color: colors.textSecondary }]}>Vaar</Text>
            </View>
            {sqftRangeLabel && <Text style={[styles.sizeHint, { color: colors.textTertiary }]}>Available: {sqftRangeLabel}</Text>}
            {activeFilters.sizeTarget !== null && activeFilters.sizeTarget > 0 && (
              <Text style={[styles.toleranceHint, { color: ACCENT }]}>±10% tolerance applied</Text>
            )}
          </SectionCard>
        )}

        <SectionCard title="Budget" icon="cash-outline">
          <View style={styles.budgetRow}>
            <View style={{ flex: 1 }}>
              <BottomSheetSelect options={budgetMinOpts} value={activeFilters.budgetMin !== null ? String(activeFilters.budgetMin) : '__null__'}
                onSelect={v => patchFilters({ budgetMin: v === '__null__' ? null : Number(v) })}
                placeholder="No Min" title="Min Budget" icon="trending-down-outline" accentColor={ACCENT} />
            </View>
            <Text style={[styles.budgetSep, { color: colors.textTertiary }]}>to</Text>
            <View style={{ flex: 1 }}>
              <BottomSheetSelect options={budgetMaxOpts} value={activeFilters.budgetMax !== null ? String(activeFilters.budgetMax) : '__null__'}
                onSelect={v => patchFilters({ budgetMax: v === '__null__' ? null : Number(v) })}
                placeholder="No Max" title="Max Budget" icon="trending-up-outline" accentColor={ACCENT} />
            </View>
          </View>
          {(activeFilters.budgetMin !== null || activeFilters.budgetMax !== null) && (
            <Text style={[styles.budgetPreview, { color: ACCENT }]}>
              {formatBudget(activeFilters.budgetMin, 'No Min')} – {formatBudget(activeFilters.budgetMax, 'No Max')}
            </Text>
          )}
        </SectionCard>

        {derivedOptions.hasAnyFacing && (
          <SectionCard title="Facing" icon="compass-outline">
            <ChipStrip options={derivedOptions.facingOptions} selected={activeFilters.facing} onToggle={v => patchFilters({ facing: toggleArr(activeFilters.facing, v) })} />
          </SectionCard>
        )}
      </Animated.ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.searchBtn, { backgroundColor: ACCENT }]} onPress={handleSearch} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Ionicons name="search" size={18} color="#fff" />
              <Text style={styles.searchBtnText}>Show {derivedOptions.propertyCount} Properties</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  pills: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  pillText: { fontSize: 11, fontWeight: '700' },
  headline: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  sub: { fontSize: 13, marginBottom: 20 },
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetSep: { fontSize: 13, fontWeight: '600', paddingBottom: 10 },
  budgetPreview: { fontSize: 13, fontWeight: '700', marginTop: 4, textAlign: 'center' },
  footer: { paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1 },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 12 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sizeInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sizeInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  sizeUnit: { fontSize: 13, fontWeight: '600', minWidth: 40 },
  sizeHint: { fontSize: 11, marginTop: 6 },
  toleranceHint: { fontSize: 11, fontWeight: '600', marginTop: 4 },
});
