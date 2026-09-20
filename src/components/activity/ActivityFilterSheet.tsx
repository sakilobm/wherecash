/**
 * @file ActivityFilterSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description Modern, native-animated Bottom Sheet for Activity filters.
 *   Provides dedicated selectors for Transaction Type, Account, and Category
 *   using React Native's native slide modal for instant response and zero lag.
 * @associatedFiles src/app/(tabs)/transactions.tsx, src/components/activity/ActivityStickyHeader.tsx
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { triggerAppHaptic } from '@/services/hapticsService';
import { useAccountStore } from '@store/accountStore';
import { useCategoryStore } from '@store/categoryStore';
import { useTransactionStore } from '@store/transactionStore';
import type { TransactionType } from '@store/types';

const TYPE_OPTIONS: { label: string; value: TransactionType | 'all' | 'loan'; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: 'All Types', value: 'all',      icon: 'grid-outline' },
  { label: 'Expense',   value: 'expense',  icon: 'arrow-up-circle-outline' },
  { label: 'Income',    value: 'income',   icon: 'arrow-down-circle-outline' },
  { label: 'Transfer',  value: 'transfer', icon: 'swap-horizontal-outline' },
  { label: 'Loans',     value: 'loan',     icon: 'people-outline' },
];

export interface ActivityFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  activeFilterCount: number;
  onResetFilters: () => void;
}

export function ActivityFilterSheet({
  visible,
  onClose,
  activeFilterCount,
  onResetFilters,
}: ActivityFilterSheetProps) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const filters = useTransactionStore((s) => s.filters);
  const setFilters = useTransactionStore((s) => s.setFilters);
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const handleClose = useCallback(() => {
    triggerAppHaptic('light', 'button');
    onClose();
  }, [onClose]);

  const handleSelectType = useCallback((type: TransactionType | 'all' | 'loan') => {
    triggerAppHaptic('selection', 'button');
    setFilters({ type });
  }, [setFilters]);

  const handleSelectAccount = useCallback((accId: string | null) => {
    triggerAppHaptic('selection', 'button');
    setFilters({ accountId: accId });
  }, [setFilters]);

  const handleSelectCategory = useCallback((catId: string) => {
    triggerAppHaptic('selection', 'button');
    setFilters({ category: catId });
  }, [setFilters]);

  const handleReset = useCallback(() => {
    triggerAppHaptic('medium', 'button');
    onResetFilters();
  }, [onResetFilters]);

  const cardBorder = isDark ? colors.glass.border : colors.glass.borderStrong;
  const chipInactiveBg = isDark ? colors.background.tertiary : colors.background.secondary;
  const sheetBg = isDark ? colors.background.secondary : colors.surface.sheet;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={s.modalOverlay}>
        {/* Backdrop Tap to Dismiss */}
        <Pressable
          style={[s.backdrop, { backgroundColor: 'rgba(0, 0, 0, 0.55)' }]}
          onPress={handleClose}
          accessibilityLabel="Close modal backdrop"
        />

        {/* Bottom Sheet Card */}
        <View
          style={[
            s.sheet,
            {
              backgroundColor: sheetBg,
              borderColor: cardBorder,
              paddingBottom: Math.max(insets.bottom, Spacing['4']),
            },
          ]}
        >
          {/* Grabber Handle */}
          <View style={s.grabberWrap}>
            <View style={[s.grabber, { backgroundColor: colors.text.tertiary + '40' }]} />
          </View>

          {/* Header */}
          <View style={s.header}>
            <View>
              <AppText variant="headingMD" color={colors.text.primary}>
                Filter Activity
              </AppText>
              <AppText variant="caption" color={colors.text.secondary}>
                {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'Narrow down your transactions'}
              </AppText>
            </View>

            <View style={s.headerActions}>
              {activeFilterCount > 0 && (
                <Pressable onPress={handleReset} style={s.resetHeaderBtn}>
                  <AppText variant="caption" color={colors.status.expense} style={s.resetText}>
                    Reset all
                  </AppText>
                </Pressable>
              )}
              <Pressable
                onPress={handleClose}
                style={[s.closeBtn, { backgroundColor: chipInactiveBg }]}
                accessibilityLabel="Close filters"
              >
                <Ionicons name="close" size={18} color={colors.text.primary} />
              </Pressable>
            </View>
          </View>

          {/* Filter Options Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.scrollBody}
            bounces={false}
          >
            {/* 1. Transaction Type */}
            <View style={s.section}>
              <AppText variant="labelSM" color={colors.text.secondary} style={s.sectionTitle}>
                TRANSACTION TYPE
              </AppText>
              <View style={s.chipsWrap}>
                {TYPE_OPTIONS.map((opt) => {
                  const isSelected = filters.type === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => handleSelectType(opt.value)}
                      style={({ pressed }) => [
                        s.chip,
                        {
                          backgroundColor: isSelected ? colors.brand.primary : chipInactiveBg,
                          borderColor: isSelected ? colors.brand.primary : cardBorder,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={14}
                        color={isSelected ? colors.white : colors.text.secondary}
                      />
                      <AppText
                        variant="bodySM"
                        color={isSelected ? colors.white : colors.text.primary}
                        style={{ fontWeight: isSelected ? '700' : '500' }}
                      >
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 2. Account Filter */}
            <View style={s.section}>
              <AppText variant="labelSM" color={colors.text.secondary} style={s.sectionTitle}>
                ACCOUNT
              </AppText>
              <View style={s.chipsWrap}>
                {/* All Accounts */}
                <Pressable
                  onPress={() => handleSelectAccount(null)}
                  style={({ pressed }) => [
                    s.chip,
                    {
                      backgroundColor: filters.accountId === null ? colors.brand.primary : chipInactiveBg,
                      borderColor: filters.accountId === null ? colors.brand.primary : cardBorder,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={14}
                    color={filters.accountId === null ? colors.white : colors.text.secondary}
                  />
                  <AppText
                    variant="bodySM"
                    color={filters.accountId === null ? colors.white : colors.text.primary}
                    style={{ fontWeight: filters.accountId === null ? '700' : '500' }}
                  >
                    All Accounts
                  </AppText>
                </Pressable>

                {/* Individual Accounts */}
                {accounts.map((acc) => {
                  const isSelected = filters.accountId === acc.id;
                  return (
                    <Pressable
                      key={acc.id}
                      onPress={() => handleSelectAccount(acc.id)}
                      style={({ pressed }) => [
                        s.chip,
                        {
                          backgroundColor: isSelected ? colors.brand.primary : chipInactiveBg,
                          borderColor: isSelected ? colors.brand.primary : cardBorder,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={[s.accDot, { backgroundColor: acc.color }]} />
                      <AppText
                        variant="bodySM"
                        color={isSelected ? colors.white : colors.text.primary}
                        style={{ fontWeight: isSelected ? '700' : '500' }}
                      >
                        {acc.name}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Category Filter */}
            <View style={s.section}>
              <AppText variant="labelSM" color={colors.text.secondary} style={s.sectionTitle}>
                CATEGORY
              </AppText>
              <View style={s.chipsWrap}>
                {/* All Categories */}
                <Pressable
                  onPress={() => handleSelectCategory('all')}
                  style={({ pressed }) => [
                    s.chip,
                    {
                      backgroundColor: filters.category === 'all' ? colors.brand.primary : chipInactiveBg,
                      borderColor: filters.category === 'all' ? colors.brand.primary : cardBorder,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="grid-outline"
                    size={14}
                    color={filters.category === 'all' ? colors.white : colors.text.secondary}
                  />
                  <AppText
                    variant="bodySM"
                    color={filters.category === 'all' ? colors.white : colors.text.primary}
                    style={{ fontWeight: filters.category === 'all' ? '700' : '500' }}
                  >
                    All Categories
                  </AppText>
                </Pressable>

                {/* Individual Categories */}
                {categories.map((cat) => {
                  const isSelected = filters.category === cat.id;
                  return (
                    <Pressable
                      key={cat.id}
                      onPress={() => handleSelectCategory(cat.id)}
                      style={({ pressed }) => [
                        s.chip,
                        {
                          backgroundColor: isSelected ? colors.brand.primary : chipInactiveBg,
                          borderColor: isSelected ? colors.brand.primary : cardBorder,
                          opacity: pressed ? 0.8 : 1,
                        },
                      ]}
                    >
                      <View style={[s.accDot, { backgroundColor: cat.color }]} />
                      <AppText
                        variant="bodySM"
                        color={isSelected ? colors.white : colors.text.primary}
                        style={{ fontWeight: isSelected ? '700' : '500' }}
                      >
                        {cat.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={s.footer}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [
                s.applyButton,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: pressed ? 0.88 : 1,
                  shadowColor: colors.black,
                },
              ]}
            >
              <AppText variant="bodyMD" color={colors.white} style={s.applyButtonText}>
                {activeFilterCount > 0 ? `Apply Filters (${activeFilterCount})` : 'Show All Transactions'}
              </AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheet: {
    width: '100%',
    maxHeight: '85%',
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderTopWidth: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.16,
        shadowRadius: 18,
      },
      android: { elevation: 20 },
    }),
  },
  grabberWrap: {
    alignItems: 'center',
    paddingVertical: Spacing['2'],
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['5'],
    paddingBottom: Spacing['3'],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  resetHeaderBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  resetText: {
    fontWeight: '700',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    paddingHorizontal: Spacing['5'],
    paddingVertical: Spacing['2'],
    gap: Spacing['5'],
  },
  section: {
    gap: Spacing['2'],
  },
  sectionTitle: {
    letterSpacing: 0.8,
    fontWeight: '700',
    fontSize: 11,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  accDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  footer: {
    paddingHorizontal: Spacing['5'],
    paddingTop: Spacing['3'],
  },
  applyButton: {
    height: 50,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  applyButtonText: {
    fontWeight: '700',
  },
});
