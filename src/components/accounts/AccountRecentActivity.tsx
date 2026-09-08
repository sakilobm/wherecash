/**
 * @file AccountRecentActivity.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Renders the most recent transactions for the selected account with a shortcut to full activity.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';
import type { Transaction } from '@store/types';

interface AccountRecentActivityProps {
  transactions: Transaction[];
  symbol: string;
  onViewAll: () => void;
}

export const AccountRecentActivity = memo(function AccountRecentActivity({
  transactions,
  symbol,
  onViewAll,
}: AccountRecentActivityProps) {
  const { colors, isDark } = useTheme();

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.headerRow}>
        <AppText style={[s.headerTitle, { color: colors.text.primary }]}>
          Account Activity
        </AppText>
        {transactions.length > 0 && (
          <Pressable onPress={onViewAll} hitSlop={8} style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
            <AppText style={[s.viewAll, { color: colors.brand.primary }]}>View all</AppText>
          </Pressable>
        )}
      </View>

      {/* Content */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        {transactions.length === 0 ? (
          <View style={s.emptyState}>
            <Ionicons name="receipt-outline" size={24} color={colors.text.tertiary} style={{ opacity: 0.6 }} />
            <AppText style={[s.emptyText, { color: colors.text.secondary }]}>
              No recent transactions for this account
            </AppText>
          </View>
        ) : (
          transactions.map((tx, idx) => {
            const isIncome = tx.type === 'income';
            let formattedDate = '';
            try {
              formattedDate = format(parseISO(tx.date), 'MMM dd');
            } catch {
              formattedDate = tx.date;
            }

            return (
              <View
                key={tx.id}
                style={[
                  s.row,
                  idx < transactions.length - 1 && [s.borderBottom, { borderBottomColor: cardBorder }],
                ]}
              >
                <View style={s.leftCol}>
                  <AppText style={[s.desc, { color: colors.text.primary }]} numberOfLines={1}>
                    {tx.description || tx.category}
                  </AppText>
                  <AppText style={[s.date, { color: colors.text.tertiary }]}>
                    {tx.category} · {formattedDate}
                  </AppText>
                </View>

                <AppText
                  style={[
                    s.amount,
                    { color: isIncome ? colors.status.income : colors.status.expense },
                  ]}
                  numberOfLines={1}
                >
                  {isIncome ? '+' : '-'}{symbol}{tx.amount.toFixed(2)}
                </AppText>
              </View>
            );
          })
        )}
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: '700',
    includeFontPadding: false,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['5'],
    gap: 6,
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '500',
    includeFontPadding: false,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: Spacing['4'],
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  leftCol: {
    flex: 1,
    gap: 2,
    marginRight: 10,
  },
  desc: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
  },
  date: {
    fontSize: 11,
    fontWeight: '500',
    includeFontPadding: false,
  },
  amount: {
    fontSize: 13.5,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
