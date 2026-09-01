import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated, FlatList, KeyboardAvoidingView, Modal,
  Platform, Pressable, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

// ─── TYPES ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  label: string;
  value: string;
  count?: number;          // optional property count badge
  sub?: string;            // optional subtitle line
}

interface Props {
  /** Options to display in the sheet */
  options: SelectOption[];
  /** Currently selected value(s) */
  value: string | string[] | null;
  /** Called when an option is tapped */
  onSelect: (value: string) => void;
  /** Placeholder shown on the trigger when nothing is selected */
  placeholder: string;
  /** Sheet title */
  title: string;
  /** Left icon for the trigger row */
  icon?: keyof typeof import('@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Ionicons.json');
  /** Allow selecting multiple values */
  multi?: boolean;
  /** Show internal search box (useful when list > 10 items) */
  searchable?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Accent colour — defaults to brand red */
  accentColor?: string;
  /** If true, renders a compact inline chip trigger instead of the full row */
  compact?: boolean;
  /** Called when the sheet is opened */
  onOpen?: () => void;
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function BottomSheetSelect({
  options,
  value,
  onSelect,
  placeholder,
  title,
  icon = 'chevron-down',
  multi = false,
  searchable = false,
  disabled = false,
  accentColor = '#c0392b',
  compact = false,
  onOpen,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Sheet slide-up animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const openSheet = useCallback(() => {
    if (disabled) return;
    setQuery('');
    setOpen(true);
    onOpen?.();
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, bounciness: 4, speed: 20 }),
      Animated.timing(backdropAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [disabled, slideAnim, backdropAnim, onOpen]);

  const closeSheet = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setOpen(false);
      setQuery('');
    });
  }, [slideAnim, backdropAnim]);

  const handleSelect = useCallback((val: string) => {
    onSelect(val);
    if (!multi) closeSheet();
  }, [onSelect, multi, closeSheet]);

  // Derived display label
  const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
  const displayLabel = selectedValues.length === 0
    ? null
    : selectedValues.length === 1
      ? (options.find(o => o.value === selectedValues[0])?.label ?? selectedValues[0])
      : `${selectedValues.length} selected`;

  // Filtered list
  const filteredOptions = query.trim()
    ? options.filter(o =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.sub?.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Sheet translate
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  // shared Sheet props
  const sheetProps = {
    open, title, query, setQuery, searchable, filteredOptions,
    selectedValues, handleSelect, closeSheet, multi, accentColor,
    translateY, backdropAnim, insets, colors,
  };

  // ── COMPACT trigger (inline chip) ──────────────────────────────────────────
  if (compact) {
    return (
      <>
        <TouchableOpacity
          onPress={openSheet}
          disabled={disabled}
          style={[
            styles.compactChip,
            { borderColor: colors.border, backgroundColor: colors.surfaceSunken },
            selectedValues.length > 0 && { backgroundColor: accentColor, borderColor: accentColor },
            disabled && styles.disabled,
          ]}
          accessibilityLabel={displayLabel ?? placeholder}
          accessibilityRole="button"
        >
          <Text
            style={[
              styles.compactChipText,
              { color: colors.textSecondary },
              selectedValues.length > 0 && { color: '#fff' },
            ]}
            numberOfLines={1}
          >
            {displayLabel ?? placeholder}
          </Text>
          <Ionicons
            name="chevron-down"
            size={12}
            color={selectedValues.length > 0 ? '#fff' : colors.textTertiary}
          />
        </TouchableOpacity>
        <Sheet {...sheetProps} />
      </>
    );
  }

  // ── FULL row trigger ────────────────────────────────────────────────────────
  return (
    <>
      <TouchableOpacity
        onPress={openSheet}
        disabled={disabled}
        style={[
          styles.trigger,
          { backgroundColor: colors.surface, borderColor: colors.border },
          disabled && styles.disabled,
        ]}
        accessibilityLabel={displayLabel ?? placeholder}
        accessibilityRole="button"
      >
        <View style={styles.triggerLeft}>
          <Ionicons name={icon as any} size={18} color={displayLabel ? accentColor : colors.textTertiary} />
          <View style={styles.triggerTextWrap}>
            <Text style={[styles.triggerLabel, { color: colors.textTertiary }]}>{placeholder}</Text>
            {displayLabel && (
              <Text style={[styles.triggerValue, { color: accentColor }]} numberOfLines={1}>
                {displayLabel}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
      </TouchableOpacity>
      <Sheet {...sheetProps} />
    </>
  );
}

// ─── SHEET (extracted so both compact and full can reuse it) ──────────────────

interface SheetProps {
  open: boolean;
  title: string;
  query: string;
  setQuery: (v: string) => void;
  searchable: boolean;
  filteredOptions: SelectOption[];
  selectedValues: string[];
  handleSelect: (v: string) => void;
  closeSheet: () => void;
  multi: boolean;
  accentColor: string;
  translateY: Animated.AnimatedInterpolation<string | number>;
  backdropAnim: Animated.Value;
  insets: { bottom: number; top: number };
  colors: import('../theme/colors').ThemeColors;
}

function Sheet({
  open, title, query, setQuery, searchable, filteredOptions,
  selectedValues, handleSelect, closeSheet, multi, accentColor,
  translateY, backdropAnim, insets, colors,
}: SheetProps) {
  if (!open) return null;

  return (
    <Modal
      visible={open}
      transparent
      animationType="none"
      onRequestClose={closeSheet}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
      </Animated.View>

      {/* Sheet panel */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetContainer}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: colors.surface,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{title}</Text>
            <TouchableOpacity
              onPress={closeSheet}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          {searchable && (
            <View style={[styles.searchRow, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Search..."
                placeholderTextColor={colors.textTertiary}
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')}>
                  <Ionicons name="close-circle" size={17} color={colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Options */}
          <FlatList
            data={filteredOptions}
            keyExtractor={(item, index) => `${item.value}-${index}`}
            style={{ maxHeight: 400 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No options found</Text>
              </View>
            }
            renderItem={({ item }) => {
              const isSelected = selectedValues.includes(item.value);
              return (
                <TouchableOpacity
                  style={[
                    styles.option,
                    { borderBottomColor: colors.borderLight },
                    isSelected && { backgroundColor: colors.primaryBg },
                  ]}
                  onPress={() => handleSelect(item.value)}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.optionLeft}>
                    {multi ? (
                      <View style={[styles.checkbox, { borderColor: colors.border }, isSelected && { backgroundColor: accentColor, borderColor: accentColor }]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                      </View>
                    ) : (
                      <View style={[styles.radio, { borderColor: colors.border }, isSelected && { borderColor: accentColor }]}>
                        {isSelected && <View style={[styles.radioDot, { backgroundColor: accentColor }]} />}
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.optionLabel, { color: colors.textPrimary }, isSelected && { color: accentColor, fontWeight: '700' }]}>
                        {item.label}
                      </Text>
                      {item.sub && <Text style={[styles.optionSub, { color: colors.textTertiary }]}>{item.sub}</Text>}
                    </View>
                  </View>
                  {item.count !== undefined && (
                    <View style={[styles.countBadge, { backgroundColor: colors.surfaceSunken }, isSelected && { backgroundColor: accentColor }]}>
                      <Text style={[styles.countText, { color: colors.textSecondary }, isSelected && { color: '#fff' }]}>{item.count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Multi done button */}
          {multi && (
            <TouchableOpacity
              style={[styles.doneBtn, { backgroundColor: accentColor }]}
              onPress={closeSheet}
            >
              <Text style={styles.doneBtnText}>
                {selectedValues.length > 0 ? `Done (${selectedValues.length} selected)` : 'Done'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Full trigger row
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 10,
  },
  triggerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  triggerTextWrap: { flex: 1 },
  triggerLabel: { fontSize: 12, fontWeight: '500' },
  triggerValue: { fontSize: 15, fontWeight: '700', marginTop: 1 },
  disabled: { opacity: 0.45 },

  // Compact chip trigger
  compactChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  compactChipText: { fontSize: 13, fontWeight: '600', maxWidth: 100 },

  // Modal backdrop
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },

  // Sheet container + sheet
  sheetContainer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 12,
  },

  // Sheet header
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 14,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800' },

  // Search row inside sheet
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Options
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '500' },
  optionSub: { fontSize: 11, marginTop: 2 },

  // Radio
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  // Checkbox
  checkbox: {
    width: 20, height: 20, borderRadius: 5,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
  },

  // Count badge
  countBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  countText: { fontSize: 11, fontWeight: '700' },

  // Done button (multi)
  doneBtn: { marginTop: 12, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Empty state
  emptyWrap: { alignItems: 'center', paddingVertical: 28 },
  emptyText: { fontSize: 14 },
});
