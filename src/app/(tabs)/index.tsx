/**
 * @file index.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Modernized Home dashboard screen view shell (< 140 lines).
 *   Reads a single headless contract from useHomeScreen and renders modular atomic sections:
 *   HomeBalanceCard, HomeQuickActions, ThisMonthOverview, HomeSpendingSection,
 *   HomeRecentActivitySection, and HomeUpcomingPaymentsSection.
 *   Zero business logic, zero store imports, zero clutter.
 * @associatedFiles src/features/dashboard/hooks/useHomeScreen.ts,
 *   src/features/dashboard/components/ (HomeBalanceCard, HomeQuickActions, ThisMonthOverview,
 *   HomeSpendingSection, HomeRecentActivitySection, HomeUpcomingPaymentsSection)
 */

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useHomeScreen } from '@features/dashboard/hooks/useHomeScreen';
import { useSplashStore } from '@store/splashStore';
import { useNotificationStore } from '@store/notificationStore';
import { getAvatar } from '@constants/avatars';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Layout } from '@constants/index';

import { AppText } from '@components/AppText';
import { EmptyState } from '@components/EmptyState';
import { HomeSetupPrompt } from '@components/home/HomeSetupPrompt';
import { QuickAddSheet } from '@components/home/QuickAddSheet';
import { TransferSheet } from '@components/home/TransferSheet';
import { EditTransactionSheet } from '@components/transactions/EditTransactionSheet';

import { HomeAccountsBar } from '@features/dashboard/components/HomeAccountsBar';
import { HomeBalanceCard } from '@features/dashboard/components/HomeBalanceCard';
import { HomeQuickActions } from '@features/dashboard/components/HomeQuickActions';
import { ThisMonthOverview } from '@features/dashboard/components/ThisMonthOverview';
import { HomeSpendingSection } from '@features/dashboard/components/HomeSpendingSection';
import { HomeRecentActivitySection } from '@features/dashboard/components/HomeRecentActivitySection';
import { HomeUpcomingPaymentsSection } from '@features/dashboard/components/HomeUpcomingPaymentsSection';

export default function HomeScreen() {
  const { colors, isDark } = useTheme();
  const setAppReady = useSplashStore((s) => s.setAppReady);

  useEffect(() => {
    setAppReady(true);
  }, [setAppReady]);

  const {
    dashboard,
    user,
    symbol,
    plannedPayments,
    addSheet,
    transferSheet,
    quickActions,
    handleTransactionPress,
    editingTransaction,
    setEditingTransaction,
  } = useHomeScreen();

  const unreadCount = useNotificationStore((s) => s.notifications.filter((n) => !n.isRead).length);
  const { data, isLoading, isError, isEmpty, refresh } = dashboard;
  const avatar = getAvatar(user.avatarId);

  if (isError) {
    return (
      <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background.primary }]}>
        <EmptyState emoji="⚠️" title="Something went wrong" subtitle="Pull down to retry" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Layout.tabBarHeight + Spacing['8'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && data !== null}
            onRefresh={refresh}
            tintColor={colors.brand.primary}
          />
        }
      >
        {/* ── Top Header ── */}
        <View style={s.header}>
          <LinearGradient colors={avatar.gradient} style={s.avatar}>
            <AppText style={s.avatarEmoji}>{avatar.emoji}</AppText>
          </LinearGradient>

          <View style={s.greetingBlock}>
            <AppText variant="caption" color={colors.text.tertiary}>Good day,</AppText>
            <AppText variant="headingSM" color={colors.text.primary} style={s.greetingName}>
              {user.firstName} 👋
            </AppText>
          </View>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/notifications');
            }}
            style={({ pressed }) => [
              s.bellBtn,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)',
                borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons
              name={unreadCount > 0 ? 'notifications' : 'notifications-outline'}
              size={20}
              color={unreadCount > 0 ? colors.brand.primary : colors.text.primary}
            />
            {unreadCount > 0 && (
              <View style={[s.bellBadge, { backgroundColor: colors.status.expense, borderColor: colors.background.primary }]}>
                <AppText style={s.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</AppText>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Interactive Quick Accounts Carousel ── */}
        <HomeAccountsBar
          accounts={data?.accounts ?? []}
          symbol={symbol}
          totalBalance={data?.totalBalance ?? 0}
          onManagePress={() => router.push('/accounts')}
          onNewAccountPress={() => router.push('/accounts')}
        />

        {/* ── Available Balance Card (Emerald Luxury) ── */}
        <HomeBalanceCard
          totalBalance={data?.totalBalance ?? 0}
          currency={user.currency}
          symbol={symbol}
          isLoading={isLoading && data === null}
          netSavings={data?.monthSummary?.netSavings ?? 0}
          onManagePress={() => router.push('/accounts')}
        />

        {/* ── High-Visibility Tactile Quick Actions ── */}
        <HomeQuickActions actions={quickActions} />

        {/* ── Content or First Time Setup ── */}
        {isEmpty ? (
          <View style={{ marginTop: Spacing['6'] }}>
            <HomeSetupPrompt onLogExpense={() => addSheet.open('expense')} />
          </View>
        ) : (
          <>
            {/* 3-Card Monthly Overview + Financial Insights */}
            <ThisMonthOverview
              totalIncome={data?.monthSummary?.totalIncome ?? 0}
              totalExpense={data?.monthSummary?.totalExpense ?? 0}
              netSavings={data?.monthSummary?.netSavings ?? 0}
              symbol={symbol}
            />

            {/* Top 3 Spending Categories */}
            {data && data.spendingByCategory.length > 0 && (
              <HomeSpendingSection
                categories={data.spendingByCategory}
                symbol={symbol}
              />
            )}

            {/* Top 3 Recent Activity */}
            {data && data.recentTransactions.length > 0 && (
              <HomeRecentActivitySection
                transactions={data.recentTransactions}
                symbol={symbol}
                onTransactionPress={handleTransactionPress}
              />
            )}

            {/* Top 2 Upcoming Payments */}
            {plannedPayments && plannedPayments.length > 0 && (
              <HomeUpcomingPaymentsSection
                payments={plannedPayments}
                symbol={symbol}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── Modular Bottom Sheets ── */}
      <QuickAddSheet visible={addSheet.isVisible} initialType={addSheet.type} onClose={addSheet.close} />
      <TransferSheet visible={transferSheet.isVisible} onClose={transferSheet.close} />
      <EditTransactionSheet visible={!!editingTransaction} transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: Spacing['5'], paddingTop: Spacing['3'] },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing['3'], gap: Spacing['3'] },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarEmoji: { fontSize: 24, lineHeight: 30 },
  greetingBlock: { flex: 1, gap: 1 },
  greetingName: { lineHeight: 26 },
  bellBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBadge: { position: 'absolute', top: -1, right: -1, minWidth: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, borderWidth: 1.5 },
  bellBadgeText: { fontSize: 8, fontWeight: '900', lineHeight: 10, textAlign: 'center', color: '#FFFFFF', includeFontPadding: false },
});
