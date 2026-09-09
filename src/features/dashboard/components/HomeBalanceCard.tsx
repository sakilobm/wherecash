/**
 * @file HomeBalanceCard.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Modernized luxury available balance card for the Home dashboard.
 *   Features lush emerald/mint gradient, privacy toggle, account switcher, and
 *   month net savings pulse. Completely eliminates fake card expiry/numbers.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { usePreferencesStore } from '@store/preferencesStore';
import { Radius, Spacing } from '@constants/index';

interface HomeBalanceCardProps {
  totalBalance: number;
  currency: string;
  symbol: string;
  isLoading: boolean;
  netSavings: number;
  onManagePress?: () => void;
}

export const HomeBalanceCard = memo(function HomeBalanceCard({
  totalBalance,
  currency,
  symbol,
  isLoading,
  netSavings,
  onManagePress,
}: HomeBalanceCardProps) {
  const { isDark, colors } = useTheme();
  const hideBalance = usePreferencesStore((s) => s.hideBalance);
  const toggleHideBalance = usePreferencesStore((s) => s.toggleHideBalance);

  const handleTogglePrivacy = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleHideBalance();
  };

  const formattedBalance = totalBalance.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const isNetPositive = netSavings >= 0;

  return (
    <View style={s.cardOuter}>
      {/* Background Emerald / Mint Mesh Gradient */}
      <LinearGradient
        colors={
          isDark
            ? ['#0D3828', '#104936', '#0B291E']
            : ['#34D399', '#10B981', '#059669']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Glassmorphic frosted tint layer */}
      <BlurView
        intensity={isDark ? 20 : 15}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />

      {/* Soft decorative ambient glow circles */}
      <View style={[s.ambientGlowTop, { backgroundColor: isDark ? 'rgba(52, 211, 153, 0.25)' : 'rgba(255, 255, 255, 0.3)' }]} />
      <View style={[s.ambientGlowBottom, { backgroundColor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.2)' }]} />

      <View style={s.content}>
        {/* Top row: Label + Privacy eye + Currency chip */}
        <View style={s.topRow}>
          <View style={s.labelGroup}>
            <AppText style={s.availableLabel}>Available Balance</AppText>
            <Pressable
              onPress={handleTogglePrivacy}
              hitSlop={10}
              style={({ pressed }) => [s.eyeBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Ionicons
                name={hideBalance ? 'eye-off-outline' : 'eye-outline'}
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          <View style={s.currencyChip}>
            <AppText style={s.currencyText}>{currency}</AppText>
          </View>
        </View>

        {/* Middle row: Big Balance display */}
        <View style={s.balanceSection}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" style={{ marginVertical: 8 }} />
          ) : hideBalance ? (
            <AppText variant="numeric" style={s.balanceHidden}>••••••••</AppText>
          ) : (
            <AppText variant="numeric" style={s.balanceAmount} numberOfLines={1} adjustsFontSizeToFit>
              {symbol}{formattedBalance}
            </AppText>
          )}
        </View>

        {/* Bottom row: Net savings pulse & Quick Manage indicator */}
        <View style={s.bottomRow}>
          <View style={s.savingsBadge}>
            <Ionicons
              name={isNetPositive ? 'trending-up-outline' : 'trending-down-outline'}
              size={12}
              color="#FFFFFF"
            />
            <AppText style={s.savingsText}>
              {hideBalance
                ? 'Protected'
                : `${isNetPositive ? '+' : '-'}${symbol}${Math.abs(netSavings).toLocaleString('en-US', { maximumFractionDigits: 0 })} this month`}
            </AppText>
          </View>

          {onManagePress && (
            <Pressable
              onPress={onManagePress}
              hitSlop={8}
              style={({ pressed }) => [s.manageChip, { opacity: pressed ? 0.75 : 1 }]}
            >
              <AppText style={s.manageChipText}>Accounts</AppText>
              <Ionicons name="chevron-forward" size={11} color="#FFFFFF" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  cardOuter: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    marginTop: Spacing['3'],
    marginBottom: Spacing['4'],
    minHeight: 168,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing['5'],
    paddingVertical: Spacing['4'],
    justifyContent: 'space-between',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  availableLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.88)',
  },
  eyeBtn: {
    padding: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  currencyChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  balanceSection: {
    marginVertical: Spacing['2'],
    overflow: 'visible',
    justifyContent: 'center',
  },
  balanceAmount: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: Platform.OS === 'android' ? 44 : 42,
    paddingVertical: 4,
    letterSpacing: Platform.OS === 'android' ? 0 : -0.5,
    includeFontPadding: false,
  },
  balanceHidden: {
    fontSize: 26,
    fontWeight: '800',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 4,
    paddingVertical: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  savingsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  manageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  manageChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
