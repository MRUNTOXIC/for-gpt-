import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../theme/ThemeContext';
import { getRandomSampleNotification, sendLocalNotification } from '../services/notifications';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';

const STORAGE_KEY = 'ivanta_notifications';

export type StoredNotif = {
  id: string;
  title: string;
  body: string;
  type: string;
  date: number;
  read?: boolean;
  propertyId?: string;
  actionText?: string;
};

export const SEED_NOTIFICATIONS: StoredNotif[] = [
  {
    id: 'notif-1',
    title: '🏷️ Price Drop Alert! (₹5 Lakhs Off)',
    body: '"3 BHK Luxury Apartment" in Kalawad Road, Rajkot dropped price from ₹65L to ₹60L.',
    type: 'price_drop',
    date: Date.now() - 15 * 60 * 1000,
    read: false,
    propertyId: 'p-1',
    actionText: 'View Property',
  },
  {
    id: 'notif-2',
    title: '💬 New Buyer Inquiry Received',
    body: 'Priya Mehta asked: "Is this 3 BHK property available for immediate possession?"',
    type: 'inquiry',
    date: Date.now() - 60 * 60 * 1000,
    read: false,
    actionText: 'Reply Inquiry',
  },
  {
    id: 'notif-3',
    title: '🏦 Home Loan Pre-Approved!',
    body: 'Great news! Your HDFC Home Loan application (#IVN-8924) of ₹45 Lakhs has been pre-approved at 8.35% p.a.',
    type: 'loan_update',
    date: Date.now() - 3 * 60 * 60 * 1000,
    read: false,
    actionText: 'Check Loan Details',
  },
  {
    id: 'notif-4',
    title: '🏗️ New Luxury Project Launch',
    body: 'Shreeji Group launched "Ivanta Sky Villas" in University Road, Rajkot. Early bird 5% discount active!',
    type: 'builder_update',
    date: Date.now() - 6 * 60 * 60 * 1000,
    read: true,
    propertyId: 'p-4',
    actionText: 'Explore Project',
  },
  {
    id: 'notif-5',
    title: '📅 Site Visit Scheduled Tomorrow',
    body: 'Confirmed: Site visit at 11:00 AM for "Commercial Space in 150 Feet Ring Road".',
    type: 'viewing_scheduled',
    date: Date.now() - 18 * 60 * 60 * 1000,
    read: true,
    actionText: 'View Schedule',
  },
  {
    id: 'notif-6',
    title: '💰 New Purchase Offer Received',
    body: 'Buyer Mr. Patel submitted a buy offer of ₹72 Lakhs for your "3 BHK Flat in Mavdi".',
    type: 'offer_received',
    date: Date.now() - 24 * 60 * 60 * 1000,
    read: true,
    actionText: 'Review Offer',
  },
  {
    id: 'notif-7',
    title: '🔍 3 New Matches Found',
    body: 'New listings matching your saved search "3 BHK under ₹65 Lakhs in Rajkot" are now available.',
    type: 'saved_search',
    date: Date.now() - 2 * 24 * 60 * 60 * 1000,
    read: true,
    actionText: 'View Matches',
  },
  {
    id: 'notif-8',
    title: '✅ Listing Approved & Published',
    body: 'Your property "2 BHK Flat near Crystal Mall" is verified and live for 50,000+ buyers.',
    type: 'approved',
    date: Date.now() - 3 * 24 * 60 * 60 * 1000,
    read: true,
    actionText: 'View Listing',
  },
  {
    id: 'notif-9',
    title: '🏠 Property Marked as Sold',
    body: '"4 BHK Penthouse" in 150 Ft Ring Road from your saved list was marked as Sold.',
    type: 'sold',
    date: Date.now() - 4 * 24 * 60 * 60 * 1000,
    read: true,
  },
  {
    id: 'notif-10',
    title: '🎉 Welcome to Ivanta Properties',
    body: 'Discover verified residential, commercial & rental properties with hassle-free loan approvals.',
    type: 'new_property',
    date: Date.now() - 5 * 24 * 60 * 60 * 1000,
    read: true,
  },
];

export async function saveNotification(notif: StoredNotif) {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const existing: StoredNotif[] = raw ? JSON.parse(raw) : [];
    const updated = [notif, ...existing].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function iconForType(type: string) {
  switch (type) {
    case 'price_drop':
      return { icon: 'trending-down-outline', color: '#059669', bg: '#ecfdf5', badge: 'PRICE DROP' };
    case 'inquiry':
      return { icon: 'chatbubbles-outline', color: '#8b5cf6', bg: '#f5f3ff', badge: 'INQUIRY' };
    case 'loan_update':
      return { icon: 'cash-outline', color: '#d97706', bg: '#fffbeb', badge: 'LOAN UPDATE' };
    case 'builder_update':
      return { icon: 'business-outline', color: '#2563eb', bg: '#eff6ff', badge: 'PROJECT LAUNCH' };
    case 'viewing_scheduled':
      return { icon: 'calendar-outline', color: '#ec4899', bg: '#fdf2f8', badge: 'SITE VISIT' };
    case 'offer_received':
      return { icon: 'pricetag-outline', color: '#0d9488', bg: '#f0fdf4', badge: 'NEW OFFER' };
    case 'saved_search':
      return { icon: 'search-outline', color: '#0284c7', bg: '#f0f9ff', badge: 'MATCH FOUND' };
    case 'approved':
      return { icon: 'checkmark-circle-outline', color: '#16a34a', bg: '#f0fdf4', badge: 'APPROVED' };
    case 'sold':
      return { icon: 'home-outline', color: '#dc2626', bg: '#fef2f2', badge: 'SOLD' };
    case 'new_property':
      return { icon: 'sparkles-outline', color: '#6366f1', bg: '#eef2ff', badge: 'NEW LISTING' };
    default:
      return { icon: 'notifications-outline', color: '#c0392b', bg: '#fef2f2', badge: 'GENERAL' };
  }
}

function timeAgo(ts: number) {
  const diff = Math.max(0, (Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type FilterTab = 'All' | 'Unread' | 'Leads & Offers' | 'Property Alerts';

export default function NotificationScreen() {
  const nav = useNavigation<any>();
  const { colors } = useTheme();
  const [notifs, setNotifs] = useState<StoredNotif[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw || JSON.parse(raw).length === 0) {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_NOTIFICATIONS));
        setNotifs(SEED_NOTIFICATIONS);
      } else {
        setNotifs(JSON.parse(raw));
      }
    } catch {
      setNotifs(SEED_NOTIFICATIONS);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const persistNotifs = async (updated: StoredNotif[]) => {
    setNotifs(updated);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const clearAll = useCallback(async () => {
    Alert.alert('Clear All', 'Are you sure you want to clear all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(STORAGE_KEY);
          setNotifs([]);
        },
      },
    ]);
  }, []);

  const markAllRead = async () => {
    const updated = notifs.map(n => ({ ...n, read: true }));
    await persistNotifs(updated);
  };

  const toggleRead = async (id: string) => {
    const updated = notifs.map(n => (n.id === id ? { ...n, read: true } : n));
    await persistNotifs(updated);
  };

  const deleteNotif = async (id: string) => {
    const updated = notifs.filter(n => n.id !== id);
    await persistNotifs(updated);
  };

  const handleAddSampleNotif = useCallback(async () => {
    const newNotif = getRandomSampleNotification();
    const updated = [newNotif, ...notifs];
    await persistNotifs(updated);
    await sendLocalNotification(newNotif.title, newNotif.body, { type: newNotif.type });
  }, [notifs]);

  const handleCardPress = (item: StoredNotif) => {
    toggleRead(item.id);
    if (item.propertyId) {
      nav.navigate('PropertyDetail', { propertyId: item.propertyId });
    } else if (item.type === 'loan_update') {
      nav.navigate('Loans');
    } else if (item.type === 'builder_update') {
      nav.navigate('Builders');
    } else if (item.type === 'inquiry' || item.type === 'offer_received') {
      nav.navigate('Profile');
    }
  };

  const unreadCount = notifs.filter(n => !n.read).length;

  const filteredNotifs = notifs.filter(item => {
    if (activeFilter === 'Unread') return !item.read;
    if (activeFilter === 'Leads & Offers') {
      return ['inquiry', 'offer_received', 'loan_update'].includes(item.type);
    }
    if (activeFilter === 'Property Alerts') {
      return ['price_drop', 'builder_update', 'new_property', 'approved', 'sold', 'saved_search'].includes(item.type);
    }
    return true;
  });

  React.useLayoutEffect(() => {
    nav.setOptions({
      title: 'Notifications',
      headerTitle: () => (
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadgeHeader, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeHeaderText}>{unreadCount} unread</Text>
            </View>
          )}
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleAddSampleNotif} style={styles.addBtn}>
            <Ionicons name="add-circle" size={22} color={colors.primary} />
          </TouchableOpacity>
          {notifs.length > 0 && (
            <TouchableOpacity onPress={clearAll} style={styles.clearBtn}>
              <Text style={[styles.clearText, { color: colors.primary }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      ),
    });
  }, [nav, unreadCount, notifs.length, colors, handleAddSampleNotif, clearAll]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>

      {/* ── Subheader Controls (Mark Read & Quick Add) ───────── */}
      <View style={[styles.subHeader, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markReadBtn}>
            <Ionicons name="checkmark-done-outline" size={16} color={colors.primary} />
            <Text style={[styles.markReadText, { color: colors.primary }]}>Mark all as read</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.allReadText, { color: colors.textTertiary }]}>All notifications caught up!</Text>
        )}
        <TouchableOpacity onPress={handleAddSampleNotif} style={[styles.triggerNotifBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={14} color="#fff" />
          <Text style={styles.triggerNotifText}>+ Generate Notif</Text>
        </TouchableOpacity>
      </View>

      {/* ── Category Filters ──────────────────────────────────── */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['All', 'Unread', 'Leads & Offers', 'Property Alerts'] as FilterTab[]).map(tab => {
            const isActive = activeFilter === tab;
            let badgeNum = 0;
            if (tab === 'Unread') badgeNum = unreadCount;

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveFilter(tab)}
                style={[
                  styles.filterPill,
                  { backgroundColor: isActive ? colors.primary : colors.surface, borderColor: isActive ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.filterText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                  {tab}
                </Text>
                {badgeNum > 0 && (
                  <View style={[styles.filterBadge, { backgroundColor: isActive ? '#fff' : colors.primary }]}>
                    <Text style={[styles.filterBadgeText, { color: isActive ? colors.primary : '#fff' }]}>{badgeNum}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Notification List ─────────────────────────────────── */}
      <FlatList
        data={filteredNotifs}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const { icon, color, bg, badge } = iconForType(item.type);
          const isUnread = !item.read;

          return (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => handleCardPress(item)}
              style={[
                styles.card,
                {
                  backgroundColor: isUnread ? colors.primaryBg : colors.surface,
                  borderColor: isUnread ? colors.primaryBorder : colors.border,
                },
              ]}
            >
              <View style={[styles.iconWrap, { backgroundColor: bg }]}>
                <Ionicons name={icon as any} size={22} color={color} />
              </View>

              <View style={styles.content}>
                <View style={styles.topRow}>
                  <View style={[styles.badgePill, { backgroundColor: color + '18' }]}>
                    <Text style={[styles.badgeText, { color }]}>{badge}</Text>
                  </View>
                  <Text style={[styles.time, { color: colors.textTertiary }]}>{timeAgo(item.date)}</Text>
                </View>

                <View style={styles.titleRow}>
                  <Text style={[styles.itemTitle, { color: colors.textPrimary, fontWeight: isUnread ? '800' : '600' }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {isUnread && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                </View>

                <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.body}
                </Text>

                {item.actionText && (
                  <View style={styles.actionRow}>
                    <Text style={[styles.actionText, { color: colors.primary }]}>{item.actionText} →</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity onPress={() => deleteNotif(item.id)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="trash-outline" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={60} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No notifications in {activeFilter}</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Tap the button below to generate interactive test notifications.
            </Text>
            <PremiumGradientButton
              title="Generate Sample Notification"
              icon="sparkles"
              onPress={handleAddSampleNotif}
              style={{ marginTop: 20 }}
            />
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 18, fontWeight: '800' },
  unreadBadgeHeader: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unreadBadgeHeaderText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addBtn: { padding: 2 },
  clearBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  clearText: { fontSize: 14, fontWeight: '700' },

  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  markReadBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  markReadText: { fontSize: 12, fontWeight: '700' },
  allReadText: { fontSize: 12, fontWeight: '500' },
  triggerNotifBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 4,
  },
  triggerNotifText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  filterBar: { paddingVertical: 10 },
  filterScroll: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  filterBadge: { borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  filterBadgeText: { fontSize: 10, fontWeight: '800' },

  list: { padding: 16, paddingBottom: 150 },
  card: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badgePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  time: { fontSize: 11, marginLeft: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  itemTitle: { fontSize: 14, flex: 1, paddingRight: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
  body: { fontSize: 13, lineHeight: 18 },
  actionRow: { marginTop: 6 },
  actionText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: { paddingLeft: 8, paddingTop: 2 },

  empty: { alignItems: 'center', marginTop: 60, paddingHorizontal: 30 },
  emptyTitle: { marginTop: 16, fontSize: 16, fontWeight: '700' },
  emptySub: { marginTop: 6, fontSize: 13, textAlign: 'center', lineHeight: 18 },
  addSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addSampleText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
