/**
 * @file HomeSpendingSection.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Top 3 spending categories list with sleek linear progress bars.
 *   Matches the user's approved redesign perfectly.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';
import type { SpendingByCategory } from '@store/types';

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  housing: { icon: 'home-outline', color: '#3B82F6', label: 'Housing' },
  food: { icon: 'restaurant-outline', color: '#F59E0B', label: 'Food' },
  transport: { icon: 'car-outline', color: '#06B6D4', label: 'Transport' },
  health: { icon: 'fitness-outline', color: '#EF4444', label: 'Health' },
  entertainment: { icon: 'film-outline', color: '#8B5CF6', label: 'Entertainment' },
  shopping: { icon: 'bag-handle-outline', color: '#EC4899', label: 'Shopping' },
  education: { icon: 'school-outline', color: '#10B981', label: 'Education' },
  savings: { icon: 'wallet-outline', color: '#10B981', label: 'Savings' },
  other: { icon: 'ellipsis-horizontal-outline', color: '#6B7280', label: 'Other' },
};

interface HomeSpendingSectionProps {
  categories: SpendingByCategory[];
  symbol: string;
}

export const HomeSpendingSection = memo(function HomeSpendingSection({
  categories,
  symbol,
}: HomeSpendingSectionProps) {
  const { colors, isDark } = useTheme();

  // Top 3 items only as specified in the redesign
  const topCategories = categories.slice(0, 3);
  if (topCategories.length === 0) return null;

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '700' }}>
          Spending
        </AppText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/transactions');
          }}
          hitSlop={8}
        >
          <AppText style={[s.seeAll, { color: colors.brand.primary }]}>See all</AppText>
        </Pressable>
      </View>

      {/* Sub-header badge */}
      <View style={s.subHeader}>
        <Ionicons name="pie-chart-outline" size={11} color={colors.status.expense} />
        <AppText style={[s.subLabel, { color: colors.status.expense }]}>
          SPENDING BY CATEGORY
        </AppText>
      </View>

      {/* Card with top 3 rows */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {topCategories.map((item, idx) => {
          const meta = CATEGORY_META[item.category] ?? {
            icon: 'ellipsis-horizontal-outline',
            color: '#6B7280',
            label: item.category,
          };
          const pct = Math.min(Math.max(item.percentage, 0), 100);

          return (
            <View
              key={item.category}
              style={[
                s.categoryRow,
                idx < topCategories.length - 1 && [s.rowBorder, { borderBottomColor: cardBorder }],
              ]}
            >
              {/* Category Icon */}
              <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>

              {/* Main Content & Progress Bar */}
              <View style={s.rowBody}>
                <View style={s.nameAmountRow}>
                  <View>
                    <AppText style={[s.categoryName, { color: colors.text.primary }]}>
                      {meta.label}
                    </AppText>
                    <AppText style={[s.txCount, { color: colors.text.tertiary }]}>
                      {item.transactionCount} {item.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </AppText>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText style={[s.categoryAmount, { color: colors.text.primary }]}>
                      {symbol}{item.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </AppText>
                    <AppText style={[s.categoryPct, { color: colors.text.tertiary }]}>
                      {pct.toFixed(1)}%
                    </AppText>
                  </View>
                </View>

                {/* Progress track */}
                <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                  <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: meta.color }]} />
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    marginTop: Spacing['4'],
    marginBottom: Spacing['2'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing['2'],
  },
  subLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing['4'],
    gap: Spacing['3'],
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 6,
  },
  nameAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 13.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  txCount: {
    fontSize: 10.5,
    fontWeight: '500',
    marginTop: 1,
    includeFontPadding: false,
  },
  categoryAmount: {
    fontSize: 13.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
  categoryPct: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
    includeFontPadding: false,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  progressFill: {
    height: 3.5,
    borderRadius: 2,
  },
});
