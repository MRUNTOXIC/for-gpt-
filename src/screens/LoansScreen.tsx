import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  Animated, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AnimatedPressable from '../components/AnimatedPressable';
import { useAuth } from '../auth/context';
import { useTheme } from '../theme/ThemeContext';
import PremiumGradientButton from '../components/modern/PremiumGradientButton';

// ─── EMI CALCULATOR HOOK ──────────────────────────────────────────────────────
function useEmiCalculator() {
  const [price, setPrice] = useState('5000000');
  const [downPct, setDownPct] = useState(20);
  const [tenure, setTenure] = useState(20);
  const [rate, setRate] = useState('9.00');

  const loanAmount = Math.max(0, Number(price) * (1 - downPct / 100));
  const r = (parseFloat(rate) || 0) / 12 / 100;
  const n = tenure * 12;
  const emi =
    r > 0
      ? (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      : loanAmount / n;
  const totalAmount = emi * n;
  const totalInterest = totalAmount - loanAmount;

  return {
    price, setPrice, downPct, setDownPct,
    tenure, setTenure, rate, setRate,
    loanAmount, emi, totalAmount, totalInterest,
  };
}

function formatINR(n: number) {
  if (isNaN(n) || !isFinite(n)) return '₹0';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

// ─── EMI CALCULATOR COMPONENT ─────────────────────────────────────────────────
function EmiCalculator({ colors }: { colors: any }) {
  const {
    price, setPrice, downPct, setDownPct,
    tenure, setTenure, rate, setRate,
    loanAmount, emi, totalAmount, totalInterest,
  } = useEmiCalculator();

  const principalPct = totalAmount > 0 ? (loanAmount / totalAmount) * 100 : 0;
  const interestPct = 100 - principalPct;

  const principalAnim = useRef(new Animated.Value(0)).current;
  const interestAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(principalAnim, { toValue: principalPct, duration: 600, useNativeDriver: false }),
      Animated.timing(interestAnim, { toValue: interestPct, duration: 600, useNativeDriver: false }),
    ]).start();
  }, [principalPct, interestPct]);

  const TENURES = [5, 10, 15, 20, 25, 30];
  const DOWN_PCTS = [10, 15, 20, 25, 30, 40];

  return (
    <View style={[calcStyles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={calcStyles.header}>
        <Ionicons name="calculator-outline" size={20} color={colors.primary} />
        <Text style={[calcStyles.title, { color: colors.textPrimary }]}>EMI Calculator</Text>
      </View>

      {/* Property Price */}
      <Text style={[calcStyles.label, { color: colors.textSecondary }]}>Property Price</Text>
      <View style={[calcStyles.inputRow, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
        <Text style={[calcStyles.rupee, { color: colors.textTertiary }]}>₹</Text>
        <TextInput
          style={[calcStyles.input, { color: colors.textPrimary }]}
          keyboardType="numeric"
          value={price}
          onChangeText={v => setPrice(v.replace(/\D/g, ''))}
          placeholder="e.g. 5000000"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={[calcStyles.inputHint, { color: colors.textTertiary }]}>{formatINR(Number(price))}</Text>
      </View>

      {/* Down Payment */}
      <View style={calcStyles.sliderRow}>
        <Text style={[calcStyles.label, { color: colors.textSecondary }]}>Down Payment</Text>
        <Text style={[calcStyles.sliderVal, { color: colors.primary }]}>
          {downPct}% — {formatINR(Number(price) * downPct / 100)}
        </Text>
      </View>
      <View style={calcStyles.chipRow}>
        {DOWN_PCTS.map(p => (
          <AnimatedPressable key={p} onPress={() => setDownPct(p)}>
            <View
              style={[
                calcStyles.chip,
                {
                  backgroundColor: downPct === p ? colors.primary : colors.surfaceSunken,
                  borderColor: downPct === p ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  calcStyles.chipText,
                  { color: downPct === p ? '#fff' : colors.textSecondary },
                ]}
              >
                {p}%
              </Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {/* Loan Amount */}
      <View style={[calcStyles.loanAmtRow, { backgroundColor: colors.statusApproved + '14', borderRadius: 12 }]}>
        <Text style={[calcStyles.loanAmtLabel, { color: colors.textSecondary }]}>Loan Amount</Text>
        <Text style={[calcStyles.loanAmtVal, { color: colors.statusApproved }]}>{formatINR(loanAmount)}</Text>
      </View>

      {/* Tenure */}
      <Text style={[calcStyles.label, { color: colors.textSecondary }]}>Loan Tenure</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
        <View style={calcStyles.chipRow}>
          {TENURES.map(y => (
            <AnimatedPressable key={y} onPress={() => setTenure(y)}>
              <View
                style={[
                  calcStyles.chip,
                  {
                    backgroundColor: tenure === y ? colors.accent : colors.surfaceSunken,
                    borderColor: tenure === y ? colors.accent : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    calcStyles.chipText,
                    { color: tenure === y ? '#fff' : colors.textSecondary },
                  ]}
                >
                  {y} Yr
                </Text>
              </View>
            </AnimatedPressable>
          ))}
        </View>
      </ScrollView>

      {/* Interest Rate */}
      <Text style={[calcStyles.label, { color: colors.textSecondary }]}>Interest Rate (p.a.)</Text>
      <View style={[calcStyles.inputRow, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
        <TextInput
          style={[calcStyles.input, { flex: 1, color: colors.textPrimary }]}
          keyboardType="decimal-pad"
          value={rate}
          onChangeText={setRate}
          placeholder="9.00"
          placeholderTextColor={colors.textTertiary}
        />
        <Text style={[calcStyles.rupee, { color: colors.textTertiary }]}>%</Text>
        <Text style={[calcStyles.inputHint, { color: colors.textTertiary }]}>  RBI Repo: 6.5%</Text>
      </View>

      {/* Result */}
      <View style={calcStyles.result}>
        <View style={[calcStyles.emiMainBox, { backgroundColor: colors.primaryBg }]}>
          <Text style={[calcStyles.emiLabel, { color: colors.textTertiary }]}>Monthly EMI</Text>
          <Text style={[calcStyles.emiValue, { color: colors.primary }]}>
            {isFinite(emi) ? formatINR(emi) : '—'}
          </Text>
          <Text style={[calcStyles.emiSub, { color: colors.textTertiary }]}>for {tenure} years</Text>
        </View>

        <View style={calcStyles.breakRow}>
          <View style={[calcStyles.breakItem, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Text style={[calcStyles.breakLabel, { color: colors.textTertiary }]}>Loan Amount</Text>
            <Text style={[calcStyles.breakVal, { color: colors.accent }]}>{formatINR(loanAmount)}</Text>
          </View>
          <View style={[calcStyles.breakItem, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Text style={[calcStyles.breakLabel, { color: colors.textTertiary }]}>Total Interest</Text>
            <Text style={[calcStyles.breakVal, { color: colors.primary }]}>{formatINR(totalInterest)}</Text>
          </View>
          <View style={[calcStyles.breakItem, { backgroundColor: colors.surfaceSunken, borderColor: colors.border }]}>
            <Text style={[calcStyles.breakLabel, { color: colors.textTertiary }]}>Total Payable</Text>
            <Text style={[calcStyles.breakVal, { color: colors.statusApproved }]}>{formatINR(totalAmount)}</Text>
          </View>
        </View>

        {/* Payment breakdown bar */}
        <Text style={[calcStyles.label, { color: colors.textSecondary, marginBottom: 8 }]}>Payment Breakdown</Text>
        <View style={[calcStyles.breakBar, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              calcStyles.breakBarPrincipal,
              {
                backgroundColor: colors.accent,
                width: principalAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
          <Animated.View
            style={[
              calcStyles.breakBarInterest,
              {
                backgroundColor: colors.primary,
                width: interestAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }),
              },
            ]}
          />
        </View>
        <View style={calcStyles.legend}>
          <View style={calcStyles.legendItem}>
            <View style={[calcStyles.legendDot, { backgroundColor: colors.accent }]} />
            <Text style={[calcStyles.legendText, { color: colors.textTertiary }]}>
              Principal ({principalPct.toFixed(0)}%)
            </Text>
          </View>
          <View style={calcStyles.legendItem}>
            <View style={[calcStyles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={[calcStyles.legendText, { color: colors.textTertiary }]}>
              Interest ({interestPct.toFixed(0)}%)
            </Text>
          </View>
        </View>
        <Text style={[calcStyles.disclaimer, { color: colors.textTertiary }]}>
          Indicative calculation based on reducing balance method. Actual rates vary by lender.
        </Text>
      </View>
    </View>
  );
}

const calcStyles = StyleSheet.create({
  card: {
    borderRadius: 14, padding: 18, borderWidth: StyleSheet.hairlineWidth,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '800' },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14,
  },
  rupee: { fontSize: 15, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, fontSize: 15, fontWeight: '600', padding: 0 },
  inputHint: { fontSize: 11, marginLeft: 6 },
  sliderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sliderVal: { fontSize: 12, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  loanAmtRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, marginBottom: 14,
  },
  loanAmtLabel: { fontSize: 13, fontWeight: '600' },
  loanAmtVal: { fontSize: 16, fontWeight: '800' },
  result: { marginTop: 8 },
  emiMainBox: {
    alignItems: 'center', borderRadius: 12,
    paddingVertical: 18, marginBottom: 14,
  },
  emiLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  emiValue: { fontSize: 32, fontWeight: '900' },
  emiSub: { fontSize: 11, marginTop: 4 },
  breakRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  breakItem: {
    flex: 1, alignItems: 'center', borderRadius: 12,
    paddingVertical: 10, borderWidth: 1,
  },
  breakLabel: { fontSize: 10, marginBottom: 4 },
  breakVal: { fontSize: 13, fontWeight: '800' },
  breakBar: {
    flexDirection: 'row', height: 10, borderRadius: 5,
    overflow: 'hidden', marginBottom: 8,
  },
  breakBarPrincipal: { height: '100%' },
  breakBarInterest: { height: '100%' },
  legend: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, fontWeight: '600' },
  disclaimer: { fontSize: 10, textAlign: 'center', lineHeight: 14, marginTop: 4 },
});

// ─── LOAN PRODUCT DATA ────────────────────────────────────────────────────────
interface LoanProduct {
  icon: string;
  title: string;
  subtitle: string;
  highlight: string;
  features: string[];
  colorKey: 'accent' | 'statusApproved' | 'roleBuilder' | 'primary';
}

const LOAN_PRODUCTS: LoanProduct[] = [
  {
    icon: 'home-outline', title: 'Home Loan', colorKey: 'accent',
    subtitle: 'Make your dream home a reality',
    highlight: 'Up to 90% property value',
    features: ['Tenure up to 30 years', 'Low interest rates', 'Tax benefits available', 'Easy EMI options'],
  },
  {
    icon: 'construct-outline', title: 'Project Loan', colorKey: 'statusApproved',
    subtitle: 'Financing for real estate development',
    highlight: 'Up to 80% project financing',
    features: ['Flexible repayment options', 'Quick approval process', 'Competitive interest rates', 'Minimal documentation'],
  },
  {
    icon: 'business-outline', title: 'Loan Against Property', colorKey: 'roleBuilder',
    subtitle: 'Unlock the value of your property',
    highlight: 'High loan amounts',
    features: ['Lower interest rates', 'Flexible end-use', 'Long repayment tenure', 'Minimal processing fees'],
  },
  {
    icon: 'swap-horizontal-outline', title: 'Balance Transfer', colorKey: 'primary',
    subtitle: 'Transfer your loan for better rates',
    highlight: 'Lower interest rates',
    features: ['Reduced EMI burden', 'Top-up loan facility', 'Quick processing', 'No prepayment charges'],
  },
];

// ─── LOAN CARD ────────────────────────────────────────────────────────────────
interface LoanCardProps { product: LoanProduct; index: number; colors: any }

function LoanCard({ product, index, colors }: LoanCardProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 100, useNativeDriver: true }),
    ]).start();
  }, []);

  const accentColor = colors[product.colorKey] as string;
  const bgColor = accentColor + '14';

  return (
    <Animated.View
      style={[
        loanStyles.card,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[loanStyles.iconWrap, { backgroundColor: bgColor }]}>
        <Ionicons name={product.icon as any} size={24} color={accentColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[loanStyles.title, { color: colors.textPrimary }]}>{product.title}</Text>
        <Text style={[loanStyles.sub, { color: colors.textTertiary }]}>{product.subtitle}</Text>
        <View style={[loanStyles.highlight, { backgroundColor: bgColor }]}>
          <Text style={[loanStyles.highlightText, { color: accentColor }]}>{product.highlight}</Text>
        </View>
        <View style={loanStyles.features}>
          {product.features.map((f, i) => (
            <View key={i} style={loanStyles.featureItem}>
              <Ionicons name="checkmark-circle" size={13} color={accentColor} />
              <Text style={[loanStyles.featureText, { color: colors.textSecondary }]}>{f}</Text>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const MemoizedLoanCard = React.memo(LoanCard, (p, n) =>
  p.product.title === n.product.title && p.index === n.index
);

const loanStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', gap: 14, borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: StyleSheet.hairlineWidth,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, shadowOffset: { width: 0, height: 1 },
  },
  iconWrap: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  sub: { fontSize: 11, marginBottom: 8 },
  highlight: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, marginBottom: 8 },
  highlightText: { fontSize: 11, fontWeight: '700' },
  features: { gap: 4 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  featureText: { fontSize: 11 },
});

// ─── WHY US DATA ──────────────────────────────────────────────────────────────
const WHY_KEYS: Array<{ icon: string; label: string; desc: string; colorKey: string }> = [
  { icon: 'flash-outline',          label: 'Quick Approval', desc: 'Get approval in 24–48 hours',   colorKey: 'statusPending'  },
  { icon: 'trending-down-outline',  label: 'Best Rates',     desc: 'Competitive interest rates',    colorKey: 'statusApproved' },
  { icon: 'options-outline',        label: 'Flexible Terms', desc: 'Customized repayment plans',    colorKey: 'roleBuilder'    },
  { icon: 'document-outline',       label: 'Easy Docs',      desc: 'Hassle-free documentation',     colorKey: 'accent'         },
  { icon: 'people-outline',         label: 'Expert Help',    desc: 'Dedicated loan advisors',       colorKey: 'primary'        },
  { icon: 'eye-outline',            label: 'Transparent',    desc: 'No hidden charges',             colorKey: 'statusApproved' },
];

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function LoansScreen() {
  const nav = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();

  // ── AUTH GATE ──
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.authCenter}>
          <View style={[styles.authIconWrap, { backgroundColor: colors.accent + '18' }]}>
            <Ionicons name="cash-outline" size={44} color={colors.accent} />
          </View>
          <Text style={[styles.authTitle, { color: colors.textPrimary }]}>Sign in to access loans</Text>
          <Text style={[styles.authSub, { color: colors.textTertiary }]}>
            Use the EMI calculator, explore loan products, and talk to a loan advisor.
          </Text>
          <PremiumGradientButton
            title="Sign In / Register"
            icon="person-outline"
            onPress={() => nav.navigate('Login')}
            style={{ width: '100%', marginBottom: 12 }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        bounces={false}
        contentContainerStyle={{ paddingBottom: 150 }}
      >
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: colors.primary }]}>
          <Text style={styles.heroTitle}>Get the Best Loan for Your Property</Text>
          <Text style={styles.heroSub}>Competitive rates · Quick approval · Expert guidance</Text>
        </View>

        {/* EMI Calculator */}
        <View style={styles.section}>
          <EmiCalculator colors={colors} />
        </View>

        {/* Loan Products */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Our Loan Products</Text>
          <Text style={[styles.sectionSub, { color: colors.textTertiary }]}>
            Choose from our range of loan products
          </Text>
          {LOAN_PRODUCTS.map((p, i) => (
            <MemoizedLoanCard key={p.title} product={p} index={i} colors={colors} />
          ))}
        </View>

        {/* Why us */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Why Choose Our Loan Services?</Text>
          <View style={styles.whyGrid}>
            {WHY_KEYS.map(w => {
              const c = (colors as any)[w.colorKey] as string;
              return (
                <View key={w.label} style={[styles.whyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.whyIcon, { backgroundColor: c + '14' }]}>
                    <Ionicons name={w.icon as any} size={20} color={c} />
                  </View>
                  <Text style={[styles.whyLabel, { color: colors.textPrimary }]}>{w.label}</Text>
                  <Text style={[styles.whyDesc, { color: colors.textTertiary }]}>{w.desc}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* CTAs */}
        <View style={styles.section}>
          <PremiumGradientButton
            title="Talk to a Loan Advisor"
            icon="call-outline"
            onPress={() => Linking.openURL('tel:+918460567890')}
            style={{ marginBottom: 10 }}
          />
          <AnimatedPressable onPress={() => Linking.openURL('https://wa.me/918460567890')}>
            <View style={styles.waBtn}>
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={styles.waBtnText}>WhatsApp Us</Text>
            </View>
          </AnimatedPressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Auth wall
  authCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  authIconWrap: {
    width: 96, height: 96, borderRadius: 24,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  authTitle: { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  authSub: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },

  // Hero
  hero: {
    paddingHorizontal: 20, paddingVertical: 24, alignItems: 'center',
  },
  heroTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 4 },
  sectionSub: { fontSize: 12, marginBottom: 14 },

  // Why us grid
  whyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  whyCard: {
    width: '47%', borderRadius: 12, padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  whyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  whyLabel: { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  whyDesc: { fontSize: 11, lineHeight: 15 },

  // WhatsApp CTA
  waBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#25d366', borderRadius: 12, paddingVertical: 14, marginBottom: 10,
  },
  waBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
