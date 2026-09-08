/**
 * @file useHomeScreen.ts
 * @architecture Business Logic Layer — Headless Screen Hook
 * @description Manages all state for the Home dashboard screen: quick-add sheet
 *   visibility and type, quick-action list (with haptic openers), user display
 *   data, and transaction press navigation. Aggregates data from useDashboardData.
 * @associatedFiles src/features/dashboard/hooks/useDashboardData.ts, src/app/(tabs)/index.tsx
 */

import { useState, useCallback, useMemo, type ComponentProps } from 'react';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useDashboardData } from './useDashboardData';
import { useAuthStore } from '@store/authStore';
import { usePlannedPaymentsStore } from '@store/plannedPaymentsStore';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { useTheme } from '@hooks/useTheme';
import type { Transaction } from '@store/types';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export interface QuickAction {
  key:      string;
  icon:     IoniconName;
  label:    string;
  color:    string;
  gradient: [string, string];
  action:   () => void;
}

export function useHomeScreen() {
  const { colors } = useTheme();
  const { symbol } = useFormatCurrency();
  const dashboard  = useDashboardData();
  const user       = useAuthStore((s) => s.user);
  const plannedPayments = usePlannedPaymentsStore((s) => s.payments);

  const [addVisible, setAddVisible] = useState(false);
  const [addType,    setAddType]    = useState<'expense' | 'income'>('expense');
  const [transferVisible, setTransferVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const openAdd = useCallback((type: 'expense' | 'income') => {
    setAddType(type);
    setAddVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const closeAdd = useCallback(() => setAddVisible(false), []);

  const openTransfer = useCallback(() => {
    setTransferVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const closeTransfer = useCallback(() => setTransferVisible(false), []);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const quickActions = useMemo<QuickAction[]>(() => [
    {
      key: 'expense',
      icon: 'trending-down',
      label: 'Expense',
      color: colors.status.expense,
      gradient: ['#EF4444', '#DC2626'],
      action: () => openAdd('expense'),
    },
    {
      key: 'income',
      icon: 'trending-up',
      label: 'Income',
      color: colors.status.income,
      gradient: ['#10B981', '#059669'],
      action: () => openAdd('income'),
    },
    {
      key: 'transfer',
      icon: 'swap-horizontal',
      label: 'Transfer',
      color: '#6366F1',
      gradient: ['#6366F1', '#4F46E5'],
      action: () => openTransfer(),
    },
    {
      key: 'split',
      icon: 'people',
      label: 'Split / Due',
      color: '#F59E0B',
      gradient: ['#F59E0B', '#D97706'],
      action: () => router.push('/(tabs)/ledger'),
    },
  ], [openAdd, openTransfer, colors]);

  const firstName = user?.fullName?.split(' ')[0] ?? 'Sakil';
  const initials  = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? 'SK';

  return {
    dashboard,
    symbol,
    plannedPayments,
    user: { firstName, initials, avatarId: user?.avatarUrl ?? undefined, currency: user?.currency ?? 'USD' },
    addSheet: {
      isVisible: addVisible,
      type:      addType,
      open:      openAdd,
      close:     closeAdd,
    },
    transferSheet: {
      isVisible: transferVisible,
      open:      openTransfer,
      close:     closeTransfer,
    },
    editingTransaction,
    setEditingTransaction,
    quickActions,
    handleTransactionPress,
  };
}
