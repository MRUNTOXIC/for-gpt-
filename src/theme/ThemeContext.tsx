import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LIGHT, DARK, ThemeColors } from './colors';

// ─── Types ────────────────────────────────────────────────────────────────────
export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
};

// ─── Defaults ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ivanta_theme_mode';

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  isDark: false,
  colors: LIGHT,
  setMode: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load persisted preference — with a 300ms safety timeout so AsyncStorage
  // slowness on first launch never leaves the app stuck on a blank screen.
  useEffect(() => {
    let settled = false;
    const done = (val?: string | null) => {
      if (!settled) {
        settled = true;
        if (val === 'light' || val === 'dark' || val === 'system') {
          setModeState(val);
        }
      }
    };

    AsyncStorage.getItem(STORAGE_KEY)
      .then(val => done(val))
      .catch(() => done());

    // Safety net — never wait more than 300ms
    const timer = setTimeout(() => done(), 300);
    return () => clearTimeout(timer);
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  // Derive whether dark colors should be used
  const isDark =
    mode === 'dark' ||
    (mode === 'system' && systemScheme === 'dark');

  const colors: ThemeColors = isDark ? DARK : LIGHT;

  // Don't block rendering on AsyncStorage — show children immediately
  // with the system default, then update once the preference loads.
  // This eliminates the stuck-on-blank-screen issue entirely.

  return (
    <ThemeContext.Provider value={{ mode, isDark, colors, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export const useTheme = () => useContext(ThemeContext);
