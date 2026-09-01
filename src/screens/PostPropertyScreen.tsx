import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as Location from 'expo-location';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../auth/context';
import { API_BASE } from '../services/api';
import { useTheme } from '../theme/ThemeContext';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';

const PROPERTY_TYPES = ['buy', 'rent', 'commercial', 'plot']; // 'pg' hidden for now
const CATEGORIES = ['None', 'Featured Property', 'Luxury Property', 'Popular Property', 'Upcoming Projects'];
const FACING_OPTIONS = ['North', 'South', 'East', 'West', 'North-East', 'North-West', 'South-East', 'South-West'];
const BEDS_OPTIONS = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5+ BHK', 'Studio'];

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}{required && <Text style={{ color: colors.statusSold }}> *</Text>}</Text>
      {children}
    </View>
  );
}

function Input({ colors, ...props }: React.ComponentProps<typeof TextInput> & { colors: import('../theme/colors').ThemeColors }) {
  return (
    <TextInput
      style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
      placeholderTextColor={colors.textTertiary}
      {...props}
    />
  );
}

function ChipRow({ options, value, onChange, multi, colors }: { options: string[]; value: any; onChange: (v: any) => void; multi?: boolean; colors: import('../theme/colors').ThemeColors }) {
  const toggle = (opt: string) => {
    if (multi) {
      const current = Array.isArray(value) ? value : [];
      onChange(current.includes(opt) ? current.filter((x: string) => x !== opt) : [...current, opt]);
    } else {
      onChange(opt);
    }
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
      {options.map(opt => {
        const active = multi ? value?.includes(opt) : value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[
              styles.chip,
              { backgroundColor: colors.surfaceSunken, borderColor: colors.border },
              active && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => toggle(opt)}
          >
            <Text style={[styles.chipText, { color: colors.textSecondary }, active && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function PostPropertyScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [propertyType, setPropertyType] = useState('buy');
  const [subType, setSubType] = useState('');
  const [category, setCategory] = useState('None');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Rajkot');
  const [state, setState] = useState('Gujarat');
  const [sqft, setSqft] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [facing, setFacing] = useState('');
  const [beds, setBeds] = useState<string[]>([]);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.guestWrap}>
          <Ionicons name="lock-closed-outline" size={48} color={colors.primary} />
          <Text style={[styles.guestTitle, { color: colors.textPrimary }]}>Sign In Required</Text>
          <Text style={[styles.guestSub, { color: colors.textSecondary }]}>You need to be signed in to post a property.</Text>
          <PremiumGradientButton
            title="Sign In"
            onPress={() => nav.navigate('Login')}
            style={{ paddingHorizontal: 32, marginTop: 8 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  const fetchLocation = async () => {
    setLocLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to fetch coordinates.');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLat(String(loc.coords.latitude));
      setLng(String(loc.coords.longitude));
    } catch {
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setLocLoading(false);
    }
  };

  const canSubmit = title.trim() && price.trim() && area.trim() && city.trim();

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      // Logic: Properties posted by non-admins or even admins should probably go through an "approval" state.
      // Based on website reference: status: 'pending' (if backend supports it)
      const payload = {
        title: title.trim(),
        price: price.trim(),
        propertyType,
        subType: subType.trim() || propertyType,
        category: category === 'None' ? undefined : category,
        area: area.trim(),
        city: city.trim(),
        state: state.trim(),
        sqft: sqft.trim(),
        description: description.trim(),
        contactPhone: contactPhone.trim(),
        facing,
        beds,
        latitude: lat,
        longitude: lng,
        isVerified,
        status: 'pending', // Key for admin approval
        amenities: [],
        images: [],
        createdAt: new Date().toISOString(),
        slug: title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      };

      const res = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': user.id },
        body: JSON.stringify(payload),
      }).then(r => r.json()).catch(() => null);

      if (res?.success) {
        Alert.alert('Success!', 'Your property has been submitted for review. It will be visible after admin approval.', [
          { text: 'OK', onPress: () => nav.goBack() },
        ]);
      } else {
        Alert.alert('Error', res?.error || 'Failed to post property. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 150 }]} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoCard, { backgroundColor: colors.accent + '14', borderColor: colors.accent + '40' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
            <Text style={[styles.infoText, { color: colors.accent }]}>
              Property will be live after Admin review. Please provide accurate details.
            </Text>
          </View>

        <Field label="Property Title" required>
          <Input colors={colors} value={title} onChangeText={setTitle} placeholder="e.g. 3 BHK Apartment in Mavdi" />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Property Type" required>
              <ChipRow options={PROPERTY_TYPES} value={propertyType} onChange={setPropertyType} colors={colors} />
            </Field>
          </View>
        </View>

        {(propertyType === 'buy' || propertyType === 'rent') && (
          <Field label="Bedrooms">
            <ChipRow options={BEDS_OPTIONS} value={beds} onChange={setBeds} multi colors={colors} />
          </Field>
        )}

        <Field label="Category">
          <ChipRow options={CATEGORIES} value={category} onChange={setCategory} colors={colors} />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Price" required>
              <Input colors={colors} value={price} onChangeText={setPrice} placeholder="e.g. ₹45 Lakh" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Area (sq.ft)">
              <Input colors={colors} value={sqft} onChangeText={setSqft} placeholder="e.g. 1200" keyboardType="numeric" />
            </Field>
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Locality / Area" required>
              <Input colors={colors} value={area} onChangeText={setArea} placeholder="e.g. Mavdi" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="City" required>
              <Input colors={colors} value={city} onChangeText={setCity} placeholder="Rajkot" />
            </Field>
          </View>
        </View>

        <Field label="Facing Direction">
          <ChipRow options={FACING_OPTIONS} value={facing} onChange={setFacing} colors={colors} />
        </Field>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Latitude">
              <Input colors={colors} value={lat} onChangeText={setLat} placeholder="0.0000" keyboardType="numeric" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Longitude">
              <Input colors={colors} value={lng} onChangeText={setLng} placeholder="0.0000" keyboardType="numeric" />
            </Field>
          </View>
          <TouchableOpacity style={[styles.locBtn, { backgroundColor: colors.primaryBg, borderColor: colors.primaryBorder }]} onPress={fetchLocation} disabled={locLoading}>
            {locLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="location" size={20} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <Field label="Description">
          <TextInput
            style={[styles.input, styles.textarea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the property, amenities, nearby places..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </Field>

        <Field label="Contact Phone">
          <Input colors={colors} value={contactPhone} onChangeText={setContactPhone} placeholder="+91 XXXXX XXXXX" keyboardType="phone-pad" />
        </Field>

        <View style={[styles.switchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchLabel, { color: colors.textPrimary }]}>Mark as Verified</Text>
            <Text style={[styles.switchSub, { color: colors.textTertiary }]}>Admin will check documents</Text>
          </View>
          <Switch value={isVerified} onValueChange={setIsVerified} trackColor={{ true: colors.primary }} />
        </View>

        <PremiumGradientButton
            title={loading ? "Submitting..." : "Submit Property"}
            icon={loading ? undefined : "cloud-upload-outline"}
            onPress={submit}
            disabled={!canSubmit || loading}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  body: { padding: 14, gap: 4, paddingBottom: 32 },
  guestWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  guestTitle: { fontSize: 20, fontWeight: '800' },
  guestSub: { fontSize: 13, textAlign: 'center' },
  signInBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  signInBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  infoCard: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    borderRadius: 12, padding: 12,
    borderWidth: 1, marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },
  field: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 13,
  },
  textarea: { minHeight: 90, paddingTop: 10 },
  row: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  chipRow: { gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 12, borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  locBtn: { width: 44, height: 44, borderWidth: 1, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  switchRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  switchLabel: { fontSize: 13, fontWeight: '700' },
  switchSub: { fontSize: 11, marginTop: 2 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: 12, paddingVertical: 15, marginTop: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
