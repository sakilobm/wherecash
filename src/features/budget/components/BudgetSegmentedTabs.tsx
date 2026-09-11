/**
 * @file BudgetSegmentedTabs.tsx
 * @architecture Presentation Layer — Budget Atomic Component
 * @description High-tactile segmented tabs for partitioning Category Budgets vs Planned Bills.
 *   Provides progressive disclosure so users are never overloaded on first view.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';

export type BudgetTabType = 'categories' | 'bills';

interface BudgetSegmentedTabsProps {
  activeTab: BudgetTabType;
  onTabChange: (tab: BudgetTabType) => void;
  categoriesCount: number;
  billsCount: number;
}

export const BudgetSegmentedTabs = memo(function BudgetSegmentedTabs({
  activeTab,
  onTabChange,
  categoriesCount,
  billsCount,
}: BudgetSegmentedTabsProps) {
  const { colors, isDark } = useTheme();

  const handlePress = (tab: BudgetTabType) => {
    if (tab !== activeTab) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTabChange(tab);
    }
  };

  const containerBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const activeBg = isDark ? colors.background.card : '#FFFFFF';

  return (
    <View style={[s.container, { backgroundColor: containerBg, borderColor: colors.glass.border }]}>
      {/* Tab 1: Category Budgets */}
      <Pressable
        onPress={() => handlePress('categories')}
        style={[
          s.tab,
          activeTab === 'categories' && [
            s.activeTab,
            {
              backgroundColor: activeBg,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ],
        ]}
      >
        <Ionicons
          name={activeTab === 'categories' ? 'pie-chart' : 'pie-chart-outline'}
          size={15}
          color={activeTab === 'categories' ? colors.brand.primary : colors.text.secondary}
        />
        <AppText
          style={[
            s.tabText,
            {
              color: activeTab === 'categories' ? colors.text.primary : colors.text.secondary,
              fontWeight: activeTab === 'categories' ? '800' : '600',
            },
          ]}
        >
          Categories
        </AppText>
        <View
          style={[
            s.badge,
            {
              backgroundColor: activeTab === 'categories' ? colors.brand.primary + '20' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
            },
          ]}
        >
          <AppText
            style={[
              s.badgeText,
              { color: activeTab === 'categories' ? colors.brand.primary : colors.text.tertiary },
            ]}
          >
            {categoriesCount}
          </AppText>
        </View>
      </Pressable>

      {/* Tab 2: Planned Bills & Recurring */}
      <Pressable
        onPress={() => handlePress('bills')}
        style={[
          s.tab,
          activeTab === 'bills' && [
            s.activeTab,
            {
              backgroundColor: activeBg,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            },
          ],
        ]}
      >
        <Ionicons
          name={activeTab === 'bills' ? 'calendar' : 'calendar-outline'}
          size={15}
          color={activeTab === 'bills' ? colors.brand.primary : colors.text.secondary}
        />
        <AppText
          style={[
            s.tabText,
            {
              color: activeTab === 'bills' ? colors.text.primary : colors.text.secondary,
              fontWeight: activeTab === 'bills' ? '800' : '600',
            },
          ]}
        >
          Planned Bills
        </AppText>
        <View
          style={[
            s.badge,
            {
              backgroundColor: activeTab === 'bills' ? colors.brand.primary + '20' : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)'),
            },
          ]}
        >
          <AppText
            style={[
              s.badgeText,
              { color: activeTab === 'bills' ? colors.brand.primary : colors.text.tertiary },
            ]}
          >
            {billsCount}
          </AppText>
        </View>
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing['3'],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },
  activeTab: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12.5,
    includeFontPadding: false,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    includeFontPadding: false,
  },
});
