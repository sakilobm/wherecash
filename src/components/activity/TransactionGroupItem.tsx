/**
 * @file TransactionGroupItem.tsx
 * @architecture Presentation Layer — UI Component
 * @description Highly optimized, memoized transaction date group card.
 *   Renders the date header, running balance pill, and list of swipeable transaction rows.
 *   Wrapped in React.memo so modifying one day's transactions never causes other days to re-render.
 * @associatedFiles src/components/activity/SwipeableTransactionRow.tsx, src/app/(tabs)/transactions.tsx
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { SwipeableTransactionRow } from './SwipeableTransactionRow';
import { Radius, Spacing } from '@constants/index';
import type { Transaction } from '@store/types';
import type { TransactionGroupHeader } from '@features/transactions/types';

interface Props {
  group: TransactionGroupHeader;
  groupIdx: number;
  balanceColor: string;
  balanceIcon: any;
  symbol: string;
  cardBg: string;
  cardBorder: string;
  dividerColor: string;
  dateTextColor: string;
  shadowColor: string;
  formatDateHeader: (date: string) => string;
  onTransactionPress: (tx: Transaction) => void;
  onRemoveTransaction: (id: string) => void;
  runningBalances: Map<string, number>;
}

export const TransactionGroupItem = React.memo(function TransactionGroupItem({
  group,
  groupIdx,
  balanceColor,
  balanceIcon,
  symbol,
  cardBg,
  cardBorder,
  dividerColor,
  dateTextColor,
  shadowColor,
  formatDateHeader,
  onTransactionPress,
  onRemoveTransaction,
  runningBalances,
}: Props) {
  return (
    <View style={s.list}>
      <Animated.View
        style={s.section}
        entering={FadeInDown.springify().damping(22).stiffness(150).delay(Math.min(groupIdx * 40, 240))}
      >
        {/* Date header row */}
        <View style={s.dateHeader}>
          <View style={s.dateLabelRow}>
            <View style={[s.dateDot, { backgroundColor: balanceColor }]} />
            <AppText style={[s.dateText, { color: dateTextColor }]}>
              {formatDateHeader(group.date)}
            </AppText>
          </View>
          <View style={[s.balancePill, { backgroundColor: balanceColor + '0C', borderColor: balanceColor + '28' }]}>
            <Ionicons name={balanceIcon} size={10} color={balanceColor} />
            <AppText style={{ color: balanceColor, fontWeight: '700', fontSize: 10.5 }}>
              {symbol}{group.balanceAfter.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AppText>
          </View>
        </View>

        {/* Transaction card */}
        <View style={[s.groupCard, { backgroundColor: cardBg, borderColor: cardBorder, shadowColor }]}>
          {group.transactions.map((tx: Transaction, idx: number) => (
            <View key={tx.id}>
              <SwipeableTransactionRow
                tx={tx}
                onPress={onTransactionPress}
                onDelete={() => onRemoveTransaction(tx.id)}
                balanceAfter={runningBalances.get(tx.id)}
              />
              {idx < group.transactions.length - 1 && (
                <View style={[s.rowDivider, { backgroundColor: dividerColor }]} />
              )}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing['5'],
    paddingTop: Spacing['3'],
    gap: Spacing['5'],
  },
  section: {
    gap: Spacing['2'],
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['1'],
  },
  dateLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  dateDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  groupCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing['4'],
  },
});
