import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation';
import type { MobileFilters } from '../filters/types';
import { useTheme } from '../theme/ThemeContext';
import { deriveFilterOptions, applyFilters, SQFT_PER_VAAR } from '../services/filterEngine';
import type { Property } from '../types/Property';
import { RADIUS } from '../theme/layout';

const BUDGET_RANGES = [
  { label: 'Below 5 Lakhs', min: 0, max: 500000 },
  { label: '5L – 25L', min: 500000, max: 2500000 },
  { label: '25L – 50L', min: 2500000, max: 5000000 },
  { label: '50L – 1Cr', min: 5000000, max: 10000000 },
  { label: '1Cr – 5Cr', min: 10000000, max: 50000000 },
  { label: 'Above 5Cr', min: 50000000, max: Infinity },
];

const PROP_TYPES = [
  { label: 'Buy (Residential)', value: 'buy' },
  { label: 'Rent', value: 'rent' },
  { label: 'Commercial', value: 'commercial' },
  { label: 'Plots', value: 'plot' },
  { label: 'Projects', value: 'new' },
];

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
}

export default function FiltersScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RoutePropMap, 'Filters'>>();
  const { colors } = useTheme();

  const properties = (route.params?.properties ?? []) as Property[];
  const initial = route.params?.initial;
  const lockedType = route.params?.type;

  // Filter States
  const [searchQuery, setSearchQuery] = useState(initial?.searchQuery ?? '');
  const [selectedTypes, setSelectedTypes] = useState<string[]>(initial?.selectedTypes ?? (lockedType ? [lockedType] : []));
  const [selectedSubTypes, setSelectedSubTypes] = useState<string[]>(initial?.selectedSubTypes ?? []);
  const [selectedBedrooms, setSelectedBedrooms] = useState<string[]>(initial?.selectedBedrooms ?? []);
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initial?.selectedAreas ?? []);
  const [selectedFacing, setSelectedFacing] = useState<string[]>(initial?.selectedFacing ?? []);

  // Property Size Unit & Target (±10%)
  const [sizeUnit, setSizeUnit] = useState<'vaar' | 'sqft'>(initial?.sizeUnit ?? 'sqft');
  const [sizeTargetStr, setSizeTargetStr] = useState<string>(initial?.sizeTarget ? String(initial.sizeTarget) : '');

  // Commercial Face / Frontage (Feet ±10%)
  const [faceFtStr, setFaceFtStr] = useState<string>(initial?.faceFt ? String(initial.faceFt) : '');

  // Carpet Area (Sq Ft ±10%)
  const [carpetAreaTargetStr, setCarpetAreaTargetStr] = useState<string>(initial?.carpetAreaTarget ? String(initial.carpetAreaTarget) : '');

  // Budget Target (INR ±10%) OR Custom Ranges
  const [targetBudgetStr, setTargetBudgetStr] = useState<string>(initial?.targetBudget ? String(initial.targetBudget) : '');
  const [selectedBudgetRanges, setSelectedBudgetRanges] = useState<string[]>(initial?.selectedBudgetRanges ?? []);
  const [minPrice, setMinPrice] = useState(initial?.minPrice ?? '');
  const [maxPrice, setMaxPrice] = useState(initial?.maxPrice ?? '');

  // Derive Dynamic Options from Dataset
  const derived = useMemo(() => deriveFilterOptions(properties), [properties]);

  // Build active filter payload for live count calculation
  const activeFilters: MobileFilters = useMemo(() => {
    return {
      searchQuery,
      selectedTypes,
      selectedSubTypes,
      selectedBedrooms,
      selectedAreas,
      selectedFacing,
      budgetMode: targetBudgetStr ? 'target' : (selectedBudgetRanges.length ? 'ranges' : 'custom'),
      selectedBudgetRanges,
      minPrice,
      maxPrice,
      minSqft: '',
      maxSqft: '',
      sizeUnit,
      sizeTarget: sizeTargetStr ? parseFloat(sizeTargetStr) : null,
      faceFt: faceFtStr ? parseFloat(faceFtStr) : null,
      carpetAreaTarget: carpetAreaTargetStr ? parseFloat(carpetAreaTargetStr) : null,
      targetBudget: targetBudgetStr ? parseFloat(targetBudgetStr) : null,
    };
  }, [
    searchQuery, selectedTypes, selectedSubTypes, selectedBedrooms, selectedAreas,
    selectedFacing, targetBudgetStr, selectedBudgetRanges, minPrice, maxPrice,
    sizeUnit, sizeTargetStr, faceFtStr, carpetAreaTargetStr,
  ]);

  // Live Matching Property Count
  const filteredProperties = useMemo(() => applyFilters(properties, activeFilters), [properties, activeFilters]);

  const activeCount = useMemo(() => {
    return (searchQuery ? 1 : 0) +
      selectedTypes.length +
      selectedSubTypes.length +
      selectedBedrooms.length +
      (selectedAreas.includes('All') ? 0 : selectedAreas.length) +
      (selectedFacing.includes('All') ? 0 : selectedFacing.length) +
      (sizeTargetStr ? 1 : 0) +
      (faceFtStr ? 1 : 0) +
      (carpetAreaTargetStr ? 1 : 0) +
      (targetBudgetStr ? 1 : (selectedBudgetRanges.length || minPrice || maxPrice ? 1 : 0));
  }, [
    searchQuery, selectedTypes, selectedSubTypes, selectedBedrooms, selectedAreas,
    selectedFacing, sizeTargetStr, faceFtStr, carpetAreaTargetStr, targetBudgetStr,
    selectedBudgetRanges, minPrice, maxPrice,
  ]);

  const clearAll = React.useCallback(() => {
    setSearchQuery('');
    setSelectedTypes(lockedType ? [lockedType] : []);
    setSelectedSubTypes([]);
    setSelectedBedrooms([]);
    setSelectedAreas([]);
    setSelectedFacing([]);
    setSizeTargetStr('');
    setFaceFtStr('');
    setCarpetAreaTargetStr('');
    setTargetBudgetStr('');
    setSelectedBudgetRanges([]);
    setMinPrice('');
    setMaxPrice('');
  }, [lockedType]);

  const handleApply = () => {
    const returnTo = route.params?.returnTo ?? 'Properties';
    const returnParams = route.params?.returnParams ?? {};

    nav.navigate({
      name: returnTo as any,
      params: {
        ...returnParams,
        filters: activeFilters,
      },
      merge: true,
    });
  };

  React.useLayoutEffect(() => {
    nav.setOptions({
      title: 'Filters',
      headerLeft: () => (
        <TouchableOpacity onPress={() => nav.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginLeft: 16 }}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
      headerRight: () => activeCount > 0 ? (
        <TouchableOpacity onPress={clearAll} style={{ marginRight: 16 }}>
          <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Reset</Text>
        </TouchableOpacity>
      ) : null,
    });
  }, [nav, activeCount, clearAll, colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* ── 1. SEARCH QUERY ────────────────────────────────────────────── */}
        <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Property Keyword</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by title, area, builder..."
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>

        {/* ── 2. PROPERTY TYPE (Only if multiple available) ───────────── */}
        {!lockedType && (
          <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Property Category</Text>
            <View style={styles.chipRow}>
              {PROP_TYPES.map(pt => {
                const active = selectedTypes.includes(pt.value);
                return (
                  <TouchableOpacity
                    key={pt.value}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => setSelectedTypes(toggle(selectedTypes, pt.value))}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {pt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 3. DYNAMIC SUBTYPE (Only if data exists) ──────────────────── */}
        {derived.availableSubTypes.length > 0 && (
          <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Property Type / Subtype</Text>
            <View style={styles.chipRow}>
              {derived.availableSubTypes.map(st => {
                const active = selectedSubTypes.includes(st);
                return (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => setSelectedSubTypes(toggle(selectedSubTypes, st))}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 4. DYNAMIC BEDROOMS (Only if dataset contains beds) ──────── */}
        {derived.availableBedrooms.length > 0 && (
          <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Bedrooms (BHK)</Text>
            <View style={styles.chipRow}>
              {derived.availableBedrooms.map(b => {
                const active = selectedBedrooms.includes(b);
                return (
                  <TouchableOpacity
                    key={b}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => setSelectedBedrooms(toggle(selectedBedrooms, b))}
                  >
                    <Ionicons name="bed-outline" size={14} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {b}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 5. PROPERTY SIZE (Unit Aware: Vaar vs Sq Ft ±10%) ────────── */}
        <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>Property Size</Text>
            {/* Unit Selector */}
            <View style={[styles.unitToggle, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.unitBtn, sizeUnit === 'vaar' && { backgroundColor: colors.primary }]}
                onPress={() => setSizeUnit('vaar')}
              >
                <Text style={[styles.unitText, { color: sizeUnit === 'vaar' ? '#fff' : colors.textSecondary }]}>Vaar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unitBtn, sizeUnit === 'sqft' && { backgroundColor: colors.primary }]}
                onPress={() => setSizeUnit('sqft')}
              >
                <Text style={[styles.unitText, { color: sizeUnit === 'sqft' ? '#fff' : colors.textSecondary }]}>Sq Ft</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border, marginTop: 10 }]}>
            <Ionicons name="resize-outline" size={16} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={sizeTargetStr}
              onChangeText={setSizeTargetStr}
              placeholder={`Enter target size in ${sizeUnit === 'vaar' ? 'Vaar (e.g. 100)' : 'Sq Ft (e.g. 1000)'}`}
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            {sizeTargetStr ? (
              <Text style={[styles.toleranceBadge, { color: colors.primary }]}>±10% Range</Text>
            ) : null}
          </View>
        </View>

        {/* ── 6. COMMERCIAL FACE / FRONTAGE (Feet ±10%) ─────────────────── */}
        <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Commercial Face / Frontage (Feet)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Ionicons name="expand-outline" size={16} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={faceFtStr}
              onChangeText={setFaceFtStr}
              placeholder="Enter front width in Feet (e.g. 30)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            {faceFtStr ? <Text style={[styles.toleranceBadge, { color: colors.primary }]}>±10% Range</Text> : null}
          </View>
        </View>

        {/* ── 7. CARPET AREA (Sq Ft ±10%) ────────────────────────────────── */}
        <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Carpet Area (Square Feet)</Text>
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Ionicons name="square-outline" size={16} color={colors.primary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={carpetAreaTargetStr}
              onChangeText={setCarpetAreaTargetStr}
              placeholder="Enter carpet area in Sq Ft (e.g. 1500)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            {carpetAreaTargetStr ? <Text style={[styles.toleranceBadge, { color: colors.primary }]}>±10% Range</Text> : null}
          </View>
        </View>

        {/* ── 8. TARGET BUDGET (INR ±10%) & RANGES ───────────────────────── */}
        <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Budget / Price (₹)</Text>
          
          {/* Target Budget Input */}
          <View style={[styles.inputWrap, { backgroundColor: colors.surfaceSunken, borderColor: colors.border, marginBottom: 12 }]}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.primary }}>₹</Text>
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={targetBudgetStr}
              onChangeText={setTargetBudgetStr}
              placeholder="Enter target budget (e.g. 5000000)"
              placeholderTextColor={colors.textTertiary}
              keyboardType="numeric"
            />
            {targetBudgetStr ? <Text style={[styles.toleranceBadge, { color: colors.primary }]}>±10% Range</Text> : null}
          </View>

          {!targetBudgetStr && (
            <View style={styles.chipRow}>
              {BUDGET_RANGES.map(br => {
                const active = selectedBudgetRanges.includes(br.label);
                return (
                  <TouchableOpacity
                    key={br.label}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => setSelectedBudgetRanges(toggle(selectedBudgetRanges, br.label))}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {br.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* ── 9. DYNAMIC AREAS (Only options present in dataset) ───────── */}
        {derived.availableAreas.length > 0 && (
          <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Area / Locality</Text>
            <View style={styles.chipRow}>
              {derived.availableAreas.map(a => {
                const active = selectedAreas.includes(a) || (a === 'All' && selectedAreas.length === 0);
                return (
                  <TouchableOpacity
                    key={a}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => {
                      if (a === 'All') {
                        setSelectedAreas([]);
                      } else {
                        setSelectedAreas(toggle(selectedAreas.filter(x => x !== 'All'), a));
                      }
                    }}
                  >
                    <Ionicons name="location-outline" size={14} color={active ? colors.primary : colors.textSecondary} />
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 10. DYNAMIC FACING (Only if facing data exists) ───────────── */}
        {derived.hasFacingData && (
          <View style={[styles.section, { borderBottomColor: colors.borderLight }]}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Facing Direction</Text>
            <View style={styles.chipRow}>
              {derived.availableFacing.map(f => {
                const active = selectedFacing.includes(f) || (f === 'All' && selectedFacing.length === 0);
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.chip,
                      { backgroundColor: active ? colors.primaryBg : colors.surfaceSunken, borderColor: active ? colors.primaryBorder : colors.border }
                    ]}
                    onPress={() => {
                      if (f === 'All') {
                        setSelectedFacing([]);
                      } else {
                        setSelectedFacing(toggle(selectedFacing.filter(x => x !== 'All'), f));
                      }
                    }}
                  >
                    <Text style={[styles.chipText, { color: active ? colors.primary : colors.textPrimary, fontWeight: active ? '700' : '600' }]}>
                      {f}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer Apply Button with Live Property Count */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={handleApply}
        >
          <Text style={styles.applyBtnText}>
            Show {filteredProperties.length} {filteredProperties.length === 1 ? 'Property' : 'Properties'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Type map definition for navigation route
type RoutePropMap = {
  Filters: {
    type?: string;
    properties?: Property[];
    initial?: MobileFilters;
    returnTo?: string;
    returnParams?: any;
  };
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '800' },
  resetText: { fontSize: 14, fontWeight: '700' },

  body: { flex: 1, paddingHorizontal: 16 },
  section: { paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },

  unitToggle: { flexDirection: 'row', borderRadius: RADIUS.sm, borderWidth: 1, padding: 2 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.sm - 2 },
  unitText: { fontSize: 12, fontWeight: '700' },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: RADIUS.md, borderWidth: 1, paddingHorizontal: 12, height: 46,
  },
  input: { flex: 1, fontSize: 14, fontWeight: '500' },
  toleranceBadge: { fontSize: 11, fontWeight: '800' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 13, paddingVertical: 9,
    borderRadius: RADIUS.md, borderWidth: 1,
    minHeight: 38,
  },
  chipText: { fontSize: 13 },

  footer: {
    padding: 16,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  applyBtn: {
    paddingVertical: 15,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
});
