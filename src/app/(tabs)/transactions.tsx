/**
 * @file transactions.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Activity / Transactions screen. Pure declarative orchestrator: reads a
 *   single contract from useActivityScreen and renders extracted components. Zero
 *   business logic, zero raw store mutations, <180 lines.
 * @associatedFiles src/features/transactions/hooks/useActivityScreen.ts,
 *   src/components/activity/
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { FlatList, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useActivityScreen } from '@features/transactions/hooks/useActivityScreen';
import { ActivityHero } from '@components/activity/ActivityHero';
import { ActivityStickyHeader } from '@components/activity/ActivityStickyHeader';
import { ActivityFilterSheet } from '@components/activity/ActivityFilterSheet';
import { ActivityEmptyState } from '@components/activity/ActivityEmptyState';
import { TransactionGroupItem } from '@components/activity/TransactionGroupItem';
import { EditTransactionSheet } from '@components/transactions/EditTransactionSheet';
import { LoadingScreen } from '@components/LoadingScreen';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing, Layout } from '@constants/index';

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();

  const {
    groups, isLoading, isEmpty, refresh, removeTransaction, formatDateHeader,
    filters, setFilters, resetFilters, hasActiveFilters, activeFilterCount, isFilteredEmpty,
    selectedAccount, summary, monthLabel, handleTransactionPress,
    editingTransaction, setEditingTransaction, runningBalances,
  } = useActivityScreen();

  // Snappy local search input with 250ms debounced dispatch to avoid store thrashing
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFilterSheetVisible, setIsFilterSheetVisible] = useState(false);

  useEffect(() => {
    setSearchQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setFilters({ searchQuery: text });
    }, 250);
  }, [setFilters]);

  const handleClearSearch = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery('');
    setFilters({ searchQuery: '' });
  }, [setFilters]);

  const handleResetAllFilters = useCallback(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    setSearchQuery('');
    resetFilters();
  }, [resetFilters]);

  const handleOpenFilters = useCallback(() => {
    setIsFilterSheetVisible(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setIsFilterSheetVisible(false);
  }, []);

  const rawBalanceColor = selectedAccount?.color ?? colors.brand.primary;
  const isBrightColor   = !isDark && rawBalanceColor === colors.brand.primary;
  const balanceColor    = isBrightColor ? colors.text.brand : rawBalanceColor;
  const balanceIcon     = (selectedAccount?.icon ?? 'wallet-outline') as any;
  const cardBg          = isDark ? colors.background.secondary : colors.background.card;
  const cardBorder      = isDark ? colors.glass.border : colors.glass.borderStrong;
  const dividerColor    = isDark ? colors.glass.background : colors.glass.backgroundMid;

  const listData = useMemo(() => {
    const list: any[] = [
      { id: 'hero', type: 'hero' },
      { id: 'sticky-bar', type: 'sticky-bar' },
    ];
    if (isEmpty) {
      list.push({ id: 'empty', type: 'empty' });
    } else {
      (groups ?? []).forEach((group, idx) => {
        list.push({ id: group.date, type: 'group', group, index: idx });
      });
    }
    return list;
  }, [groups, isEmpty]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'hero':
        return <ActivityHero summary={summary} monthLabel={monthLabel} />;
      case 'sticky-bar':
        return (
          <ActivityStickyHeader
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onClearSearch={handleClearSearch}
            hasActiveFilters={hasActiveFilters}
            activeFilterCount={activeFilterCount}
            onOpenFilters={handleOpenFilters}
            onResetFilters={handleResetAllFilters}
          />
        );
      case 'empty':
        return (
          <ActivityEmptyState
            isFiltered={isFilteredEmpty}
            onResetFilters={handleResetAllFilters}
          />
        );
      case 'group': {
        const { group, index: groupIdx } = item;
        return (
          <TransactionGroupItem
            group={group}
            groupIdx={groupIdx}
            balanceColor={balanceColor}
            balanceIcon={balanceIcon}
            symbol={symbol}
            cardBg={cardBg}
            cardBorder={cardBorder}
            dividerColor={dividerColor}
            dateTextColor={colors.text.secondary}
            shadowColor={colors.black}
            formatDateHeader={formatDateHeader}
            onTransactionPress={handleTransactionPress}
            onRemoveTransaction={removeTransaction}
            runningBalances={runningBalances}
          />
        );
      }
      default:
        return null;
    }
  }, [
    summary, monthLabel, searchQuery, handleSearchChange, handleClearSearch,
    hasActiveFilters, activeFilterCount, handleOpenFilters, handleResetAllFilters,
    isFilteredEmpty, balanceColor, balanceIcon, symbol, cardBg, cardBorder,
    dividerColor, colors.text.secondary, colors.black, formatDateHeader,
    handleTransactionPress, removeTransaction, runningBalances,
  ]);

  if (isLoading && !groups) return <LoadingScreen message="Loading transactions..." />;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.scrollContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.brand.primary} />}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        updateCellsBatchingPeriod={50}
      />

      <ActivityFilterSheet
        visible={isFilterSheetVisible}
        onClose={handleCloseFilters}
        activeFilterCount={activeFilterCount}
        onResetFilters={handleResetAllFilters}
      />

      <EditTransactionSheet
        visible={!!editingTransaction}
        transaction={editingTransaction}
        onClose={() => setEditingTransaction(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scrollContainer: {
    paddingTop: Spacing['1'],
    paddingBottom: Layout.tabBarHeight + Spacing['8'],
  },
});
