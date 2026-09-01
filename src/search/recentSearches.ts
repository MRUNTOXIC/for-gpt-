import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RecentSearch, SearchState } from './types';
import { buildSearchLabel } from './queryBuilder';

const KEY = 'ivanta_recent_searches';
const MAX = 5;

export async function getRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearch[];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(state: SearchState): Promise<void> {
  try {
    const existing = await getRecentSearches();
    const label = buildSearchLabel(state);
    if (!label.trim()) return;

    // Remove duplicate with same label
    const deduped = existing.filter(r => r.label !== label);

    const entry: RecentSearch = {
      id: String(Date.now()),
      state,
      label,
      timestamp: Date.now(),
    };

    const updated = [entry, ...deduped].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export async function clearRecentSearches(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
