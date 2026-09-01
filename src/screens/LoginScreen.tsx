import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../auth/context';
import type { UserRole } from '../auth/types';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';
import { API_BASE, appEmailLogin } from '../services/api';
import { useTheme } from '../theme/ThemeContext';

const DEFAULT_ROLE: UserRole = 'User';

export default function LoginScreen() {
  const nav = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'Login'>>();
  const { setUser } = useAuth();
  const { colors } = useTheme();

  const role: UserRole = DEFAULT_ROLE;
  const [isSignUp, setIsSignUp] = useState(true);

  // Sign Up state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  const [error, setError] = useState('');

  // ── Google OAuth ─────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    try {
      const base = API_BASE.replace('/api', '');
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'ivanta-property',
        path: 'callback',
      });

      const result = await WebBrowser.openAuthSessionAsync(
        `${base}/api/auth/google?role=${DEFAULT_ROLE}&source=app&returnTo=${encodeURIComponent(redirectUri)}`,
        redirectUri
      );

      if (result.type === 'success') {
        const url = new URL(result.url);
        const token = url.searchParams.get('token');
        if (token) {
          try {
            const res = await fetch(`${API_BASE}/auth/token-exchange?token=${encodeURIComponent(token)}`);
            const data = await res.json();
            if (data?.success && data?.userData) {
              const u = data.userData;
              setUser({ id: String(u.id ?? u._id ?? ''), email: String(u.email ?? ''), name: String(u.name ?? ''), role: u.role ?? 'User' });
              nav.goBack();
            } else {
              setError(data?.error || 'Authentication failed');
            }
          } catch {
            setError('Failed to verify token');
          }
        }
      } else if (result.type === 'dismiss') {
        setError('Login cancelled');
      }
    } catch (e: any) {
      setError(e?.message || 'Google login failed');
    }
  };

  // ── OTP Send ─────────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (mobile.length !== 10 || !name.trim()) return;
    setError('');
    setSendingOtp(true);
    try {
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, name, email, role: DEFAULT_ROLE }),
      });
      const data = await res.json();
      if (data?.success) {
        setOtpSent(true);
      } else {
        setError(data?.error || 'Failed to send OTP');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  // ── OTP Verify ───────────────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setError('');
    setVerifying(true);
    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, name, email, role: DEFAULT_ROLE, isApp: true }),
      });
      const data = await res.json();
      if (data?.success && data?.token) {
        const ex = await fetch(`${API_BASE}/auth/token-exchange?token=${encodeURIComponent(data.token)}`);
        const exData = await ex.json();
        if (exData?.success && exData?.userData) {
          const u = exData.userData;
          setUser({ id: String(u.id ?? u._id ?? ''), email: String(u.email ?? ''), name: String(u.name ?? ''), role: u.role ?? 'User' });
          nav.goBack();
        } else setError('Verification failed. Try again.');
      } else {
        setError(data?.error || 'Invalid OTP');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setVerifying(false); }
  };

  // ── Email Sign In ─────────────────────────────────────────────────────────────
  const handleSignIn = async () => {
    if (!signInEmail.trim() || !signInPassword) return;
    setError('');
    setSigningIn(true);
    try {
      const user = await appEmailLogin(signInEmail.trim(), signInPassword);
      if (!user) throw new Error('Invalid credentials or server error.');
      setUser(user);
      nav.goBack();
    } catch (e: any) {
      setError(e?.message || 'Sign in failed');
    } finally { setSigningIn(false); }
  };

  const resetForm = () => {
    setName(''); setEmail(''); setMobile(''); setOtp(''); setOtpSent(false);
    setSignInEmail(''); setSignInPassword(''); setError('');
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.surface }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
        
        <View style={s.pageHeader}>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>
          <Text style={[s.pageSubtitle, { color: colors.textSecondary }]}>
            {isSignUp ? 'Join us to find your dream property' : 'Sign in to continue to your account'}
          </Text>
        </View>

        {/* Google Button */}
        <TouchableOpacity style={[s.googleBtn, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={handleGoogle} activeOpacity={0.85}>
          <View style={s.googleIcon}>
            <Text style={s.googleG}>G</Text>
          </View>
          <Text style={[s.googleBtnText, { color: colors.textPrimary }]}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.divRow}>
          <View style={[s.divLine, { backgroundColor: colors.border }]} />
          <Text style={[s.divText, { color: colors.textTertiary }]}>OR</Text>
          <View style={[s.divLine, { backgroundColor: colors.border }]} />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        {isSignUp ? (
          !otpSent ? (
            <>
              <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Full Name</Text>
              <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput style={[s.input, { color: colors.textPrimary }]} value={name} onChangeText={setName} placeholder="Enter your full name" placeholderTextColor={colors.textTertiary} />
              </View>

              <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Email (Optional)</Text>
              <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="mail-outline" size={16} color={colors.textTertiary} style={s.inputIcon} />
                <TextInput style={[s.input, { color: colors.textPrimary }]} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.textTertiary} autoCapitalize="none" keyboardType="email-address" />
              </View>

              <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Mobile Number</Text>
              <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Ionicons name="call-outline" size={16} color={colors.textTertiary} style={s.inputIcon} />
                <TextInput
                  style={[s.input, { color: colors.textPrimary }]} value={mobile}
                  onChangeText={v => { const d = v.replace(/\D/g, ''); if (d.length <= 10) setMobile(d); }}
                  placeholder="Enter 10-digit mobile number" placeholderTextColor={colors.textTertiary}
                  keyboardType="phone-pad" maxLength={10}
                />
              </View>
              {mobile.length > 0 && mobile.length < 10 && (
                <Text style={s.hint}>Please enter a valid 10-digit mobile number</Text>
              )}

              <PremiumGradientButton
                title={sendingOtp ? "Sending..." : "Send OTP"}
                onPress={handleSendOtp}
                disabled={!name.trim() || mobile.length !== 10 || sendingOtp}
                style={{ marginTop: 8, marginBottom: 4 }}
              />
            </>
          ) : (
            <>
              <View style={s.otpInfo}>
                <Text style={[s.otpInfoText, { color: colors.textSecondary }]}>Enter the OTP sent to</Text>
                <Text style={[s.otpInfoNum, { color: colors.textPrimary }]}>+91 {mobile}</Text>
                <TouchableOpacity onPress={() => { setOtpSent(false); setOtp(''); }}>
                  <Text style={[s.changeNum, { color: colors.primary }]}>Change Number</Text>
                </TouchableOpacity>
              </View>

              <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Enter OTP</Text>
              <View style={s.otpRow}>
                {[0,1,2,3,4,5].map(i => (
                  <TextInput
                    key={i}
                    style={[
                      s.otpBox,
                      { borderColor: colors.border, backgroundColor: colors.surfaceSunken, color: colors.textPrimary },
                      otp.length > i && { borderColor: colors.primary, backgroundColor: colors.surface },
                    ]}
                    value={otp[i] || ''}
                    maxLength={1}
                    keyboardType="numeric"
                    onChangeText={v => {
                      const digits = v.replace(/\D/g, '');
                      const next = otp.split('');
                      next[i] = digits[0] || '';
                      setOtp(next.join('').slice(0, 6));
                    }}
                  />
                ))}
              </View>

              <TouchableOpacity onPress={handleSendOtp} style={s.resendBtn}>
                <Text style={[s.resendText, { color: colors.primary }]}>Resend OTP</Text>
              </TouchableOpacity>

              <PremiumGradientButton
                title={verifying ? "Verifying..." : "Verify & Sign Up"}
                onPress={handleVerifyOtp}
                disabled={otp.length !== 6 || verifying}
                style={{ marginTop: 8, marginBottom: 4 }}
              />
            </>
          )
        ) : (
          <>
            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Email</Text>
            <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput style={[s.input, { color: colors.textPrimary }]} value={signInEmail} onChangeText={setSignInEmail} placeholder="you@example.com" placeholderTextColor={colors.textTertiary} autoCapitalize="none" keyboardType="email-address" />
            </View>

            <Text style={[s.fieldLabel, { color: colors.textPrimary }]}>Password</Text>
            <View style={[s.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <TextInput style={[s.input, { color: colors.textPrimary }]} value={signInPassword} onChangeText={setSignInPassword} placeholder="••••••••" placeholderTextColor={colors.textTertiary} secureTextEntry={!showPw} />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            <PremiumGradientButton
              title={signingIn ? "Signing In..." : "Sign In"}
              onPress={handleSignIn}
              disabled={!signInEmail.trim() || !signInPassword || signingIn}
              style={{ marginTop: 8, marginBottom: 4 }}
            />
          </>
        )}

        {/* Toggle Sign Up / Sign In */}
        <View style={[s.toggleRow, { borderTopColor: colors.borderLight }]}>
          <Text style={[s.toggleText, { color: colors.textSecondary }]}>
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          </Text>
          <TouchableOpacity onPress={() => { setIsSignUp(v => !v); resetForm(); }}>
            <Text style={[s.toggleLink, { color: colors.primary }]}>{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  pageHeader: { marginBottom: 32 },
  pageTitle: { fontSize: 28, fontWeight: '800', marginBottom: 8 },
  pageSubtitle: { fontSize: 15 },
  body: { padding: 24, paddingBottom: 40 },

  // Google
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingVertical: 14, marginBottom: 20, gap: 10,
  },
  googleIcon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  googleG: { fontSize: 16, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600' },

  // Divider
  divRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  divLine: { flex: 1, height: 1 },
  divText: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },

  // Fields
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 16,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, padding: 0 },
  eyeBtn: { padding: 2 },
  hint: { fontSize: 11, color: '#ef4444', marginTop: -12, marginBottom: 12 },

  // CTA
  ctaBtn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 4 },
  ctaBtnDisabled: { opacity: 0.45 },
  ctaBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  // OTP
  otpInfo: { alignItems: 'center', marginBottom: 20 },
  otpInfoText: { fontSize: 13 },
  otpInfoNum: { fontSize: 15, fontWeight: '700', marginTop: 4 },
  changeNum: { fontSize: 12, marginTop: 6, fontWeight: '600' },
  otpRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 16 },
  otpBox: {
    width: 44, height: 52, borderRadius: 10,
    borderWidth: 1.5, textAlign: 'center', fontSize: 20, fontWeight: '700',
  },
  resendBtn: { alignItems: 'center', marginBottom: 16 },
  resendText: { fontSize: 13, fontWeight: '600' },

  // Toggle
  toggleRow: {
    flexDirection: 'row', justifyContent: 'center',
    marginTop: 20, paddingTop: 16,
    borderTopWidth: 1,
  },
  toggleText: { fontSize: 14 },
  toggleLink: { fontSize: 14, fontWeight: '700' },

  error: { color: '#b91c1c', fontSize: 12, fontWeight: '600', marginBottom: 12, textAlign: 'center' },
});
