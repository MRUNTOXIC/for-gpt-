import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export interface SuggestionItem {
  id: string;
  type: 'location' | 'property' | 'project' | 'recent';
  title: string;
  subtitle?: string;
  query: string;
  filterParams?: any;
}

interface SearchSuggestionsProps {
  suggestions: SuggestionItem[];
  recentSearches: string[];
  onSelectSuggestion: (item: SuggestionItem | string) => void;
  onRemoveRecent: (query: string) => void;
  onClearAllRecent: () => void;
}

export default function SearchSuggestions({
  suggestions,
  recentSearches,
  onSelectSuggestion,
  onRemoveRecent,
  onClearAllRecent,
}: SearchSuggestionsProps) {
  const { colors } = useTheme();

  const getIcon = (type: SuggestionItem['type']) => {
    switch (type) {
      case 'location': return 'location-outline';
      case 'property': return 'home-outline';
      case 'project': return 'business-outline';
      case 'recent': return 'time-outline';
      default: return 'search-outline';
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {/* RECENT SEARCHES SECTION */}
      {recentSearches.length > 0 && suggestions.length === 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>RECENT SEARCHES</Text>
            <TouchableOpacity onPress={onClearAllRecent}>
              <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.recentWrap}>
            {recentSearches.map((query, index) => (
              <View key={`${query}-${index}`} style={[styles.recentChip, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
                <TouchableOpacity style={styles.recentChipBtn} onPress={() => onSelectSuggestion(query)}>
                  <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.recentChipText, { color: colors.textPrimary }]}>{query}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onRemoveRecent(query)} style={styles.removeRecentBtn}>
                  <Ionicons name="close" size={14} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* MATCHING SUGGESTIONS */}
      {suggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SUGGESTIONS</Text>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
              onPress={() => onSelectSuggestion(item)}
            >
              <View style={[styles.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
                <Ionicons name={getIcon(item.type) as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={[styles.suggestionTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                {item.subtitle && (
                  <Text style={[styles.suggestionSub, { color: colors.textTertiary }]}>{item.subtitle}</Text>
                )}
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 14,
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  recentWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 6,
    paddingVertical: 6,
  },
  recentChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  recentChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  removeRecentBtn: {
    marginLeft: 6,
    padding: 2,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionSub: {
    fontSize: 11,
    marginTop: 2,
  },
});
