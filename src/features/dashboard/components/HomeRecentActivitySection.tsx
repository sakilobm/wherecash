/**
 * @file HomeRecentActivitySection.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Top 3 recent transactions list with merchant title, category-date,
 *   amount, and account badge pill.
 */

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { format, parseISO } from 'date-fns';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useAccountStore } from '@store/accountStore';
import { Radius, Spacing } from '@constants/index';
import type { Transaction } from '@store/types';

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  housing: { icon: 'home-outline', color: '#3B82F6', label: 'Housing' },
  food: { icon: 'restaurant-outline', color: '#F59E0B', label: 'Food' },
  transport: { icon: 'car-outline', color: '#06B6D4', label: 'Transport' },
  health: { icon: 'fitness-outline', color: '#EF4444', label: 'Health' },
  entertainment: { icon: 'film-outline', color: '#8B5CF6', label: 'Entertainment' },
  shopping: { icon: 'bag-handle-outline', color: '#EC4899', label: 'Shopping' },
  education: { icon: 'school-outline', color: '#10B981', label: 'Education' },
  savings: { icon: 'wallet-outline', color: '#10B981', label: 'Savings' },
  salary: { icon: 'cash-outline', color: '#10B981', label: 'Salary' },
  freelance: { icon: 'laptop-outline', color: '#6366F1', label: 'Freelance' },
  investment: { icon: 'trending-up-outline', color: '#10B981', label: 'Investment' },
  other: { icon: 'ellipsis-horizontal-outline', color: '#6B7280', label: 'Other' },
};

interface HomeRecentActivitySectionProps {
  transactions: Transaction[];
  symbol: string;
  onTransactionPress: (tx: Transaction) => void;
}

export const HomeRecentActivitySection = memo(function HomeRecentActivitySection({
  transactions,
  symbol,
  onTransactionPress,
}: HomeRecentActivitySectionProps) {
  const { colors, isDark } = useTheme();
  const accounts = useAccountStore((s) => s.accounts);

  const accountMap = useMemo(() => {
    const map = new Map<string, { name: string; color: string }>();
    accounts.forEach((acc) => map.set(acc.id, { name: acc.name, color: acc.color }));
    return map;
  }, [accounts]);

  // Show top 3 recent transactions only as per redesign
  const topTransactions = transactions.slice(0, 3);
  if (topTransactions.length === 0) return null;

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '700' }}>
          Recent Activity
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
        <Ionicons name="time-outline" size={11} color={colors.text.tertiary} />
        <AppText style={[s.subLabel, { color: colors.text.tertiary }]}>
          RECENT TRANSACTIONS
        </AppText>
      </View>

      {/* Transactions Card */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {topTransactions.map((tx, idx) => {
          const meta = CATEGORY_META[tx.category] ?? {
            icon: 'ellipsis-horizontal-outline',
            color: '#6B7280',
            label: tx.category,
          };
          const accInfo = accountMap.get(tx.accountId);
          const isIncome = tx.type === 'income';

          let formattedDate = '';
          try {
            formattedDate = format(parseISO(tx.date), 'MMM dd');
          } catch {
            formattedDate = tx.date;
          }

          return (
            <Pressable
              key={tx.id}
              onPress={() => onTransactionPress(tx)}
              style={({ pressed }) => [
                s.txRow,
                idx < topTransactions.length - 1 && [s.rowBorder, { borderBottomColor: cardBorder }],
                { opacity: pressed ? 0.75 : 1 },
              ]}
            >
              {/* Category Icon */}
              <View style={[s.iconBox, { backgroundColor: meta.color + '18' }]}>
                <Ionicons name={meta.icon} size={18} color={meta.color} />
              </View>

              {/* Title & Subtitle */}
              <View style={s.middleCol}>
                <AppText style={[s.titleText, { color: colors.text.primary }]} numberOfLines={1}>
                  {tx.description || meta.label}
                </AppText>
                <AppText style={[s.subText, { color: colors.text.tertiary }]}>
                  {meta.label} · {formattedDate}
                </AppText>
              </View>

              {/* Amount & Account Pill */}
              <View style={s.rightCol}>
                <AppText
                  style={[
                    s.amountText,
                    { color: isIncome ? colors.status.income : colors.status.expense },
                  ]}
                  numberOfLines={1}
                >
                  {isIncome ? '+' : '-'}{symbol}{tx.amount.toFixed(2)}
                </AppText>

                {accInfo && (
                  <View style={[s.accountPill, { backgroundColor: accInfo.color + '15' }]}>
                    <View style={[s.accountDot, { backgroundColor: accInfo.color }]} />
                    <AppText style={[s.accountText, { color: accInfo.color }]} numberOfLines={1}>
                      {accInfo.name}
                    </AppText>
                  </View>
                )}
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
  txRow: {
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
  subText: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
  },
  rightCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amountText: {
    fontSize: 13.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    maxWidth: 95,
  },
  accountDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  accountText: {
    fontSize: 9.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
