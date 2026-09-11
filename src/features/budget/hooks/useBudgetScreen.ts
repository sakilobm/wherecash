/**
 * @file useBudgetScreen.ts
 * @architecture Business Logic Layer — Headless Screen Hook
 * @description Centralizes ALL state and data filtering for the Budget screen:
 *   - Navigation tabs ('categories' | 'bills')
 *   - Category filtering & data synthesis
 *   - View mode toggle ('grid' | 'capsules')
 *   - Modal & Sheet state management (AddBudgetLimit, AddPayment, PayPartial)
 *   - Pure presentation contract for the Budget View Shell
 * @associatedFiles src/features/budget/hooks/useBudgets.ts,
 *   src/features/budget/hooks/usePlannedPayments.ts, src/app/(tabs)/budget.tsx
 */

import { useState, useCallback, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useBudgets, type SpendingStats } from './useBudgets';
import { usePlannedPayments } from './usePlannedPayments';
import type { PlannedPayment } from '@store/plannedPaymentsStore';

export type BudgetTabType = 'categories' | 'bills';

export interface FilterCategoryDef {
  id: string;
  label: string;
  icon: string;
  color: string;
}

export const FILTER_CATEGORIES: FilterCategoryDef[] = [
  { id: 'all',           label: 'All',           icon: 'grid-outline',                 color: '#8B5CF6' },
  { id: 'housing',       label: 'Housing',       icon: 'home-outline',                 color: '#3B82F6' },
  { id: 'food',          label: 'Food',          icon: 'restaurant-outline',           color: '#10B981' },
  { id: 'transport',     label: 'Transport',     icon: 'car-outline',                  color: '#38BDF8' },
  { id: 'health',        label: 'Health',        icon: 'fitness-outline',              color: '#EF4444' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline',                 color: '#8B5CF6' },
  { id: 'shopping',      label: 'Shopping',      icon: 'bag-handle-outline',           color: '#EC4899' },
  { id: 'education',     label: 'Education',     icon: 'school-outline',               color: '#F59E0B' },
  { id: 'savings',       label: 'Savings',       icon: 'wallet-outline',               color: '#10B981' },
  { id: 'other',         label: 'Other',         icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export function useBudgetScreen() {
  const {
    data: budgetsData,
    isLoading,
    refresh,
    summary,
    deleteBudget,
    spendingBreakdown,
  } = useBudgets();

  const {
    payments,
    settlePayment,
    deletePayment,
    addPayment,
    payPartial,
  } = usePlannedPayments();

  // ── UI States ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<BudgetTabType>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'capsules'>('grid');

  // Sheet States
  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [addBudgetVisible, setAddBudgetVisible] = useState(false);
  const [limitCategory, setLimitCategory] = useState<string | undefined>(undefined);
  const [activePartialPayment, setActivePartialPayment] = useState<PlannedPayment | null>(null);

  // ── Memoized Filtering & Data Synthesis ─────────────────────────────────────
  const filteredPayments = useMemo(() => {
    if (selectedCategory === 'all') return payments;
    return payments.filter((p) => p.category === selectedCategory);
  }, [payments, selectedCategory]);

  const filteredBreakdown = useMemo(() => {
    const list = selectedCategory === 'all'
      ? (spendingBreakdown ?? [])
      : (spendingBreakdown ?? []).filter((b) => b.category === selectedCategory);

    // Synthesize a $0 default entry if a specific category is selected but has no active stats yet
    if (selectedCategory !== 'all' && list.length === 0) {
      const catDef = FILTER_CATEGORIES.find((c) => c.id === selectedCategory);
      if (catDef) {
        return [{
          category: selectedCategory,
          label: catDef.label,
          icon: catDef.icon,
          color: catDef.color,
          spent: 0,
          scheduled: filteredPayments.reduce((sum, p) => sum + (p.amount - (p.amountPaid ?? 0)), 0),
          limit: 0,
          remaining: 0,
          percent: 0,
          hasLimit: false,
          budgetId: null,
        }];
      }
    }
    return list;
  }, [spendingBreakdown, selectedCategory, filteredPayments]);

  // Overall screen emptiness check
  const isScreenEmpty = (spendingBreakdown?.length ?? 0) === 0 && payments.length === 0;

  // ── Handlers & Actions ──────────────────────────────────────────────────────
  const handleSetLimit = useCallback((cat?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLimitCategory(cat);
    setAddBudgetVisible(true);
  }, []);

  const closeSetLimit = useCallback(() => {
    setAddBudgetVisible(false);
    setLimitCategory(undefined);
  }, []);

  const handleTabChange = useCallback((tab: BudgetTabType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleCategoryFilter = useCallback((catId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(catId);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewMode((prev) => (prev === 'grid' ? 'capsules' : 'grid'));
  }, []);

  const openAddPayment = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddPaymentVisible(true);
  }, []);

  const closeAddPayment = useCallback(() => {
    setAddPaymentVisible(false);
  }, []);

  return {
    // Aggregated Data
    budgets: budgetsData ?? [],
    summary,
    spendingBreakdown: spendingBreakdown ?? [],
    filteredBreakdown,
    filteredPayments,
    payments,
    isLoading,
    isScreenEmpty,
    refresh,

    // Active UI States
    activeTab,
    selectedCategory,
    viewMode,
    limitCategory,
    activePartialPayment,
    addBudgetVisible,
    addPaymentVisible,

    // Actions & Toggles
    handleSetLimit,
    closeSetLimit,
    handleTabChange,
    handleCategoryFilter,
    handleToggleViewMode,
    setActivePartialPayment,
    openAddPayment,
    closeAddPayment,
    settlePayment,
    deletePayment,
    addPayment,
    payPartial,
    deleteBudget,
  };
}
