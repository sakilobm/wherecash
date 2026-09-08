/**
 * @file HomeUpcomingPaymentsSection.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Top 2 upcoming / overdue planned payments with status pill.
 *   Matches user approved redesign.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';
import type { PlannedPayment } from '@store/plannedPaymentsStore';

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  housing: 'home-outline',
  food: 'restaurant-outline',
  transport: 'car-outline',
  health: 'fitness-outline',
  entertainment: 'film-outline',
  shopping: 'bag-handle-outline',
  education: 'school-outline',
  bills: 'flash-outline',
  other: 'receipt-outline',
};

interface HomeUpcomingPaymentsSectionProps {
  payments: PlannedPayment[];
  symbol: string;
}

export const HomeUpcomingPaymentsSection = memo(function HomeUpcomingPaymentsSection({
  payments,
  symbol,
}: HomeUpcomingPaymentsSectionProps) {
  const { colors, isDark } = useTheme();

  // Top 2 payments (prioritize Overdue, then Upcoming)
  const topPayments = [...payments]
    .sort((a, b) => {
      if (a.status === 'OVERDUE' && b.status !== 'OVERDUE') return -1;
      if (b.status === 'OVERDUE' && a.status !== 'OVERDUE') return 1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    })
    .slice(0, 2);

  if (topPayments.length === 0) return null;

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '700' }}>
          Upcoming Payments
        </AppText>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/(tabs)/budget');
          }}
          hitSlop={8}
        >
          <AppText style={[s.seeAll, { color: colors.brand.primary }]}>See all</AppText>
        </Pressable>
      </View>

      {/* Card */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {topPayments.map((p, idx) => {
          const isOverdue = p.status === 'OVERDUE';
          const iconName = CATEGORY_ICONS[p.category] ?? 'receipt-outline';
          const badgeColor = isOverdue ? colors.status.expense : '#10B981';

          let formattedDate = '';
          try {
            formattedDate = format(parseISO(p.dueDate), 'MMM dd');
          } catch {
            formattedDate = p.dueDate;
          }

          return (
            <Pressable
              key={p.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/(tabs)/budget');
              }}
              style={({ pressed }) => [
                s.row,
                idx < topPayments.length - 1 && [s.rowBorder, { borderBottomColor: cardBorder }],
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              {/* Category Icon */}
              <View style={[s.iconBox, { backgroundColor: badgeColor + '18' }]}>
                <Ionicons name={iconName} size={18} color={badgeColor} />
              </View>

              {/* Title & Status */}
              <View style={s.middleCol}>
                <AppText style={[s.titleText, { color: colors.text.primary }]} numberOfLines={1}>
                  {p.title}
                </AppText>
                <View style={s.statusRow}>
                  <Ionicons
                    name={isOverdue ? 'flame' : 'time-outline'}
                    size={11}
                    color={badgeColor}
                  />
                  <AppText style={[s.statusText, { color: badgeColor }]}>
                    {isOverdue ? 'Overdue' : 'Upcoming'} · {formattedDate}
                  </AppText>
                </View>
              </View>

              {/* Amount */}
              <View style={s.rightCol}>
                <AppText style={[s.amountText, { color: colors.text.primary }]}>
                  {symbol}{p.amount.toFixed(2)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    marginTop: Spacing['4'],
    marginBottom: Spacing['6'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  row: {
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
  middleCol: {
    flex: 1,
    gap: 2,
  },
  titleText: {
    fontSize: 13.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
