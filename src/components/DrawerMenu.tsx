import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
  ScrollView, Dimensions, Image, Linking, Animated, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';

const W = Dimensions.get('window').width;
const DRAWER_WIDTH = W * 0.80;

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigate: (screen: string, params?: object) => void;
}

const BUY_OPTIONS = [
  { label: 'Residential',  screen: 'Properties', params: { type: 'buy' },        icon: 'home-outline' },
  { label: 'Commercial',   screen: 'Properties', params: { type: 'commercial' },  icon: 'business-outline' },
  { label: 'Plots / Lands',screen: 'Properties', params: { type: 'plot' },        icon: 'map-outline' },
];

const NAV_LINKS = [
  { label: 'Home',          screen: 'Home',        icon: 'home-outline' },
  { label: 'Notifications', screen: 'Notifications',icon: 'notifications-outline' },
  { label: 'Rentals',       screen: 'Properties',  params: { type: 'rent' }, icon: 'key-outline' },
  { label: 'New Projects',  screen: 'Builders',    icon: 'construct-outline' },
  { label: 'Loans',         screen: 'Loans',       icon: 'cash-outline' },
  { label: 'Map View',      screen: 'NearbyMap',   icon: 'map-outline' },
  { label: 'Search',        screen: 'Search',      icon: 'search-outline' },
  { label: 'Favorites',     screen: 'Favorites',   icon: 'heart-outline' },
  { label: 'Post Property', screen: 'PostProperty',icon: 'add-circle-outline' },
  { label: 'Profile',       screen: 'Profile',     icon: 'person-outline' },
];

export default function DrawerMenu({ visible, onClose, onNavigate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const animX       = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const animOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(animX,       { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(animOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animX,       { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
        Animated.timing(animOpacity, { toValue: 0,             duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(animX,       { toValue: -DRAWER_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(animOpacity, { toValue: 0,             duration: 250, useNativeDriver: true }),
    ]).start(() => onClose());
  };

  const go = (screen: string, params?: object) => onNavigate(screen, params);

  return (
    <Modal visible={visible} transparent onRequestClose={handleClose} statusBarTranslucent animationType="none">
      <View style={s.overlay}>
        {/* Backdrop */}
        <Animated.View style={[s.backdrop, { opacity: animOpacity, backgroundColor: colors.overlayBg }]}>
          <Pressable style={{ flex: 1 }} onPress={handleClose} />
        </Animated.View>

        {/* Drawer panel */}
        <Animated.View
          style={[
            s.drawer,
            {
              paddingTop: insets.top,
              backgroundColor: colors.drawerBg,
              transform: [{ translateX: animX }],
            },
          ]}
        >
          {/* ── Header: logo + close ───────────────────────────────── */}
          <View style={[s.header, { borderBottomColor: colors.border }]}>
            <Image
              source={require('../../assets/ivantalogo.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* ── Nav content ───────────────────────────────────────── */}
          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false} bounces={false}>

            {/* Home */}
            <TouchableOpacity style={s.navItem} onPress={() => go('Home')}>
              <Ionicons name="home-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.navLabel, { color: colors.navLabel }]}>Home</Text>
            </TouchableOpacity>

            {/* BUY section */}
            <View style={s.sectionHead}>
              <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>BUY</Text>
            </View>
            {BUY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[s.navItem, s.indented]}
                onPress={() => go(opt.screen, opt.params)}
              >
                <Ionicons name={opt.icon as any} size={17} color={colors.textSecondary} />
                <Text style={[s.navLabel, { color: colors.navLabel }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

            {/* Rest of nav links */}
            {NAV_LINKS.slice(1).map(link => {
              const isPost = link.screen === 'PostProperty';
              return (
                <TouchableOpacity
                  key={link.label}
                  style={[
                    s.navItem,
                    isPost && { backgroundColor: colors.navPostBg },
                  ]}
                  onPress={() => go(link.screen, (link as any).params)}
                >
                  <Ionicons
                    name={link.icon as any}
                    size={18}
                    color={isPost ? colors.navLabelPost : colors.textSecondary}
                  />
                  <Text
                    style={[
                      s.navLabel,
                      { color: isPost ? colors.navLabelPost : colors.navLabel },
                      isPost && { fontWeight: '700' },
                    ]}
                  >
                    {link.label}
                  </Text>
                </TouchableOpacity>
              );
            })}

            <View style={[s.divider, { backgroundColor: colors.borderLight }]} />

            {/* Contact */}
            <View style={s.sectionHead}>
              <Text style={[s.sectionLabel, { color: colors.textTertiary }]}>CONTACT</Text>
            </View>
            <TouchableOpacity style={s.navItem} onPress={() => Linking.openURL('tel:+918460567890')}>
              <Ionicons name="call-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.navLabel, { color: colors.navLabel }]}>+91 84605 67890</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} onPress={() => Linking.openURL('https://wa.me/918460567890')}>
              <Ionicons name="logo-whatsapp" size={18} color="#25d366" />
              <Text style={[s.navLabel, { color: colors.navLabel }]}>WhatsApp Us</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.navItem} onPress={() => Linking.openURL('https://ivantaproperty.com')}>
              <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
              <Text style={[s.navLabel, { color: colors.navLabel }]}>Visit Website</Text>
            </TouchableOpacity>

          </ScrollView>

          {/* ── Footer ────────────────────────────────────────────── */}
          <View style={[s.footer, { borderTopColor: colors.border, paddingBottom: insets.bottom + 12 }]}>
            <Text style={[s.footerText, { color: colors.textSecondary }]}>
              © {new Date().getFullYear()} Ivanta Ventures LLP
            </Text>
            <Text style={[s.footerSub, { color: colors.textTertiary }]}>
              Rajkot's Trusted Property Platform
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  drawer: {
    width: DRAWER_WIDTH,
    height: '100%',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 4, height: 0 },
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  logo: { height: 32, width: 130 },
  scroll: { flex: 1 },
  sectionHead: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 6,
    borderRadius: 8,
  },
  indented: { paddingLeft: 28 },
  navLabel: { fontSize: 14, fontWeight: '500' },
  divider: { height: 1, marginVertical: 6, marginHorizontal: 16 },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  footerText: { fontSize: 12, fontWeight: '600' },
  footerSub: { fontSize: 11, marginTop: 2 },
});
