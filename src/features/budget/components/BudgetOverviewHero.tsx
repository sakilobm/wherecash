/**
 * @file BudgetOverviewHero.tsx
 * @architecture Presentation Layer — Budget Atomic Component
 * @description Modern circular ring overview card for the monthly budget.
 *   Features:
 *   - 92px dynamic ProgressRing (color shifts: Emerald -> Amber -> Crimson)
 *   - Bold monetary values with variant="numeric" and zero clipping
 *   - Clear Remaining vs Over budget indicator
 *   - Direct 1-tap "Set / Edit Limit" action trigger
 * @associatedFiles src/components/ProgressRing.tsx, src/app/(tabs)/budget.tsx
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { ProgressRing } from '@components/ProgressRing';
import { AppText } from '@components/AppText';
import { GlassCard } from '@components/GlassCard';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing, Radius } from '@constants/index';
import type { BudgetSummary } from '../types';

interface BudgetOverviewHeroProps {
  summary: BudgetSummary | null;
  hasBudgets?: boolean;
  onEditLimit: () => void;
}

export const BudgetOverviewHero = memo(function BudgetOverviewHero({
  summary,
  onEditLimit,
}: BudgetOverviewHeroProps) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();

  if (!summary) return null;

  const pct = summary.percentUsed / 100;
  const isOver = pct > 1;
  const isWarning = pct >= 0.85 && pct <= 1;
  const remaining = summary.totalLimit - summary.totalSpent;

  // Dynamic Ring Color
  const ringColor = isOver
    ? colors.status.expense
    : isWarning
    ? colors.status.warning
    : colors.status.income;

  const cardBorderColor = isOver
    ? colors.status.expense + '40'
    : isWarning
    ? colors.status.warning + '50'
    : colors.brand.primary + '30';

  const handleEditPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onEditLimit();
  };

  return (
    <GlassCard
      padding={Spacing['5']}
      borderRadius={Radius.xl}
      borderGlow={isOver || isWarning}
      style={[s.card, { borderColor: cardBorderColor }]}
    >
      <View style={s.mainRow}>
        {/* Left: Reanimated Circular Ring */}
        <View style={s.ringWrap}>
          <ProgressRing
            progress={Math.min(pct, 1)}
            size={90}
            strokeWidth={8}
            color={ringColor}
            label={`${Math.round(summary.percentUsed)}%`}
            sublabel="used"
            animated
          />
        </View>

        {/* Right: Spent & Budget Statistics */}
        <View style={s.statsWrap}>
          <View style={s.captionRow}>
            <AppText variant="caption" color={colors.text.tertiary} style={s.caption}>
              MONTHLY BUDGET
            </AppText>
            {isOver && (
              <View style={[s.badge, { backgroundColor: colors.status.expense + '18' }]}>
                <Ionicons name="alert-circle" size={12} color={colors.status.expense} />
                <AppText style={[s.badgeText, { color: colors.status.expense }]}>Exceeded</AppText>
              </View>
            )}
            {isWarning && (
              <View style={[s.badge, { backgroundColor: colors.status.warning + '18' }]}>
                <Ionicons name="warning" size={12} color={colors.status.warning} />
                <AppText style={[s.badgeText, { color: colors.status.warning }]}>85% Near</AppText>
              </View>
            )}
          </View>

          {/* Big Spent Amount with variant="numeric" to prevent Android clipping */}
          <View style={s.amountBlock}>
            <AppText variant="numeric" style={[s.spentAmount, { color: colors.text.primary }]}>
              {symbol}{summary.totalSpent.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </AppText>
            <AppText variant="caption" color={colors.text.secondary}>
              of {symbol}{summary.totalLimit.toLocaleString('en-US', { maximumFractionDigits: 0 })} limit
            </AppText>
          </View>

          {/* Remaining Indicator */}
          <View style={s.remainingRow}>
            <Ionicons
              name={isOver ? 'trending-down-outline' : 'shield-checkmark-outline'}
              size={13}
              color={isOver ? colors.status.expense : colors.status.income}
            />
            <AppText
              variant="caption"
              style={{
                color: isOver ? colors.status.expense : colors.status.income,
                fontWeight: '700',
              }}
            >
              {isOver ? '-' : ''}{symbol}{Math.abs(remaining).toLocaleString('en-US', { maximumFractionDigits: 0 })} {isOver ? 'over budget' : 'remaining'}
            </AppText>
          </View>
        </View>
      </View>

      {/* Card Footer Action Strip */}
      <View style={[s.footer, { borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)' }]}>
        <View style={s.footerInfo}>
          {summary.overBudgetCount > 0 ? (
            <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '600' }}>
              ⚠️ {summary.overBudgetCount} category budget{summary.overBudgetCount > 1 ? 's' : ''} exceeded
            </AppText>
          ) : (
            <AppText variant="caption" color={colors.text.tertiary}>
              Tracking current active calendar month
            </AppText>
          )}
        </View>

        <Pressable
          onPress={handleEditPress}
          hitSlop={8}
          style={({ pressed }) => [
            s.editBtn,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="options-outline" size={13} color={colors.brand.primary} />
          <AppText style={[s.editBtnText, { color: colors.brand.primary }]}>
            Set Limit
          </AppText>
        </Pressable>
      </View>
    </GlassCard>
  );
});

const s = StyleSheet.create({
  card: {
    marginBottom: Spacing['4'],
    borderWidth: 1.5,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsWrap: {
    flex: 1,
    gap: 4,
  },
  captionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    includeFontPadding: false,
  },
  amountBlock: {
    gap: 1,
    marginVertical: 2,
  },
  spentAmount: {
    fontSize: 28,
    lineHeight: Platform.OS === 'android' ? 36 : 34,
    fontWeight: '800',
    includeFontPadding: false,
  },
  remainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    marginTop: 12,
    borderTopWidth: 1,
  },
  footerInfo: {
    flex: 1,
    paddingRight: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  editBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
