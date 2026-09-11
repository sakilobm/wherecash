/**
 * @file HomeAccountsBar.tsx
 * @architecture Presentation Layer — Dashboard Atomic Component
 * @description Interactive quick-account carousel for the Home screen.
 *   Replaces static "My Money ... Manage" text with:
 *   - Sleek Section Header (Account count badge + Manage link)
 *   - Horizontal edge-to-edge scrollable pill carousel
 *   - All Accounts summary pill
 *   - Interactive account chips with role icons, balances, and primary badges
 *   - Quick "+ New Account" creator shortcut
 * @associatedFiles src/app/(tabs)/index.tsx, src/features/dashboard/hooks/useHomeScreen.ts
 */

import React, { useState, memo } from 'react';
import { View, ScrollView, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import type { Account } from '@store/types';

interface HomeAccountsBarProps {
  accounts: Account[];
  symbol: string;
  totalBalance: number;
  onManagePress?: () => void;
  onNewAccountPress?: () => void;
}

export const HomeAccountsBar = memo(function HomeAccountsBar({
  accounts,
  symbol,
  totalBalance,
  onManagePress,
  onNewAccountPress,
}: HomeAccountsBarProps) {
  const { colors, isDark } = useTheme();

  const [isExpanded, setIsExpanded] = useState(false);
  const chevronRotation = useSharedValue(0);

  const toggleExpand = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = !isExpanded;
    setIsExpanded(next);
    chevronRotation.value = withTiming(next ? 180 : 0, { duration: 220 });
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const handleManage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onManagePress) {
      onManagePress();
    } else {
      router.push('/accounts');
    }
  };

  const handleAccountPress = (acc: Account) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/accounts');
  };

  const handleNewAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onNewAccountPress) {
      onNewAccountPress();
    } else {
      router.push('/accounts');
    }
  };

  const pillBg = isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF';

  return (
    <View style={s.container}>
      {/* ── Section Header Row with Collapsible Dropdown Toggle ── */}
      <View style={s.headerRow}>
        <Pressable
          onPress={toggleExpand}
          hitSlop={8}
          style={({ pressed }) => [
            s.titleGroup,
            {
              backgroundColor: isExpanded
                ? (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)')
                : (isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)'),
              borderColor: isExpanded ? colors.brand.primary + '40' : colors.glass.border,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          <Ionicons name="wallet-outline" size={14} color={colors.brand.primary} />
          <AppText style={[s.titleText, { color: colors.text.primary }]}>
            ACCOUNTS
          </AppText>
          <View style={[s.countBadge, { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)' }]}>
            <AppText style={[s.countText, { color: colors.text.secondary }]}>
              {accounts.length}
            </AppText>
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={13} color={colors.text.secondary} />
          </Animated.View>
        </Pressable>

        <Pressable onPress={handleManage} hitSlop={10} style={s.manageBtn}>
          <AppText style={[s.manageText, { color: colors.brand.primary }]}>
            Manage
          </AppText>
          <Ionicons name="chevron-forward" size={13} color={colors.brand.primary} />
        </Pressable>
      </View>

      {/* ── Collapsible Horizontal Scrollable Account Pills ── */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.scrollContent}
            style={s.scrollView}
          >
            {/* 1. All Accounts / Net Worth Pill */}
            <Pressable
              onPress={handleManage}
              style={({ pressed }) => [
                s.pill,
                {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#F1F5F9',
                  borderColor: colors.brand.primary + '35',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              <View style={[s.allIconWrap, { backgroundColor: colors.brand.primary + '18' }]}>
                <Ionicons name="layers-outline" size={13} color={colors.brand.primary} />
              </View>
              <View style={s.pillTextWrap}>
                <AppText style={[s.pillLabel, { color: colors.text.secondary }]}>All</AppText>
                <AppText style={[s.pillBalance, { color: colors.text.primary }]}>
                  {symbol}{totalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </AppText>
              </View>
            </Pressable>

        {/* 2. Individual Account Pills */}
        {accounts.map((acc) => {
          const accColor = acc.color || colors.brand.primary;
          return (
            <Pressable
              key={acc.id}
              onPress={() => handleAccountPress(acc)}
              style={({ pressed }) => [
                s.pill,
                {
                  backgroundColor: pillBg,
                  borderColor: accColor + '38',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              {/* Account Color Icon Avatar */}
              <View style={[s.accIconWrap, { backgroundColor: accColor + '18' }]}>
                <Ionicons
                  name={(acc.icon as any) || 'card-outline'}
                  size={14}
                  color={accColor}
                />
              </View>

              <View style={s.pillTextWrap}>
                <View style={s.nameRow}>
                  <AppText style={[s.pillLabel, { color: colors.text.primary }]} numberOfLines={1}>
                    {acc.name}
                  </AppText>
                  {acc.isDefault && (
                    <Ionicons name="star" size={10} color="#F59E0B" style={{ marginLeft: 2 }} />
                  )}
                </View>
                <AppText style={[s.pillBalance, { color: colors.text.secondary }]}>
                  {symbol}{acc.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </AppText>
              </View>
            </Pressable>
          );
        })}

        {/* 3. Quick "+ Add Account" Button */}
        <Pressable
          onPress={handleNewAccount}
          style={({ pressed }) => [
            s.addPill,
            {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
              borderColor: colors.brand.primary + '45',
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="add" size={16} color={colors.brand.primary} />
          <AppText style={[s.addPillText, { color: colors.brand.primary }]}>
            New
          </AppText>
        </Pressable>
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    marginTop: Spacing['2'],
    marginBottom: Spacing['1'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['2'],
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  titleText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Radius.full,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
    includeFontPadding: false,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  manageText: {
    fontSize: 12.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
  scrollView: {
    marginHorizontal: -Spacing['5'],
  },
  scrollContent: {
    paddingHorizontal: Spacing['5'],
    gap: 8,
    alignItems: 'center',
    paddingVertical: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    minHeight: 38,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  allIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillTextWrap: {
    gap: 0.5,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 100,
  },
  pillLabel: {
    fontSize: 11,
    fontWeight: '700',
    includeFontPadding: false,
  },
  pillBalance: {
    fontSize: 10.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
  addPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderStyle: 'dashed',
    minHeight: 38,
  },
  addPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
