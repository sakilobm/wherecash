import React from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@components/AppHeader';
import { AppText } from '@components/AppText';
import { FAB } from '@components/FAB';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Layout, Radius } from '@constants/index';
import { useBudgetScreen, FILTER_CATEGORIES } from '@features/budget/hooks/useBudgetScreen';
import { BudgetOverviewHero } from '@features/budget/components/BudgetOverviewHero';
import { BudgetSegmentedTabs } from '@features/budget/components/BudgetSegmentedTabs';
import { BudgetCategoryList } from '@features/budget/components/BudgetCategoryList';
import { PlannedPaymentsTimeline } from '@features/budget/components/PlannedPaymentsTimeline';
import { BudgetEmptyState } from '@components/budget/BudgetEmptyState';
import { AddPaymentSheet } from '@components/budget/AddPaymentSheet';
import { AddBudgetLimitSheet } from '@components/budget/AddBudgetLimitSheet';
import { PayPartialSheet } from '@components/budget/PayPartialSheet';

export default function BudgetScreen() {
  const { colors } = useTheme();
  const screen = useBudgetScreen();

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Layout.tabBarHeight + Spacing['8'] }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={screen.isLoading} onRefresh={screen.refresh} tintColor={colors.brand.primary} />}
      >
        <AppHeader
          title="Budget"
          subtitle="Monthly spending limits"
          screenLabel="Spending Planner"
          chipLabel={screen.budgets.length > 0 ? `${screen.budgets.length} active` : undefined}
          chipIcon={screen.budgets.length > 0 ? 'shield-checkmark-outline' : undefined}
          noPadding
        />

        {/* 1. Hero Overview Gauge */}
        <BudgetOverviewHero
          summary={screen.summary}
          hasBudgets={screen.budgets.length > 0}
          onEditLimit={() => screen.handleSetLimit('food')}
        />

        {screen.isScreenEmpty ? (
          <BudgetEmptyState onSetBudget={() => screen.handleSetLimit('food')} />
        ) : (
          <View style={s.contentGap}>
            {/* 2. Focus Tabs (Categories vs Planned Bills) */}
            <BudgetSegmentedTabs
              activeTab={screen.activeTab}
              onTabChange={screen.handleTabChange}
              categoriesCount={screen.spendingBreakdown.length}
              billsCount={screen.payments.length}
            />

            {/* 3. Tab: Categories Breakdown & Limits */}
            {screen.activeTab === 'categories' && (
              <Animated.View entering={FadeInDown.springify().damping(16).stiffness(120)} style={s.tabContent}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryFilterBar}>
                  {FILTER_CATEGORIES.map((cat) => {
                    const active = screen.selectedCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => screen.handleCategoryFilter(cat.id)}
                        style={[s.filterChip, { backgroundColor: active ? cat.color + '18' : colors.glass.background, borderColor: active ? cat.color + '4D' : colors.glass.border }]}
                      >
                        <Ionicons name={cat.icon as any} size={13} color={active ? cat.color : colors.text.secondary} />
                        <AppText style={[s.filterChipText, { color: active ? cat.color : colors.text.secondary }]}>{cat.label}</AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                <BudgetCategoryList
                  breakdown={screen.filteredBreakdown}
                  viewMode={screen.viewMode}
                  onToggleViewMode={screen.handleToggleViewMode}
                  onDeleteBudget={screen.deleteBudget}
                  onSetBudgetLimit={screen.handleSetLimit}
                />
              </Animated.View>
            )}

            {/* 4. Tab: Planned Payments Timeline */}
            {screen.activeTab === 'bills' && (
              <Animated.View entering={FadeInDown.springify().damping(16).stiffness(120)} style={s.tabContent}>
                <PlannedPaymentsTimeline
                  payments={screen.filteredPayments}
                  onSettle={screen.settlePayment}
                  onDelete={screen.deletePayment}
                  onPress={screen.setActivePartialPayment}
                />
              </Animated.View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Sheets & Dialogs */}
      <AddPaymentSheet
        visible={screen.addPaymentVisible}
        onClose={screen.closeAddPayment}
        onSubmit={({ title, amount, dueDate, category, accountId }) =>
          screen.addPayment({ title, amount, dueDate, category, accountId, isRecurring: false })
        }
      />

      <AddBudgetLimitSheet
        visible={screen.addBudgetVisible}
        defaultCategory={screen.limitCategory}
        onClose={screen.closeSetLimit}
      />

      <PayPartialSheet
        visible={!!screen.activePartialPayment}
        payment={screen.activePartialPayment}
        onClose={() => screen.setActivePartialPayment(null)}
        onSubmit={(amount, accountId, note) => {
          if (screen.activePartialPayment) {
            screen.payPartial(screen.activePartialPayment.id, amount, accountId, note);
          }
        }}
      />

      <FAB icon="add" label="Payment" onPress={screen.openAddPayment} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1 },
  scroll: { paddingHorizontal: Spacing['5'], paddingTop: Spacing['2'], gap: Spacing['4'] },
  contentGap: { gap: Spacing['4'] },
  tabContent: { gap: Spacing['3'] },
  categoryFilterBar: { paddingVertical: Spacing['1'], gap: Spacing['2'] },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: Radius.lg, borderWidth: 1, marginRight: 2 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
});
