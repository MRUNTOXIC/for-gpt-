import React, { useCallback, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Text, Platform, Animated } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';

// ─── TAB CONFIG ───────────────────────────────────────────────────────────────

interface TabCfg { icon: string; activeIcon: string; label: string }

const TAB_CONFIG: Record<string, TabCfg> = {
  HomeTab:      { icon: 'home-outline',   activeIcon: 'home',   label: 'Home'    },
  ExploreTab:   { icon: 'search-outline', activeIcon: 'search', label: 'Search'  },
  FavoritesTab: { icon: 'heart-outline',  activeIcon: 'heart',  label: 'Saved'   },
  ProfileTab:   { icon: 'person-outline', activeIcon: 'person', label: 'Profile' },
};

// ─── SINGLE TAB BUTTON ────────────────────────────────────────────────────────

function TabButton({
  cfg, isFocused, onPress, colors,
}: {
  cfg: TabCfg;
  isFocused: boolean;
  onPress: () => void;
  colors: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () =>
    Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, speed: 80, bounciness: 0 }).start();

  const handlePressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 6 }).start();

  const iconColor  = isFocused ? colors.primary : colors.textTertiary;
  const labelColor = isFocused ? colors.primary : colors.textTertiary;

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={s.tab}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={cfg.label}
      accessibilityState={{ selected: isFocused }}
    >
      <Animated.View style={[s.tabInner, { transform: [{ scale }] }]}>
        {/* Active pill behind icon */}
        {isFocused && (
          <View style={[s.activePill, { backgroundColor: colors.primaryBg }]} />
        )}
        <Ionicons
          name={(isFocused ? cfg.activeIcon : cfg.icon) as any}
          size={22}
          color={iconColor}
        />
        <Text
          style={[
            s.label,
            { color: labelColor, fontWeight: isFocused ? '700' : '500' },
          ]}
          numberOfLines={1}
        >
          {cfg.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function FloatingBottomNav({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handlePress = useCallback((routeKey: string, routeName: string, isFocused: boolean) => {
    const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName, { merge: true } as any);
    }
  }, [navigation]);

  const safePad = Platform.OS === 'ios'
    ? Math.max(insets.bottom, 16)
    : Math.max(insets.bottom + 4, 12);

  const tabButtons = state.routes.map((route, index) => {
    if (route.name === 'PostTab') return null;
    const cfg = TAB_CONFIG[route.name] ?? { icon: 'ellipse-outline', activeIcon: 'ellipse', label: '' };
    const isFocused = state.index === index;
    return (
      <TabButton
        key={route.key}
        cfg={cfg}
        isFocused={isFocused}
        onPress={() => handlePress(route.key, route.name, isFocused)}
        colors={colors}
      />
    );
  });

  const barContent = (
    <View style={[s.row, { paddingBottom: safePad }]}>
      {tabButtons}
    </View>
  );

  return (
    <View style={s.container}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={isDark ? 55 : 80}
          tint={isDark ? 'dark' : 'light'}
          style={[s.bar, { borderTopColor: colors.border }]}
        >
          {barContent}
        </BlurView>
      ) : (
        <View
          style={[
            s.bar,
            {
              borderTopColor: colors.border,
              backgroundColor: isDark ? 'rgba(10,10,10,0.98)' : 'rgba(255,255,255,0.98)',
              elevation: 20,
            },
          ]}
        >
          {barContent}
        </View>
      )}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    position: 'relative',
  },
  activePill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.1,
  },
});
