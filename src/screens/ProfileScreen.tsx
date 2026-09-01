import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/context';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AnimatedPressable from '../components/AnimatedPressable';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeMode } from '../theme/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';
import { RADIUS, SPACE, BOTTOM_NAV_HEIGHT } from '../theme/layout';

// ─── MenuItem ─────────────────────────────────────────────────────────────────

const MenuItem = ({
  icon, title, subtitle, onPress,
  iconColor, iconBg, colors,
}: {
  icon: string; title: string; subtitle?: string;
  onPress: () => void; iconColor?: string; iconBg?: string;
  colors: ThemeColors;
}) => (
  <AnimatedPressable onPress={onPress}>
    <View style={[mi.row, { borderBottomColor: colors.borderLight }]}>
      <View style={[mi.iconWrap, { backgroundColor: iconBg ?? colors.primaryBg }]}>
        <Ionicons name={icon as any} size={19} color={iconColor ?? colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[mi.title, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[mi.sub, { color: colors.textTertiary }]}>{subtitle}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </View>
  </AnimatedPressable>
);

const mi = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
    minHeight: 64,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 14, fontWeight: '600' },
  sub:   { fontSize: 12, marginTop: 2 },
});

// ─── Theme toggle ─────────────────────────────────────────────────────────────

const THEME_OPTIONS: { value: ThemeMode; icon: string; label: string }[] = [
  { value: 'light',  icon: 'sunny-outline',          label: 'Light'  },
  { value: 'dark',   icon: 'moon-outline',            label: 'Dark'   },
  { value: 'system', icon: 'phone-portrait-outline',  label: 'System' },
];

function ThemeToggle({ colors, mode, setMode }: { colors: ThemeColors; mode: ThemeMode; setMode: (m: ThemeMode) => void }) {
  return (
    <View style={[tt.wrap, { borderBottomColor: colors.borderLight }]}>
      <View style={tt.left}>
        <View style={[tt.iconWrap, { backgroundColor: colors.surfaceSunken }]}>
          <Ionicons name="contrast-outline" size={19} color={colors.primary} />
        </View>
        <View>
          <Text style={[tt.title, { color: colors.textPrimary }]}>Appearance</Text>
          <Text style={[tt.sub, { color: colors.textTertiary }]}>Choose app theme</Text>
        </View>
      </View>
      <View style={[tt.segWrap, { backgroundColor: colors.surfaceSunken }]}>
        {THEME_OPTIONS.map(opt => {
          const active = mode === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setMode(opt.value)}
              style={[tt.seg, active && { backgroundColor: colors.surface }]}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Ionicons name={opt.icon as any} size={14} color={active ? colors.primary : colors.textTertiary} />
              <Text style={[tt.segLabel, { color: active ? colors.primary : colors.textTertiary, fontWeight: active ? '700' : '500' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const tt = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, gap: 12,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 1 },
  segWrap: { flexDirection: 'row', borderRadius: 12, padding: 3, gap: 2 },
  seg: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 5, borderRadius: 8 },
  segLabel: { fontSize: 11 },
});

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, setUser } = useAuth();
  const nav = useNavigation<any>();
  const { colors, mode, setMode } = useTheme();

  const Group = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={[s.group, { backgroundColor: colors.surface }]}>
      <Text style={[s.groupTitle, { color: colors.textTertiary, backgroundColor: colors.surfaceSunken }]}>
        {title}
      </Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: BOTTOM_NAV_HEIGHT + 40 }}>

        {/* ── Profile card ──────────────────────────────────────────────── */}
        <View style={[s.profileCard, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={[s.avatar, { backgroundColor: colors.primaryBg }]}>
            <Ionicons name="person-outline" size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, { color: colors.textPrimary }]}>
              {user ? user.name : 'Guest User'}
            </Text>
            <Text style={[s.email, { color: colors.textTertiary }]}>
              {user ? user.email : 'Sign in to access more features'}
            </Text>
          </View>
        </View>

        {/* ── Sign In / Logout ──────────────────────────────────────────── */}
        {user ? (
          <AnimatedPressable onPress={() => setUser(null)}>
            <View style={[s.logoutBtn, { borderColor: colors.primaryBorder, backgroundColor: colors.primaryBg }]}>
              <Ionicons name="log-out-outline" size={16} color={colors.primary} />
              <Text style={[s.logoutBtnText, { color: colors.primary }]}>Logout</Text>
            </View>
          </AnimatedPressable>
        ) : (
          <PremiumGradientButton
            title="Sign In / Register"
            onPress={() => nav.navigate('Login')}
            style={{ marginHorizontal: 16, marginVertical: 12 }}
          />
        )}

        {/* ── MY ACCOUNT ────────────────────────────────────────────────── */}
        <Group title="My Account">
          <MenuItem
            icon="heart-outline"
            title="Saved Properties"
            subtitle="Properties you've saved"
            onPress={() => nav.navigate('FavoritesTab')}
            colors={colors}
          />
          <MenuItem
            icon="notifications-outline"
            title="Notifications"
            onPress={() => nav.navigate('Notifications')}
            colors={colors}
          />
        </Group>

        {/* ── SERVICES ──────────────────────────────────────────────────── */}
        <Group title="Services">
          <MenuItem
            icon="cash-outline"
            title="Loan Solutions"
            subtitle="EMI calculator & loan products"
            iconColor={colors.accent}
            iconBg={colors.accent + '14'}
            onPress={() => nav.navigate('Loans')}
            colors={colors}
          />
          <MenuItem
            icon="construct-outline"
            title="New Projects"
            subtitle="Explore builder projects"
            iconColor={colors.roleBuilder}
            iconBg={colors.roleBuilder + '14'}
            onPress={() => nav.navigate('Builders')}
            colors={colors}
          />
        </Group>

        {/* ── CONTACT ───────────────────────────────────────────────────── */}
        <Group title="Contact Ivanta">
          <MenuItem icon="call-outline"  title="Call Us"       subtitle="+91 84605 67890"          onPress={() => Linking.openURL('tel:+918460567890')}                                        colors={colors} />
          <MenuItem icon="logo-whatsapp" title="WhatsApp"      subtitle="+91 84605 67890"          iconColor="#25d366" iconBg="rgba(37,211,102,0.14)" onPress={() => Linking.openURL('https://wa.me/918460567890')} colors={colors} />
          <MenuItem icon="mail-outline"  title="Email Us"      subtitle="ivantaproperty@gmail.com" onPress={() => Linking.openURL('mailto:ivantaproperty@gmail.com')}                          colors={colors} />
          <MenuItem icon="globe-outline" title="Visit Website" subtitle="ivantaproperty.com"       onPress={() => Linking.openURL('https://ivantaproperty.com')}                               colors={colors} />
        </Group>

        {/* ── SOCIAL ────────────────────────────────────────────────────── */}
        <Group title="Social">
          <MenuItem icon="logo-instagram" title="Instagram" subtitle="@ivantaproperty" iconColor="#e1306c" iconBg="rgba(225,48,108,0.14)" onPress={() => Linking.openURL('https://www.instagram.com/ivantaproperty/')}           colors={colors} />
          <MenuItem icon="logo-facebook"  title="Facebook"  subtitle="ivantaproperty"  iconColor="#1877f2" iconBg="rgba(24,119,242,0.14)"  onPress={() => Linking.openURL('https://www.facebook.com/ivantaproperty')}            colors={colors} />
          <MenuItem icon="logo-linkedin"  title="LinkedIn"  subtitle="Ivanta Property" iconColor="#0a66c2" iconBg="rgba(10,102,194,0.14)"  onPress={() => Linking.openURL('https://www.linkedin.com/company/ivanta-property/')} colors={colors} />
        </Group>

        {/* ── APP ───────────────────────────────────────────────────────── */}
        <Group title="App">
          <ThemeToggle colors={colors} mode={mode} setMode={setMode} />
          <MenuItem icon="star-outline"          title="Rate App"       onPress={() => {}}                                                    colors={colors} />
          <MenuItem icon="document-text-outline" title="Privacy Policy" onPress={() => Linking.openURL('https://ivantaproperty.com')}         colors={colors} />
        </Group>

        {/* ── Address ───────────────────────────────────────────────────── */}
        <View style={[s.addressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="location-outline" size={16} color={colors.primary} />
          <Text style={[s.addressText, { color: colors.textSecondary }]}>
            903, Sanskar Heights, Umiya Circle, 150 Ft Ring Road, Mavdi, Rajkot - 360004
          </Text>
        </View>

        <Text style={[s.version, { color: colors.textTertiary }]}>
          Ivanta Property v1.0.0{'\n'}© {new Date().getFullYear()} Ivanta Ventures LLP
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  name:  { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  email: { fontSize: 12, marginTop: 3 },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  logoutBtnText: { fontSize: 14, fontWeight: '700' },

  group: { marginTop: 10 },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  addressCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    margin: 16,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  addressText: { flex: 1, fontSize: 12, lineHeight: 18 },
  version: { textAlign: 'center', fontSize: 11, padding: 20, lineHeight: 18 },
});
