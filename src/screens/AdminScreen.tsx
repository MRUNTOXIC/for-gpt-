import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, RefreshControl, ActivityIndicator, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import {
  adminLogin, adminGetAllProperties, adminDeleteProperty,
  adminMarkSold, adminGetUsers, adminUpdateUserRole, getAnalytics, getAdminCookie,
} from '../services/api';
import { Property } from '../types/Property';
import type { UserRole } from '../auth/types';
import { getFullImageUrl } from '../utils/imageUrl';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import type { ThemeColors } from '../theme/colors';

// ─── STAT CARD ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, color, colors,
}: {
  icon: string; label: string; value: string | number; color: string; colors: ThemeColors;
}) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color, backgroundColor: colors.surface }]}>
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[styles.statVal, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );
}

// ─── PROPERTY ROW ─────────────────────────────────────────────────────────────
function PropertyRow({
  property, onDelete, onMarkSold, colors,
}: {
  property: Property;
  onDelete: () => void;
  onMarkSold: () => void;
  colors: ThemeColors;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const img = getFullImageUrl(property.images?.[0]);

  return (
    <View style={[styles.propRow, { backgroundColor: colors.surface }]}>
      {img ? (
        <Image source={{ uri: img }} style={styles.propThumb} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={[styles.propThumb, { backgroundColor: colors.surfaceSunken, justifyContent: 'center', alignItems: 'center' }]}>
          <Ionicons name="home-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.propInfo}>
        <Text style={[styles.propTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {property.title || '(No title)'}
        </Text>
        <Text style={[styles.propMeta, { color: colors.textTertiary }]}>
          {property.propertyType?.toUpperCase()} · {property.area}, {property.city}
        </Text>
        <View style={styles.propBadgeRow}>
          <View style={[
            styles.badge,
            { backgroundColor: property.isSold ? colors.statusPending + '22' : colors.statusApproved + '22' },
          ]}>
            <Text style={[
              styles.badgeText,
              { color: property.isSold ? colors.statusPending : colors.statusApproved },
            ]}>
              {property.isSold ? 'SOLD' : 'ACTIVE'}
            </Text>
          </View>
          {property.category && property.category !== 'None' && (
            <View style={[styles.catBadge, { backgroundColor: colors.accent + '18' }]}>
              <Text style={[styles.catBadgeText, { color: colors.accent }]}>{property.category}</Text>
            </View>
          )}
        </View>
      </View>
      <TouchableOpacity onPress={() => setMenuOpen(true)} style={styles.menuBtn}>
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textTertiary} />
      </TouchableOpacity>

      {/* Action menu */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
        <View style={[styles.menuSheet, { backgroundColor: colors.surface }]}>
          <Text style={[styles.menuTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {property.title}
          </Text>
          {!property.isSold && (
            <TouchableOpacity
              style={[styles.menuItem, { borderTopColor: colors.borderLight }]}
              onPress={() => { setMenuOpen(false); onMarkSold(); }}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.statusPending} />
              <Text style={[styles.menuItemText, { color: colors.statusPending }]}>Mark as Sold</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.menuItem, { borderTopColor: colors.borderLight }]}
            onPress={() => { setMenuOpen(false); onDelete(); }}
          >
            <Ionicons name="trash-outline" size={20} color={colors.statusSold} />
            <Text style={[styles.menuItemText, { color: colors.statusSold }]}>Delete Property</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuItem, { borderTopColor: colors.borderLight }]}
            onPress={() => setMenuOpen(false)}
          >
            <Ionicons name="close-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.menuItemText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function AdminScreen() {
  type AdminUser = { _id: string; name: string; email: string; role: UserRole; phone?: string };
  const { user } = useAuth();
  const { colors } = useTheme();
  const nav = useNavigation<any>();

  const [loggedIn, setLoggedIn] = useState(false);
  const [logging, setLogging] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([]);
  const [usersSearch, setUsersSearch] = useState('');
  const [usersFilter, setUsersFilter] = useState<'All' | 'User' | 'Broker' | 'Builder'>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'properties' | 'analytics' | 'users'>('properties');
  const [analytics, setAnalytics] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const TYPE_FILTERS = ['all', 'buy', 'rent', 'commercial', 'plot', 'pg'];
  const USER_FILTERS: Array<'All' | UserRole> = ['All', 'User', 'Broker', 'Builder', 'Owner'];

  // Auto-login on mount if cookie already set
  useEffect(() => {
    if (getAdminCookie()) setLoggedIn(true);
  }, []);

  const login = async () => {
    setLogging(true);
    const ok = await adminLogin();
    setLogging(false);
    if (ok) { setLoggedIn(true); loadData(); }
    else Alert.alert('Login Failed', 'Could not connect to server.');
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    const [props, stats, userList] = await Promise.all([
      adminGetAllProperties(), getAnalytics(), adminGetUsers(),
    ]);
    setProperties(props);
    setFiltered(props);
    setAnalytics(stats);
    setUsers(userList);
    setFilteredUsers(userList);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let list = [...users];
    if (usersFilter !== 'All') list = list.filter(u => u.role === usersFilter);
    if (usersSearch.trim()) {
      const q = usersSearch.toLowerCase();
      list = list.filter(u =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    setFilteredUsers(list);
  }, [users, usersFilter, usersSearch]);

  useEffect(() => { if (loggedIn) loadData(); }, [loggedIn]);

  useEffect(() => {
    let list = [...properties];
    if (typeFilter !== 'all') list = list.filter(p => p.propertyType === typeFilter);
    if (search.trim()) {
      list = list.filter(p =>
        p.title?.toLowerCase().includes(search.toLowerCase()) ||
        p.area?.toLowerCase().includes(search.toLowerCase())
      );
    }
    setFiltered(list);
  }, [search, typeFilter, properties]);

  const handleRoleChange = async (id: string, newRole: UserRole) => {
    const target = users.find(u => u._id === id);
    if (!target || target.role === newRole) return;
    const res = await adminUpdateUserRole(id, newRole);
    if (res.success && res.data) {
      const updated = res.data;
      setUsers(prev => prev.map(u => u._id === id ? updated : u));
      setFilteredUsers(prev => prev.map(u => u._id === id ? updated : u));
      Alert.alert('Role updated', `${updated.name} is now ${updated.role}`);
    } else {
      Alert.alert('Update failed', res.error ?? 'Could not update user role');
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete Property', `Delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          const res = await adminDeleteProperty(id);
          if (res?.success) setProperties(prev => prev.filter(p => p._id !== id));
          else Alert.alert('Error', res?.error ?? 'Failed to delete');
        },
      },
    ]);
  };

  const handleMarkSold = (id: string, title: string) => {
    Alert.alert('Mark as Sold', `Mark "${title}" as sold?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Sold', onPress: async () => {
          const res = await adminMarkSold(id, user?.id, user?.role);
          if (res?.success) setProperties(prev => prev.map(p => p._id === id ? { ...p, isSold: true } : p));
          else Alert.alert('Error', res?.error ?? 'Failed to mark sold');
        },
      },
    ]);
  };

  // ── DERIVED VALUES ──────────────────────────────────────────────────────────
  const total = properties.length;
  const active = properties.filter(p => !p.isSold).length;
  const sold = properties.filter(p => p.isSold).length;
  const byType = TYPE_FILTERS.slice(1).reduce((acc, t) => {
    acc[t] = properties.filter(p => p.propertyType === t).length;
    return acc;
  }, {} as Record<string, number>);

  // ── LOGIN SCREEN ────────────────────────────────────────────────────────────
  if (!loggedIn) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomWidth: 0 }]}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 8 }}>
            <Ionicons name="close-outline" size={28} color={colors.headerIcon} />
          </TouchableOpacity>
        </View>
        <View style={styles.loginWrap}>
          <View style={[styles.loginIcon, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="shield-checkmark" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.loginTitle, { color: colors.textPrimary }]}>Admin Panel</Text>
          <Text style={[styles.loginSub, { color: colors.textTertiary }]}>Ivanta Property</Text>
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }]}
            onPress={login}
            disabled={logging}
          >
            {logging ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.loginBtnText}>Login as Admin</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={[styles.loginNote, { color: colors.textTertiary }]}>Admin access only</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── DASHBOARD ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TouchableOpacity onPress={() => nav.goBack()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={24} color={colors.headerIcon} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: colors.headerText }]}>Admin Panel</Text>
            <Text style={[styles.headerSub, { color: colors.textTertiary }]}>Ivanta Property</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => setLoggedIn(false)} style={{ padding: 4 }}>
          <Ionicons name="log-out-outline" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {(['properties', 'users', 'analytics'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? colors.primary : colors.textTertiary, fontWeight: tab === t ? '700' : '500' }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textTertiary }]}>Loading...</Text>
        </View>
      ) : tab === 'analytics' ? (

        // ── ANALYTICS TAB ──────────────────────────────────────────────────────
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadData(); }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          contentContainerStyle={{ padding: 16, gap: 12 }}
        >
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard icon="home"            label="Total"  value={total}                        color={colors.primary}        colors={colors} />
            <StatCard icon="checkmark-circle" label="Active" value={active}                       color={colors.statusApproved} colors={colors} />
            <StatCard icon="pricetag"         label="Sold"   value={sold}                          color={colors.statusPending}  colors={colors} />
            <StatCard icon="eye"              label="Views"  value={analytics?.totalViews ?? '—'}  color={colors.roleBuilder}    colors={colors} />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 8 }]}>By Property Type</Text>
          {TYPE_FILTERS.slice(1).map(t => (
            <View key={t} style={styles.typeRow}>
              <Text style={[styles.typeLabel, { color: colors.textTertiary }]}>{t.toUpperCase()}</Text>
              <View style={[styles.typeBar, { backgroundColor: colors.surfaceSunken }]}>
                <View style={[styles.typeBarFill, {
                  backgroundColor: colors.primary,
                  width: `${total > 0 ? (byType[t] / total) * 100 : 0}%`,
                }]} />
              </View>
              <Text style={[styles.typeCount, { color: colors.textPrimary }]}>{byType[t]}</Text>
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 8 }]}>By Category</Text>
          {['Featured Property', 'Luxury Property', 'Popular Property', 'Upcoming Projects', 'None'].map(cat => {
            const count = properties.filter(p => (p as any).category === cat).length;
            return (
              <View key={cat} style={styles.typeRow}>
                <Text style={[styles.typeLabel, { flex: 2, color: colors.textTertiary }]} numberOfLines={1}>{cat}</Text>
                <View style={[styles.typeBar, { backgroundColor: colors.surfaceSunken }]}>
                  <View style={[styles.typeBarFill, {
                    backgroundColor: colors.roleBuilder,
                    width: `${total > 0 ? (count / total) * 100 : 0}%`,
                  }]} />
                </View>
                <Text style={[styles.typeCount, { color: colors.textPrimary }]}>{count}</Text>
              </View>
            );
          })}
        </ScrollView>

      ) : (

        // ── PROPERTIES / USERS TAB ─────────────────────────────────────────────
        <View style={{ flex: 1 }}>
          {/* Search */}
          <View style={[styles.searchWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder={tab === 'users' ? 'Search users by name or email...' : 'Search by title or area...'}
              placeholderTextColor={colors.textTertiary}
              value={tab === 'users' ? usersSearch : search}
              onChangeText={tab === 'users' ? setUsersSearch : setSearch}
            />
            {(tab === 'users' ? usersSearch.length : search.length) > 0 && (
              <TouchableOpacity onPress={() => tab === 'users' ? setUsersSearch('') : setSearch('')}>
                <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.chipRow, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 12 }}
          >
            {(tab === 'users' ? USER_FILTERS : TYPE_FILTERS).map(f => {
              const isActive = tab === 'users' ? usersFilter === f : typeFilter === f;
              const onPress = () => tab === 'users'
                ? setUsersFilter(f as any)
                : setTypeFilter(f);
              const label = tab === 'users'
                ? String(f)
                : f === 'all' ? `All (${total})` : `${String(f).toUpperCase()} (${byType[f] ?? 0})`;
              return (
                <TouchableOpacity
                  key={String(f)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? colors.primary : colors.surfaceSunken,
                      borderColor: isActive ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={onPress}
                >
                  <Text style={[styles.chipText, { color: isActive ? '#fff' : colors.textSecondary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={[styles.resultCount, { color: colors.textTertiary }]}>
              {tab === 'users' ? `${filteredUsers.length} users` : `${filtered.length} properties`}
            </Text>
            {tab === 'properties' && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                onPress={() => nav.navigate('PostTab' as any)}
              >
                <Ionicons name="add" size={16} color="#fff" />
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>Add Property</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => { setRefreshing(true); loadData(); }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
          >
            {tab === 'users' ? (
              filteredUsers.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No users found</Text>
                </View>
              ) : (
                filteredUsers.map(u => (
                  <View key={u._id} style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.userDetails}>
                      <Text style={[styles.userName, { color: colors.textPrimary }]}>{u.name}</Text>
                      <Text style={[styles.userEmail, { color: colors.textTertiary }]}>{u.email}</Text>
                      <Text style={[styles.userRoleLabel, { color: colors.textTertiary }]}>
                        Current role: {u.role}
                      </Text>
                    </View>
                    <View style={styles.userActions}>
                      {(['User', 'Broker', 'Builder', 'Owner'] as UserRole[]).map(r => (
                        <TouchableOpacity
                          key={r}
                          style={[
                            styles.roleButton,
                            {
                              backgroundColor: u.role === r ? colors.primary : colors.surfaceSunken,
                              borderColor: u.role === r ? colors.primary : colors.border,
                            },
                          ]}
                          onPress={() => handleRoleChange(u._id, r)}
                        >
                          <Text style={[
                            styles.roleButtonText,
                            { color: u.role === r ? '#fff' : colors.textSecondary },
                          ]}>
                            {r}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )
            ) : filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="home-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>No properties found</Text>
              </View>
            ) : (
              filtered.map(p => (
                <PropertyRow
                  key={p._id}
                  property={p}
                  colors={colors}
                  onDelete={() => handleDelete(p._id, p.title)}
                  onMarkSold={() => handleMarkSold(p._id, p.title)}
                />
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
// All colors are applied inline via the colors prop — StyleSheet only handles
// layout and sizing so nothing breaks when theme changes.

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Login
  loginWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loginIcon: { width: 80, height: 80, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginTitle: { fontSize: 24, fontWeight: '800' },
  loginSub: { fontSize: 14, marginBottom: 32 },
  loginBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  loginNote: { marginTop: 24, fontSize: 11, textAlign: 'center', lineHeight: 18 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 18, fontWeight: '800' },
  headerSub: { fontSize: 11 },
  logoutBtn: { padding: 8 },

  // Tabs
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14 },

  // Loading
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: {
    width: '47%', borderRadius: 12, padding: 14, borderLeftWidth: 3,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statVal: { fontSize: 24, fontWeight: '800', marginTop: 6 },
  statLabel: { fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },

  // Type bar chart
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  typeLabel: { fontSize: 11, fontWeight: '700', width: 80 },
  typeBar: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  typeBarFill: { height: '100%', borderRadius: 4 },
  typeCount: { fontSize: 12, fontWeight: '700', width: 24, textAlign: 'right' },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 12, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Chips
  chipRow: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: '600' },
  resultCount: { fontSize: 11, paddingHorizontal: 14, paddingVertical: 6 },

  // Property row
  propRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 12, marginBottom: 8,
    borderRadius: 12, padding: 10,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  propThumb: { width: 56, height: 56, borderRadius: 8, marginRight: 10 },
  propInfo: { flex: 1 },
  propTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  propMeta: { fontSize: 11, marginBottom: 4 },
  propBadgeRow: { flexDirection: 'row', gap: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 9, fontWeight: '700' },
  catBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  catBadgeText: { fontSize: 9, fontWeight: '600' },
  menuBtn: { padding: 6 },

  // Action menu modal
  menuBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  menuSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  menuTitle: { fontSize: 14, fontWeight: '700', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth },
  menuItemText: { fontSize: 15, fontWeight: '600' },

  // User role manager
  userCard: { marginHorizontal: 12, marginBottom: 10, borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  userDetails: { marginBottom: 12 },
  userName: { fontSize: 14, fontWeight: '700' },
  userEmail: { fontSize: 12, marginTop: 2 },
  userRoleLabel: { fontSize: 11, marginTop: 6 },
  userActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  roleButtonText: { fontSize: 11, fontWeight: '700' },

  // Empty
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, marginTop: 10 },
});
