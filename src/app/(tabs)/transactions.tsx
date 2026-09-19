/**
 * @file transactions.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Activity / Transactions screen. Pure declarative orchestrator: reads a
 *   single contract from useActivityScreen and renders extracted components. Zero
 *   business logic, zero raw useState, zero store imports.
 * @associatedFiles src/features/transactions/hooks/useActivityScreen.ts,
 *   src/components/activity/ (ActivityHero, AccountBar, ActivityEmptyState, SwipeableTransactionRow)
 */

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useActivityScreen } from '@features/transactions/hooks/useActivityScreen';
import { ActivityHero } from '@components/activity/ActivityHero';
import { AccountBar } from '@components/activity/AccountBar';
import { ActivityEmptyState } from '@components/activity/ActivityEmptyState';
import { TransactionGroupItem } from '@components/activity/TransactionGroupItem';
import { FilterBar } from '@features/transactions/components/FilterBar';
import { CategoryFilterBar } from '@features/transactions/components/CategoryFilterBar';
import { EditTransactionSheet } from '@components/transactions/EditTransactionSheet';
import { AppText } from '@components/AppText';
import { LoadingScreen } from '@components/LoadingScreen';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing, Layout, Radius, Typography } from '@constants/index';

export default function TransactionsScreen() {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();

  const {
    groups, isLoading, isEmpty, refresh, removeTransaction, formatDateHeader,
    filters, setFilters, selectedAccount, summary, monthLabel, handleTransactionPress,
    editingTransaction, setEditingTransaction, runningBalances,
  } = useActivityScreen();

  // Snappy local search input with 250ms debounced dispatch to avoid store thrashing
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSearchQuery(filters.searchQuery);
  }, [filters.searchQuery]);

  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    searchTimerRef.current = setTimeout(() => {
      setFilters({ searchQuery: text });
    }, 250);
  }, [setFilters]);

  const handleClearSearch = useCallback(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }
    setSearchQuery('');
    setFilters({ searchQuery: '' });
  }, [setFilters]);

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
      { id: 'search', type: 'search' },
      { id: 'filters', type: 'filters' }
    ];
    if (isEmpty) {
      list.push({ id: 'empty', type: 'empty' });
    } else {
      (groups ?? []).forEach((group, idx) => {
        list.push({
          id: group.date,
          type: 'group',
          group,
          index: idx
        });
      });
    }
    return list;
  }, [groups, isEmpty]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    switch (item.type) {
      case 'hero':
        return <ActivityHero summary={summary} monthLabel={monthLabel} />;
      case 'search':
        return (
          <View style={s.searchOuter}>
            <View style={[s.searchBox, { backgroundColor: isDark ? colors.background.secondary : colors.background.card, borderColor: cardBorder, shadowColor: colors.black }]}>
              <Ionicons name="search-outline" size={17} color={colors.text.tertiary} />
              <TextInput
                style={[s.searchInput, { ...Typography.bodyMD, lineHeight: undefined, color: colors.text.primary }]}
                placeholder="Search transactions..."
                placeholderTextColor={colors.text.tertiary}
                value={searchQuery}
                onChangeText={handleSearchChange}
                returnKeyType="search"
              />
              {!!searchQuery && (
                <Ionicons name="close-circle" size={16} color={colors.text.tertiary} onPress={handleClearSearch} />
              )}
            </View>
          </View>
        );
      case 'filters':
        return (
          <View style={[s.stickyHeaderContainer, { backgroundColor: colors.background.primary }]}>
            <AccountBar />
            <FilterBar activeType={filters.type} onTypeChange={(type) => setFilters({ type })} />
            <CategoryFilterBar />
            {!isEmpty && (
              <View style={[s.tipContainer, { backgroundColor: isDark ? colors.glass.background : colors.brand.primary + '06', borderColor: isDark ? colors.glass.border : colors.brand.primary + '18' }]}>
                <Ionicons name="bulb-outline" size={14} color={colors.brand.primary} />
                <AppText variant="caption" color={colors.text.secondary} style={s.tipText}>
                  Swipe left on a transaction to delete
                </AppText>
              </View>
            )}
            <View style={[s.dividerLine, { backgroundColor: isDark ? colors.glass.border : colors.glass.borderStrong }]} />
          </View>
        );
      case 'empty':
        return (
          <View style={s.emptyStateContainer}>
            <ActivityEmptyState />
          </View>
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
    summary,
    monthLabel,
    isDark,
    colors,
    cardBorder,
    searchQuery,
    handleSearchChange,
    handleClearSearch,
    filters.type,
    setFilters,
    isEmpty,
    balanceColor,
    balanceIcon,
    symbol,
    cardBg,
    dividerColor,
    formatDateHeader,
    handleTransactionPress,
    removeTransaction,
    runningBalances,
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
        stickyHeaderIndices={[2]}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={colors.brand.primary} />}
        removeClippedSubviews={Platform.OS === 'android'}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={5}
        updateCellsBatchingPeriod={50}
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

  /* ── Search ── */
  searchOuter: {
    paddingHorizontal: Spacing['5'],
    marginTop: Spacing['4'],
    marginBottom: Spacing['2'],
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['2'],
    paddingHorizontal: Spacing['4'], height: 46, borderRadius: Radius.lg, borderWidth: 1,
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6 },
      android: { elevation: 1 },
    }),
  },
  searchInput: { flex: 1, paddingVertical: 0 },

  /* ── Sticky header ── */
  stickyHeaderContainer: {
    paddingTop: Spacing['2'],
    paddingBottom: Spacing['4'],
    gap: Spacing['3'],
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: 10,
    paddingHorizontal: Spacing['4'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginHorizontal: Spacing['5'],
    marginTop: Spacing['2'],
    marginBottom: Spacing['1'],
  },
  tipText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dividerLine: { height: StyleSheet.hairlineWidth, marginHorizontal: Spacing['5'] },

  emptyStateContainer: {
    paddingTop: Spacing['8'],
    paddingHorizontal: Spacing['5'],
  },
});
