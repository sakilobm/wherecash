/**
 * @file ThisMonthOverview.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description 3-card monthly summary (Income | Expenses | Saved) plus Financial Insights banner.
 *   Matches the user's approved redesign with auto-scaling typography and responsive flexbox.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';

interface ThisMonthOverviewProps {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  symbol: string;
}

export const ThisMonthOverview = memo(function ThisMonthOverview({
  totalIncome,
  totalExpense,
  netSavings,
  symbol,
}: ThisMonthOverviewProps) {
  const { colors, isDark } = useTheme();

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // Calculate saving rate
  const savingRate = totalIncome > 0
    ? Math.round((netSavings / totalIncome) * 100)
    : 0;

  return (
    <View style={s.container}>
      {/* Section Header */}
      <View style={s.sectionHeader}>
        <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '700' }}>
          This Month
        </AppText>
      </View>

      {/* 3 Horizontal Cards Row */}
      <View style={s.cardsRow}>
        {/* Income Card */}
        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={s.cardTop}>
            <View style={[s.dotIcon, { backgroundColor: '#10B9811C' }]}>
              <Ionicons name="arrow-up" size={11} color="#10B981" />
            </View>
            <AppText style={[s.statLabel, { color: colors.text.secondary }]}>Income</AppText>
          </View>
          <AppText style={[s.statValue, { color: colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
            {symbol}{totalIncome.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </AppText>
          <View style={s.trendRow}>
            <Ionicons name="trending-up" size={11} color="#10B981" />
            <AppText style={[s.trendText, { color: '#10B981' }]}>In</AppText>
          </View>
        </View>

        {/* Expenses Card */}
        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={s.cardTop}>
            <View style={[s.dotIcon, { backgroundColor: '#EF44441C' }]}>
              <Ionicons name="arrow-down" size={11} color="#EF4444" />
            </View>
            <AppText style={[s.statLabel, { color: colors.text.secondary }]}>Expenses</AppText>
          </View>
          <AppText style={[s.statValue, { color: colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
            {symbol}{totalExpense.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </AppText>
          <View style={s.trendRow}>
            <Ionicons name="trending-down" size={11} color="#EF4444" />
            <AppText style={[s.trendText, { color: '#EF4444' }]}>Out</AppText>
          </View>
        </View>

        {/* Saved Card */}
        <View style={[s.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
          <View style={s.cardTop}>
            <View style={[s.dotIcon, { backgroundColor: '#3B82F61C' }]}>
              <Ionicons name="shield-checkmark" size={11} color="#3B82F6" />
            </View>
            <AppText style={[s.statLabel, { color: colors.text.secondary }]}>Saved</AppText>
          </View>
          <AppText style={[s.statValue, { color: colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>
            {symbol}{netSavings.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </AppText>
          <View style={s.trendRow}>
            <Ionicons
              name={netSavings >= 0 ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={netSavings >= 0 ? '#3B82F6' : '#EF4444'}
            />
            <AppText style={[s.trendText, { color: netSavings >= 0 ? '#3B82F6' : '#EF4444' }]}>
              {savingRate}%
            </AppText>
          </View>
        </View>
      </View>

      {/* Financial Insights Banner */}
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push('/analytics');
        }}
        style={({ pressed }) => [
          s.insightsBanner,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={
            isDark
              ? ['rgba(56, 189, 248, 0.08)', 'rgba(99, 102, 241, 0.05)']
              : ['rgba(56, 189, 248, 0.08)', 'rgba(99, 102, 241, 0.04)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={s.insightsIconBox}>
          <Ionicons name="stats-chart" size={17} color="#38BDF8" />
        </View>

        <View style={{ flex: 1, gap: 1 }}>
          <AppText style={[s.insightsTitle, { color: colors.text.primary }]}>
            Financial Insights
          </AppText>
          <AppText style={[s.insightsSub, { color: colors.text.tertiary }]}>
            Charts · Trends · Spending analysis
          </AppText>
        </View>

        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    marginTop: Spacing['4'],
    marginBottom: Spacing['2'],
  },
  sectionHeader: {
    marginBottom: Spacing['3'],
  },
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  statCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 88,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  dotIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginVertical: 2,
    includeFontPadding: false,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
  },
  insightsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: 12,
    paddingHorizontal: Spacing['3'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: Spacing['3'],
  },
  insightsIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#38BDF81C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightsTitle: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  insightsSub: {
    fontSize: 10.5,
    fontWeight: '500',
    includeFontPadding: false,
  },
});
