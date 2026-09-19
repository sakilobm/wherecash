/**
 * @file ActivityHero.tsx
 * @architecture Presentation Layer — UI Component
 * @description Premium unified summary card for the Activity screen. Uses the shared
 *   AppHeader for the title row (with screenLabel + month chip) and renders a single
 *   glassmorphic stats card with horizontal stat layout and gradient accents.
 * @associatedFiles src/features/transactions/hooks/useActivityScreen.ts,
 *   src/app/(tabs)/transactions.tsx
 */

import React, { type ComponentProps } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { AppHeader } from '@components/AppHeader';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing, Radius } from '@constants/index';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface SummaryData { income: number; expense: number; count: number }

interface Props {
  summary: SummaryData;
  monthLabel: string;
}

export const ActivityHero = React.memo(function ActivityHero({ summary, monthLabel }: Props) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();
  const net = summary.income - summary.expense;

  const incomeColor  = colors.status.income;
  const expenseColor = colors.status.expense;
  const netColor     = net >= 0 ? incomeColor : expenseColor;
  const netIcon: IoniconName = net >= 0 ? 'trending-up' : 'trending-down';

  // Card background
  const cardBg     = isDark ? colors.background.secondary : colors.background.card;
  const cardBorder = isDark ? colors.glass.borderStrong : colors.glass.borderStrong;

  const countText = `${summary.count} ${summary.count === 1 ? 'transaction' : 'transactions'}`;

  return (
    <View>
      {/* ── Shared Hero Header ── */}
      <AppHeader
        title="Activity"
        screenLabel="Monthly Overview"
        chipLabel={monthLabel}
        chipIcon="calendar-outline"
        chipCaption={countText}
        accentLine
      />

      {/* ── Unified Summary Card ── */}
      <Animated.View
        entering={FadeIn.delay(100).duration(400)}
        style={[
          s.card,
          {
            backgroundColor: cardBg,
            borderColor: cardBorder,
            shadowColor: isDark ? '#000' : colors.black,
          },
        ]}
      >
        {/* Top gradient glow */}
        <LinearGradient
          colors={isDark
            ? [colors.brand.primary + '30', colors.brand.accent + '15', 'transparent']
            : [colors.brand.primary + '22', colors.brand.accent + '0A', 'transparent']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.cardGlow}
        />

        {/* Three Stats Row */}
        <View style={s.statsRow}>

          {/* Income */}
          <View style={s.statItem}>
            <View style={s.statLabelRow}>
              <View style={[s.statDot, { backgroundColor: incomeColor }]} />
              <AppText style={[s.statLabel, { color: colors.text.tertiary }]}>Income</AppText>
            </View>
            <AppText
              style={[s.statValue, { color: incomeColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              +{symbol}{summary.income.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </AppText>
          </View>

          {/* Vertical Divider */}
          <View style={[s.divider, { backgroundColor: colors.glass.borderStrong }]} />

          {/* Expenses */}
          <View style={s.statItem}>
            <View style={s.statLabelRow}>
              <View style={[s.statDot, { backgroundColor: expenseColor }]} />
              <AppText style={[s.statLabel, { color: colors.text.tertiary }]}>Expenses</AppText>
            </View>
            <AppText
              style={[s.statValue, { color: expenseColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              -{symbol}{summary.expense.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </AppText>
          </View>

          {/* Vertical Divider */}
          <View style={[s.divider, { backgroundColor: colors.glass.borderStrong }]} />

          {/* Net */}
          <View style={s.statItem}>
            <View style={s.statLabelRow}>
              <Ionicons name={netIcon} size={11} color={netColor} style={{ marginRight: 2 }} />
              <AppText style={[s.statLabel, { color: colors.text.tertiary }]}>Net</AppText>
            </View>
            <AppText
              style={[s.statValue, { color: netColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {net >= 0 ? '+' : '-'}{symbol}{Math.abs(net).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </AppText>
          </View>

        </View>

        {/* Bottom accent strip */}
        <LinearGradient
          colors={[incomeColor, expenseColor] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.bottomStrip}
        />
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  /* ── Unified Card ── */
  card: {
    marginHorizontal: Spacing['5'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16 },
      android: { elevation: 4 },
    }),
  },
  cardGlow: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 80,
  },

  /* Stats row */
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing['5'],
    paddingHorizontal: Spacing['4'],
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statDot: {
    width: 6, height: 6, borderRadius: 3,
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  divider: {
    width: 1,
    height: 36,
    opacity: 0.6,
  },

  /* Bottom gradient strip */
  bottomStrip: {
    height: 2.5,
  },
});
