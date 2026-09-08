/**
 * @file AccountCashFlowRow.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Monthly Inflow and Outflow cards for the selected account.
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';

interface AccountCashFlowRowProps {
  inflow: number;
  outflow: number;
  symbol: string;
}

export const AccountCashFlowRow = memo(function AccountCashFlowRow({
  inflow,
  outflow,
  symbol,
}: AccountCashFlowRowProps) {
  const { colors, isDark } = useTheme();

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : '#FFFFFF';
  const cardBorder = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Monthly Inflow */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={s.topRow}>
          <View style={[s.iconBox, { backgroundColor: '#10B98118' }]}>
            <Ionicons name="arrow-down" size={14} color="#10B981" />
          </View>
          <AppText style={[s.label, { color: colors.text.secondary }]}>Inflow this month</AppText>
        </View>
        <AppText style={[s.amount, { color: colors.status.income }]} numberOfLines={1} adjustsFontSizeToFit>
          +{symbol}{inflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </AppText>
      </View>

      {/* Monthly Outflow */}
      <View style={[s.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={s.topRow}>
          <View style={[s.iconBox, { backgroundColor: '#EF444418' }]}>
            <Ionicons name="arrow-up" size={14} color="#EF4444" />
          </View>
          <AppText style={[s.label, { color: colors.text.secondary }]}>Outflow this month</AppText>
        </View>
        <AppText style={[s.amount, { color: colors.status.expense }]} numberOfLines={1} adjustsFontSizeToFit>
          -{symbol}{outflow.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </AppText>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginVertical: Spacing['2'],
  },
  card: {
    flex: 1,
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 74,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    includeFontPadding: false,
  },
  amount: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
    includeFontPadding: false,
  },
});
