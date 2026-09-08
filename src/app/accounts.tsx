/**
 * @file accounts.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Modernized Accounts management screen view shell (< 150 lines).
 *   Reads state from useAccountsScreen and renders:
 *   - Total Net Worth Hero
 *   - 3D AccountCard Carousel with Primary Badge
 *   - AccountActionBar (Transfer, Edit, Set Primary, Delete)
 *   - AccountCashFlowRow (Monthly Inflow & Outflow)
 *   - AccountRecentActivity with shortcut to full activity
 *   - Integrated TransferSheet & AccountFormSheet
 */

import React from 'react';
import { View, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAccountsScreen, PAGE_W } from '@features/accounts/hooks/useAccountsScreen';
import { AccountCard } from '@components/accounts/AccountCard';
import { AccountDots } from '@components/accounts/AccountDots';
import { AccountActionBar } from '@components/accounts/AccountActionBar';
import { AccountCashFlowRow } from '@components/accounts/AccountCashFlowRow';
import { AccountRecentActivity } from '@components/accounts/AccountRecentActivity';
import { AccountEmptyState } from '@components/accounts/AccountEmptyState';
import { AccountFormSheet } from '@components/accounts/AccountFormSheet';
import { TransferSheet } from '@components/home/TransferSheet';
import { ConfirmModal } from '@components/ConfirmModal';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing } from '@constants/index';

export default function AccountsScreen() {
  const { colors } = useTheme();
  const { symbol } = useFormatCurrency();

  const {
    accounts, selectedAccount, totalBalance, accColor, selectedIdx,
    scrollRef, bgStyle, formSheet, transferSheet, deleteConfirm, handlers,
    accountInflow, accountOutflow, recentTransactions,
  } = useAccountsScreen();

  return (
    <View style={[s.root, { backgroundColor: colors.background.primary }]}>
      <Animated.View style={[StyleSheet.absoluteFill, bgStyle]} />

      <SafeAreaView style={s.safeArea} edges={['top']}>
        {/* ── Header ── */}
        <View style={s.header}>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [s.headerBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
          </Pressable>
          <View style={s.headerCenter}>
            <AppText variant="headingMD" style={{ color: colors.text.primary, fontWeight: '800' }}>
              My Accounts
            </AppText>
            <AppText variant="caption" style={{ color: colors.text.secondary }}>
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </AppText>
          </View>
          <Pressable onPress={() => handlers.add()} style={({ pressed }) => [s.addBtn, { backgroundColor: accColor, opacity: pressed ? 0.8 : 1 }]}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
          {/* ── Net Worth Hero with Dynamic Spacing ── */}
          <Animated.View entering={FadeIn.delay(100).duration(400)} style={[s.hero, accounts.length === 0 && s.heroEmpty]}>
            <AppText variant="caption" style={{ color: colors.text.secondary, letterSpacing: 1.5 }}>
              TOTAL NET WORTH
            </AppText>
            <AppText style={[s.heroBalance, { color: colors.text.primary }]}>
              {symbol}{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </AppText>
          </Animated.View>

          {/* ── Accounts Carousel or Rich Empty State ── */}
          {accounts.length === 0 ? (
            <AccountEmptyState onAdd={handlers.add} />
          ) : (
            <>
              <View style={s.carouselWrapper}>
                <ScrollView
                  ref={scrollRef} horizontal pagingEnabled={false}
                  snapToInterval={PAGE_W} decelerationRate="fast"
                  disableIntervalMomentum showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 24, paddingRight: 24, gap: 16 }}
                  onScroll={handlers.scroll} scrollEventThrottle={16} style={{ flexGrow: 0 }}
                >
                  {accounts.map((acc, i) => (
                    <AccountCard key={acc.id} account={acc} isActive={i === selectedIdx} onPress={() => handlers.edit(acc)} />
                  ))}
                </ScrollView>
              </View>
              <AccountDots count={accounts.length} activeIdx={selectedIdx} color={accColor} />
            </>
          )}

          {/* ── Selected Account Section ── */}
          {selectedAccount && (
            <View style={s.detailsSection}>
              {/* Action Ribbon: Transfer, Edit, Make Primary, Delete */}
              <AccountActionBar
                account={selectedAccount}
                onTransfer={handlers.openTransfer}
                onEdit={() => handlers.edit(selectedAccount)}
                onSetDefault={() => handlers.setDefault(selectedAccount)}
                onDelete={() => handlers.deleteConfirm(selectedAccount)}
              />

              {/* Monthly Inflow / Outflow for this Account */}
              <AccountCashFlowRow
                inflow={accountInflow}
                outflow={accountOutflow}
                symbol={symbol}
              />

              {/* Recent Activity for this specific account */}
              <AccountRecentActivity
                transactions={recentTransactions}
                symbol={symbol}
                onViewAll={handlers.viewAllActivity}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* ── Modals & Sheets ── */}
      <TransferSheet
        visible={transferSheet.isVisible}
        onClose={transferSheet.close}
      />
      <AccountFormSheet
        visible={formSheet.isVisible}
        editingAccount={formSheet.editingAccount}
        initialPreset={formSheet.initialPreset}
        onClose={formSheet.close}
        onSave={handlers.save}
      />
      <ConfirmModal
        visible={!!deleteConfirm.target}
        title="Delete Account"
        message={`Delete "${deleteConfirm.target?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger
        onConfirm={deleteConfirm.confirm}
        onCancel={deleteConfirm.dismiss}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
    ...Platform.select({
      ios: { shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 6 },
    }),
  },
  scrollContent: { paddingBottom: Spacing['8'] },
  hero: { alignItems: 'center', paddingTop: 6, paddingBottom: 16, gap: 4 },
  heroEmpty: { paddingTop: 26, paddingBottom: 26 },
  heroBalance: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
  carouselWrapper: { paddingVertical: 10 },
  detailsSection: { paddingHorizontal: 20, marginTop: Spacing['2'] },
});
