/**
 * @file useActivityScreen.ts
 * @architecture Business Logic Layer — Headless Screen Hook
 * @description Aggregates all data for the Transactions/Activity screen: monthly
 *   income/expense summary, selected account for the balance pill, formatted month
 *   label, and filter state. The View layer reads a single typed contract.
 * @associatedFiles src/features/transactions/hooks/useTransactions.ts,
 *   src/store/transactionStore.ts, src/store/accountStore.ts, src/app/(tabs)/transactions.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { triggerAppHaptic } from '@/services/hapticsService';
import { useTransactions } from './useTransactions';
import { useTransactionStore } from '@store/transactionStore';
import { useAccountStore } from '@store/accountStore';
import type { Transaction, Account } from '@store/types';
import { sumMoney, addMoney } from '@/utils/moneyMath';

export interface ActivitySummary {
  income:  number;
  expense: number;
  count:   number;
}

export type FlatLedgerItem =
  | { type: 'hero'; id: string }
  | { type: 'search'; id: string }
  | { type: 'filters'; id: string }
  | { type: 'empty'; id: string }
  | { type: 'header'; id: string; date: string; totalAmount: number; balanceAfter: number }
  | { type: 'transaction'; id: string; transaction: Transaction; balanceAfter: number; isFirst: boolean; isLast: boolean };

export function useActivityScreen() {
  const { data: groups, isLoading, isEmpty, refresh, removeTransaction, formatDateHeader, runningBalances } = useTransactions();

  const accounts   = useAccountStore((s) => s.accounts);
  const filters    = useTransactionStore((s) => s.filters);
  const setFilters = useTransactionStore((s) => s.setFilters);
  const resetFiltersStore = useTransactionStore((s) => s.resetFilters);
  const totalTxCount = useTransactionStore((s) => s.transactions.length);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.accountId !== null) count++;
    if (filters.searchQuery?.trim()) count++;
    return count;
  }, [filters.type, filters.category, filters.accountId, filters.searchQuery]);

  const hasActiveFilters = activeFilterCount > 0;

  const isFilteredEmpty = isEmpty && hasActiveFilters && totalTxCount > 0;

  const resetFilters = useCallback(() => {
    triggerAppHaptic('light', 'button');
    resetFiltersStore();
  }, [resetFiltersStore]);

  const selectedAccount: Account | null = filters.accountId
    ? (accounts.find((a) => a.id === filters.accountId) ?? null)
    : null;

  const summary = useMemo<ActivitySummary>(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    for (const group of groups ?? []) {
      for (const t of group.transactions) {
        count++;
        if (t.type === 'income') {
          income = addMoney(income, t.amount);
        } else if (t.type === 'expense') {
          expense = addMoney(expense, t.amount);
        }
      }
    }
    return { income, expense, count };
  }, [groups]);

  const monthLabel = filters.month
    ? format(new Date(filters.month + '-01'), 'MMMM yyyy')
    : format(new Date(), 'MMMM yyyy');

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const handleTransactionPress = useCallback((tx: Transaction) => {
    setEditingTransaction(tx);
    triggerAppHaptic('light', 'button');
  }, []);

  const flatListData = useMemo<FlatLedgerItem[]>(() => {
    const list: FlatLedgerItem[] = [
      { type: 'hero', id: 'hero-section' },
      { type: 'search', id: 'search-section' },
      { type: 'filters', id: 'filters-section' }
    ];

    if (isEmpty) {
      list.push({ type: 'empty', id: 'empty-section' });
    } else {
      for (const group of groups ?? []) {
        list.push({
          type: 'header',
          id: `header-${group.date}`,
          date: group.date,
          totalAmount: group.totalAmount,
          balanceAfter: group.balanceAfter,
        });

        const len = group.transactions.length;
        group.transactions.forEach((tx, idx) => {
          list.push({
            type: 'transaction',
            id: tx.id,
            transaction: tx,
            balanceAfter: runningBalances.get(tx.id) ?? 0,
            isFirst: idx === 0,
            isLast: idx === len - 1,
          });
        });
      }
    }

    return list;
  }, [groups, runningBalances, isEmpty]);

  return {
    groups, isLoading, isEmpty, refresh, removeTransaction, formatDateHeader,
    accounts, filters, setFilters, resetFilters,
    hasActiveFilters,
    activeFilterCount,
    isFilteredEmpty,
    totalTxCount,
    selectedAccount,
    summary,
    monthLabel,
    editingTransaction,
    setEditingTransaction,
    handleTransactionPress,
    runningBalances,
    flatListData,
  };
}
