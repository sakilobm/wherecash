/**
 * @file ActivityEmptyState.tsx
 * @architecture Presentation Layer — UI Component
 * @description Empty state for the Activity screen using the standard hero anatomy:
 *   dashed outer ring + brand-gradient icon circle + badge + 3 feature rows + hint strip.
 * @associatedFiles src/app/(tabs)/transactions.tsx
 */

import React from 'react';
import { View, StyleSheet, Platform, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { triggerAppHaptic } from '@/services/hapticsService';

const FEATURES: { icon: 'trending-down-outline' | 'trending-up-outline' | 'analytics-outline'; colorKey: 'expense' | 'income' | 'savings'; text: string }[] = [
  { icon: 'trending-down-outline', colorKey: 'expense', text: 'Log expenses by category' },
  { icon: 'trending-up-outline',   colorKey: 'income',  text: 'Record income sources'    },
  { icon: 'analytics-outline',     colorKey: 'savings', text: 'See monthly breakdowns'   },
];

export interface ActivityEmptyStateProps {
  isFiltered?: boolean;
  onResetFilters?: () => void;
}

export function ActivityEmptyState({ isFiltered = false, onResetFilters }: ActivityEmptyStateProps) {
  const { colors } = useTheme();
  const accentHex = colors.brand.primary;

  const handleReset = () => {
    triggerAppHaptic('light', 'button');
    onResetFilters?.();
  };

  if (isFiltered) {
    return (
      <View style={s.root}>
        {/* ── Filter Hero ─── */}
        <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={s.heroWrap}>
          <View style={[s.outerRing, { borderColor: accentHex + '28' }]} />
          <LinearGradient
            colors={[accentHex, colors.brand.accent] as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.iconCircle, { shadowColor: colors.black }]}
          >
            <Ionicons name="search-outline" size={34} color={colors.white} />
          </LinearGradient>
          <View style={[s.badge, { backgroundColor: colors.status.expense + '20' }]}>
            <Ionicons name="close" size={16} color={colors.status.expense} />
          </View>
        </Animated.View>

        {/* ── Text Block ─── */}
        <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140).delay(80)} style={s.textBlock}>
          <AppText variant="headingMD" color={colors.text.primary} align="center">
            No matching transactions
          </AppText>
          <AppText variant="bodySM" color={colors.text.secondary} align="center" style={s.subtitle}>
            We couldn't find any transactions matching your active filters or search terms.
          </AppText>
        </Animated.View>

        {/* ── Clear Filters Action ─── */}
        {!!onResetFilters && (
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140).delay(160)}>
            <Pressable
              onPress={handleReset}
              style={({ pressed }) => [
                s.resetButton,
                {
                  backgroundColor: accentHex,
                  opacity: pressed ? 0.88 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  shadowColor: colors.black,
                },
              ]}
            >
              <Ionicons name="refresh-outline" size={17} color={colors.white} />
              <AppText variant="bodySM" color={colors.white} style={s.resetButtonText}>
                Clear All Filters
              </AppText>
            </Pressable>
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* ── Hero ─── */}
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={s.heroWrap}>
        <View style={[s.outerRing, { borderColor: accentHex + '28' }]} />
        <LinearGradient
          colors={[accentHex, colors.brand.accent] as [string, string]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[s.iconCircle, { shadowColor: colors.black }]}
        >
          <Ionicons name="receipt-outline" size={36} color={colors.white} />
        </LinearGradient>
        <View style={[s.badge, { backgroundColor: colors.status.income + '20' }]}>
          <Ionicons name="add" size={16} color={colors.status.income} />
        </View>
      </Animated.View>

      {/* ── Text ─── */}
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140).delay(80)} style={s.textBlock}>
        <AppText variant="headingMD" color={colors.text.primary} align="center">No transactions yet</AppText>
        <AppText variant="bodySM" color={colors.text.secondary} align="center" style={s.subtitle}>
          Start logging your income and expenses to get a clear picture of your finances.
        </AppText>
      </Animated.View>

      {/* ── Feature rows ─── */}
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140).delay(160)} style={s.featuresCol}>
        {FEATURES.map(({ icon, colorKey, text }) => {
          const featureColor = colors.status[colorKey];
          return (
          <View key={text} style={[s.featureRow, { backgroundColor: colors.surface.sheet, borderColor: accentHex + '20', shadowColor: colors.black }]}>
            <View style={[s.featureIcon, { backgroundColor: featureColor + '15' }]}>
              <Ionicons name={icon} size={16} color={featureColor} />
            </View>
            <AppText variant="bodySM" color={colors.text.secondary} style={{ flex: 1 }}>{text}</AppText>
          </View>
          );
        })}
      </Animated.View>

      {/* ── Hint ─── */}
      <Animated.View
        entering={FadeInDown.springify().damping(20).stiffness(140).delay(240)}
        style={[s.hint, { backgroundColor: accentHex + '0C', borderColor: accentHex + '25' }]}
      >
        <Ionicons name="home-outline" size={14} color={accentHex} />
        <AppText variant="caption" color={colors.text.secondary} style={{ flex: 1 }}>
          Go to{' '}
          <AppText variant="caption" style={{ color: accentHex, fontWeight: '700' }}>Home</AppText>
          {' '}and tap{' '}
          <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '700' }}>Expense</AppText>
          {' '}or{' '}
          <AppText variant="caption" style={{ color: colors.status.income, fontWeight: '700' }}>Income</AppText>
          {' '}to get started
        </AppText>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { alignItems: 'center', paddingHorizontal: Spacing['5'], paddingTop: Spacing['4'], gap: Spacing['4'] },
  heroWrap:    { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  outerRing:   { position: 'absolute', width: 118, height: 118, borderRadius: 59, borderWidth: 1.5, borderStyle: 'dashed' },
  iconCircle: {
    width: 82, height: 82, borderRadius: 41,
    alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
      android: { elevation: 12 },
    }),
  },
  badge:       { position: 'absolute', bottom: 14, right: 10, width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  textBlock:   { alignItems: 'center', gap: Spacing['2'] },
  subtitle:    { maxWidth: 280, lineHeight: 20 },
  featuresCol: { alignSelf: 'stretch', gap: Spacing['2'] },
  featureRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['3'],
    padding: Spacing['3'], borderRadius: Radius.lg, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  hint: {
    alignSelf: 'stretch', flexDirection: 'row', alignItems: 'flex-start',
    gap: Spacing['2'], padding: Spacing['3'], borderRadius: Radius.lg, borderWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['5'],
    paddingVertical: Spacing['3'],
    borderRadius: Radius.full,
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
  resetButtonText: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
