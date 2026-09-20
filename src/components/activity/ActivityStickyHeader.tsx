/**
 * @file ActivityStickyHeader.tsx
 * @architecture Presentation Layer — UI Component
 * @description Fixed-height, high-performance sticky header for the Activity screen.
 *   Hosts the main Search Bar and an integrated Filter Button. Tapping the Filter Button
 *   triggers the dedicated ActivityFilterSheet without causing FlatList sticky layout thrashing.
 * @associatedFiles src/app/(tabs)/transactions.tsx, src/components/activity/ActivityFilterSheet.tsx
 */

import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius, Typography } from '@constants/index';
import { triggerAppHaptic } from '@/services/hapticsService';

export interface ActivityStickyHeaderProps {
  searchQuery: string;
  onSearchChange: (text: string) => void;
  onClearSearch: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  onOpenFilters: () => void;
  onResetFilters: () => void;
}

export const ActivityStickyHeader = React.memo(function ActivityStickyHeader({
  searchQuery,
  onSearchChange,
  onClearSearch,
  hasActiveFilters,
  activeFilterCount,
  onOpenFilters,
  onResetFilters,
}: ActivityStickyHeaderProps) {
  const { colors, isDark } = useTheme();
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleFilterPress = () => {
    triggerAppHaptic('light', 'button');
    onOpenFilters();
  };

  const cardBg = isDark ? colors.background.secondary : colors.background.card;
  const cardBorder = isDark ? colors.glass.border : colors.glass.borderStrong;
  const searchBorder = isSearchFocused ? colors.brand.primary : cardBorder;
  const filterBg = hasActiveFilters ? colors.brand.primary : cardBg;
  const filterBorder = hasActiveFilters ? colors.brand.primary : cardBorder;
  const filterIconColor = hasActiveFilters ? colors.white : colors.text.secondary;

  return (
    <View style={[s.root, { backgroundColor: colors.background.primary }]}>
      {/* ── Main Sticky Row: Search (Main) + Filter Button (Side) ── */}
      <View style={s.mainRow}>
        {/* Main Search Input */}
        <View
          style={[
            s.searchBox,
            {
              backgroundColor: cardBg,
              borderColor: searchBorder,
              borderWidth: isSearchFocused ? 1.5 : 1,
              shadowColor: colors.black,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={17}
            color={isSearchFocused ? colors.brand.primary : colors.text.tertiary}
          />
          <TextInput
            style={[s.searchInput, { ...Typography.bodyMD, lineHeight: undefined, color: colors.text.primary }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.text.tertiary}
            value={searchQuery}
            onChangeText={onSearchChange}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {Boolean(searchQuery) && (
            <Ionicons
              name="close-circle"
              size={17}
              color={colors.text.tertiary}
              onPress={onClearSearch}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          )}
        </View>

        {/* Side Filter Button */}
        <Pressable
          onPress={handleFilterPress}
          style={({ pressed }) => [
            s.filterButton,
            {
              backgroundColor: filterBg,
              borderColor: filterBorder,
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            },
          ]}
          accessibilityLabel="Open transaction filters"
          accessibilityRole="button"
        >
          <Ionicons name="funnel-outline" size={17} color={filterIconColor} />
          {activeFilterCount > 0 && (
            <View style={[s.filterCountBadge, { backgroundColor: colors.brand.accent }]}>
              <AppText variant="caption" color={colors.white} style={s.filterCountText}>
                {activeFilterCount}
              </AppText>
            </View>
          )}
        </Pressable>
      </View>

      {/* ── Active Filter Bar (Show when filters are active) ── */}
      {hasActiveFilters && (
        <View style={s.activeFilterRow}>
          <Pressable onPress={handleFilterPress} style={s.activeBadge}>
            <Ionicons name="funnel" size={11} color={colors.brand.primary} />
            <AppText variant="caption" color={colors.brand.primary} style={s.activeBadgeText}>
              Filtered ({activeFilterCount})
            </AppText>
          </Pressable>

          <Pressable
            onPress={onResetFilters}
            style={({ pressed }) => [
              s.clearAllChip,
              {
                backgroundColor: isDark ? colors.glass.background : colors.brand.primary + '10',
                borderColor: isDark ? colors.glass.border : colors.brand.primary + '25',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <AppText variant="caption" color={colors.brand.primary} style={s.clearAllText}>
              Clear all
            </AppText>
            <Ionicons name="close-circle" size={13} color={colors.brand.primary} />
          </Pressable>
        </View>
      )}

      <View style={[s.dividerLine, { backgroundColor: cardBorder }]} />
    </View>
  );
});

const s = StyleSheet.create({
  root: {
    paddingTop: Spacing['3'],
    paddingBottom: Spacing['2'],
    gap: Spacing['2'],
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing['5'],
    gap: Spacing['2'],
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['4'],
    height: 46,
    borderRadius: Radius.lg,
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 6 },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
  },
  filterButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  filterCountBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  filterCountText: {
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
  activeFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing['5'],
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontWeight: '700',
    fontSize: 11,
  },
  clearAllChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing['3'],
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  clearAllText: {
    fontWeight: '600',
    fontSize: 11,
  },
  dividerLine: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing['5'],
    marginTop: 2,
  },
});
