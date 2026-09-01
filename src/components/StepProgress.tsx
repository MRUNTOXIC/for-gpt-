import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  currentStep: number;   // 1-based
  totalSteps: number;
  stepLabels: string[];  // e.g. ['Purpose', 'Type', 'Preferences', 'Results']
  onBack?: () => void;
}

export default function StepProgress({ currentStep, totalSteps, stepLabels, onBack }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface, borderBottomColor: colors.borderLight }]}>
      {/* Back + step label row */}
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: colors.surfaceSunken }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <Text style={[styles.stepLabel, { color: colors.textTertiary }]}>
          Step {currentStep} of {totalSteps}
        </Text>

        <View style={styles.backPlaceholder} />
      </View>

      {/* Dot progress bar */}
      <View style={styles.dotsRow}>
        {stepLabels.map((label, i) => {
          const stepNum = i + 1;
          const done    = stepNum < currentStep;
          const active  = stepNum === currentStep;
          return (
            <React.Fragment key={label}>
              {/* Connector line before each step except the first */}
              {i > 0 && (
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: done || active ? colors.primary : colors.border },
                  ]}
                />
              )}
              <View style={styles.dotWrap}>
                <View
                  style={[
                    styles.dot,
                    {
                      borderColor: active || done ? colors.primary : colors.border,
                      backgroundColor: done
                        ? colors.primary
                        : active
                        ? colors.primaryBg
                        : colors.surface,
                    },
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.dotNum,
                        { color: active ? colors.primary : colors.textTertiary },
                      ]}
                    >
                      {stepNum}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.dotLabel,
                    { color: active ? colors.primary : colors.textTertiary,
                      fontWeight: active ? '700' : '500' },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingTop: 8,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  backPlaceholder: { width: 34 },
  stepLabel: { fontSize: 12, fontWeight: '600' },

  dotsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  connector: {
    flex: 1,
    height: 2,
    marginTop: 11,
    marginHorizontal: 2,
  },
  dotWrap: {
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center', alignItems: 'center',
  },
  dotNum: { fontSize: 10, fontWeight: '700' },
  dotLabel: { fontSize: 9, textAlign: 'center', maxWidth: 54 },
});
