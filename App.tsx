import 'react-native-gesture-handler';
import React, { useState, useRef, useEffect } from 'react';
import { Linking, LogBox, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Silence the expo-notifications Expo Go warning — we already guard every
// notification call with `if (!isExpoGo)`, so this is expected behaviour.
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
]);

import HomeScreen from './src/screens/HomeScreen';
import PropertiesScreen from './src/screens/PropertiesScreen';
import PropertyDetailScreen from './src/screens/PropertyDetailScreen';
import FavoritesScreen from './src/screens/FavoritesScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import SearchScreen from './src/screens/SearchScreen';
import FiltersScreen from './src/screens/FiltersScreen';
import LoginScreen from './src/screens/LoginScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import NearbyMapScreen from './src/screens/NearbyMapScreen';
import LoansScreen from './src/screens/LoansScreen';

import BuildersScreen from './src/screens/BuildersScreen';
import FloatingBottomNav from './src/components/modern/FloatingBottomNav';
import { RootStackParamList } from './src/navigation';
import { AuthContext } from './src/auth/context';
import type { AuthUser } from './src/auth/types';
import { API_BASE } from './src/services/api';
import { saveNotification } from './src/screens/NotificationScreen';

async function registerPushToken(userId: string) {
  // Push token registration is not supported in Expo Go (SDK 53+).
  // Skip silently when running in Expo Go to avoid the warning.
  if (Constants.appOwnership === 'expo') return;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    const token = (await Notifications.getExpoPushTokenAsync()).data;
    await fetch(`${API_BASE}/push-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, token }),
    });
  } catch {}
}

const Stack = createStackNavigator<RootStackParamList>();

// Only configure notifications outside Expo Go
// (remote push was removed from Expo Go in SDK 53)
const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const SESSION_KEY = '@ivanta_user_session';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<keyof RootStackParamList>('MainTabs');
  const navRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const hasRequestedNotificationPermission = useRef(false);

  // ── Persist session to AsyncStorage whenever user changes ─────────────────
  const persistUser = async (u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(u));
      } else {
        await AsyncStorage.removeItem(SESSION_KEY);
      }
    } catch {}
  };

  // ── Restore session on app launch ─────────────────────────────────────────
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as AuthUser;
          if (saved?.id) setUser(saved);
        }
      } catch {}
      setSessionLoaded(true);
    };
    restoreSession();
  }, []);

  // Handle deep-link callback from Google OAuth
  useEffect(() => {
    const handleUrl = async ({ url }: { url: string }) => {
      if (!url.startsWith('ivanta-property://callback')) return;
      const token = new URL(url).searchParams.get('token');
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE}/auth/token-exchange?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (data?.success && data?.userData) {
          const u = data.userData;
          persistUser({ id: String(u.id ?? u._id ?? ''), email: String(u.email ?? ''), name: String(u.name ?? ''), role: u.role ?? 'User' });
        }
      } catch {}
    };
    const sub = Linking.addEventListener('url', handleUrl);
    Linking.getInitialURL().then(url => { if (url) handleUrl({ url }); });

    // Notification listeners — skip in Expo Go (SDK 53+ removed remote push from Expo Go)
    let notificationListener: any = null;
    let responseListener: any = null;

    if (!isExpoGo) {
      notificationListener = Notifications.addNotificationReceivedListener(notification => {
        const { title, body, data } = notification.request.content;
        saveNotification({
          id: notification.request.identifier,
          title: title ?? 'Notification',
          body: body ?? '',
          type: (data as any)?.type ?? 'general',
          date: Date.now(),
        });
      });

      responseListener = Notifications.addNotificationResponseReceivedListener(response => {
        const { data } = response.notification.request.content;
        const screen = (data as any)?.propertyId ? 'PropertyDetail' : undefined;
        if (screen) {
          setTimeout(() => navRef.current?.navigate(screen as any, { propertyId: (data as any).propertyId }), 500);
        }
      });
    }

    return () => {
      sub.remove();
      notificationListener?.remove();
      responseListener?.remove();
    };
  }, []);

  useEffect(() => {
    if (isExpoGo) return; // permissions not needed in Expo Go
    if (hasRequestedNotificationPermission.current) return;
    hasRequestedNotificationPermission.current = true;

    const requestPermissionOnFirstOpen = async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') return;
        await Notifications.requestPermissionsAsync();
      } catch {}
    };

    requestPermissionOnFirstOpen();
  }, []);

  // Register push token when user logs in
  useEffect(() => {
    if (!user) return;
    registerPushToken(user.id);
  }, [user]);

  // Virtual notification test — tap logo 5 times on HomeScreen
  const triggerTestNotifications = async () => {
    const testList = [
      {
        title: '🏷️ Price Drop Alert!',
        body: '"3 BHK Luxury Apartment" dropped price from ₹65L to ₹60L in Kalawad Road!',
        type: 'price_drop',
        seconds: 1,
        propertyId: 'p-1',
        actionText: 'View Property',
      },
      {
        title: '💬 New Inquiry Received!',
        body: 'Priya Mehta asked: "Is this property available for immediate possession?"',
        type: 'inquiry',
        seconds: 2,
        actionText: 'Reply Inquiry',
      },
      {
        title: '🏦 Home Loan Pre-Approved!',
        body: 'Your HDFC Home Loan application (#IVN-8924) of ₹45 Lakhs is approved at 8.35% p.a.!',
        type: 'loan_update',
        seconds: 3,
        actionText: 'Check Loan Details',
      },
      {
        title: '🏗️ New Luxury Project Launch! 🎉',
        body: 'Shreeji Group launched "Ivanta Sky Villas" in University Road, Rajkot!',
        type: 'builder_update',
        seconds: 4,
        propertyId: 'p-4',
        actionText: 'Explore Project',
      },
      {
        title: 'Property Approved! ✅',
        body: 'Your listing "2 BHK Flat near Crystal Mall" is live for 50,000+ buyers!',
        type: 'approved',
        seconds: 5,
        actionText: 'View Listing',
      },
    ];

    for (const item of testList) {
      try {
        if (!isExpoGo) {
          await Notifications.scheduleNotificationAsync({
            content: { title: item.title, body: item.body, data: { type: item.type, propertyId: item.propertyId } },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: item.seconds },
          });
        }
      } catch {}

      await saveNotification({
        id: 'notif-trig-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        title: item.title,
        body: item.body,
        type: item.type,
        date: Date.now(),
        read: false,
        propertyId: item.propertyId,
        actionText: item.actionText,
      });
    }
  };

  // Expose test trigger globally for simulator testing
  (global as any).__triggerTestNotifications = triggerTestNotifications;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppInner
          user={user}
          setUser={persistUser}
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          navRef={navRef}
          sessionLoaded={sessionLoaded}
        />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

// ─── Tab Navigator ─────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator();

function MainTabs({ currentScreen }: { currentScreen: keyof RootStackParamList }) {
  // Only show the floating bottom nav when we're actually on the MainTabs screen.
  // When the user navigates to Properties, PropertyDetail, etc. the tab bar
  // should disappear — it sits position:absolute so without this it bleeds through.
  const isMainScreen = currentScreen === 'MainTabs';

  return (
    <Tab.Navigator
      tabBar={(props) => isMainScreen ? <FloatingBottomNav {...props} /> : null}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} />
      <Tab.Screen name="ExploreTab" component={SearchScreen} />
      <Tab.Screen name="FavoritesTab" component={FavoritesScreen} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Inner app — has access to ThemeContext ───────────────────────────────────
function AppInner({
  user, setUser, currentScreen, setCurrentScreen, navRef, sessionLoaded,
}: {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  currentScreen: keyof RootStackParamList;
  setCurrentScreen: (s: keyof RootStackParamList) => void;
  navRef: any;
  sessionLoaded: boolean;
}) {
  const { colors } = useTheme();

  // Don't render until we've attempted to restore the session from AsyncStorage.
  // This prevents a flash of the "not logged in" state on every app launch.
  if (!sessionLoaded) return null;

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <NavigationContainer
        ref={navRef}
        onStateChange={(state) => {
          const route = state?.routes[state.index];
          if (route) setCurrentScreen(route.name as keyof RootStackParamList);
        }}
      >
        <StatusBar style={colors.statusBarStyle} />
        <Stack.Navigator
          screenOptions={{
            headerShown: true,
            headerStyle: {
              backgroundColor: colors.headerBg,
              elevation: 0,
              shadowOpacity: 0,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            },
            headerTintColor: colors.headerIcon,
            headerTitleStyle: {
              color: colors.headerText,
              fontWeight: '600',
              fontSize: 16,
            },
            // ── Custom back button: ← arrow instead of < ──────────────────
            headerBackImageSource: undefined,
            headerBackTitle: '',
            headerLeft: ({ canGoBack, onPress }) =>
              canGoBack ? (
                <Pressable
                  onPress={onPress}
                  style={({ pressed }) => ({
                    marginLeft: 12,
                    padding: 6,
                    opacity: pressed ? 0.5 : 1,
                  })}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityLabel="Go back"
                  accessibilityRole="button"
                >
                  <Ionicons name="arrow-back" size={22} color={colors.headerIcon} />
                </Pressable>
              ) : null,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            transitionSpec: {
              open:  { animation: 'spring', config: { stiffness: 1000, damping: 80, mass: 0.5, overshootClamping: true } },
              close: { animation: 'spring', config: { stiffness: 1000, damping: 80, mass: 0.5, overshootClamping: true } },
            },
            gestureEnabled: true,
            gestureDirection: 'horizontal',
          }}
        >
          <Stack.Screen
            name="MainTabs"
            options={{ headerShown: false }}
          >
            {() => <MainTabs currentScreen={currentScreen} />}
          </Stack.Screen>
          <Stack.Screen name="Properties" component={PropertiesScreen} />
          <Stack.Screen name="Filters" component={FiltersScreen} />
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
          <Stack.Screen name="NearbyMap" component={NearbyMapScreen} options={{ headerShown: false }} />
          <Stack.Screen name="PropertyDetail" component={PropertyDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: 'Notifications' }} />
          <Stack.Screen name="Loans" component={LoansScreen} options={{ title: 'Loans' }} />

          <Stack.Screen name="Builders" component={BuildersScreen} options={{ title: 'Top Builders' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
