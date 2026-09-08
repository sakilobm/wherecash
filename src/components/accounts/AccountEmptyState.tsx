/**
 * @file AccountEmptyState.tsx
 * @architecture Presentation Layer — Atomic Feature Component
 * @description Educational starter state shown when a user has no accounts configured.
 *   Explains the concept and use cases of accounts in personal finance tracking,
 *   and offers 1-tap quick start presets (Bank, Cash, Credit Card) alongside a custom creation button.
 * @associatedFiles src/app/accounts.tsx, src/features/accounts/hooks/useAccountsScreen.ts
 */

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppText } from '@components/AppText';
import { Radius } from '@constants/Dimensions';
import { useTheme } from '@hooks/useTheme';
import type { AccountFormState } from '@features/accounts/hooks/useAccountsScreen';

interface PresetOption {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  preset: Partial<AccountFormState>;
}

const PRESET_ACCOUNTS: PresetOption[] = [
  {
    id: 'checking',
    title: 'Bank Account',
    subtitle: 'For salary deposits, transfers, and daily spending',
    icon: 'business-outline',
    preset: {
      name: 'Main Bank Account',
      type: 'checking',
      color: '#6366F1',
      icon: 'business-outline',
    },
  },
  {
    id: 'cash',
    title: 'Cash Wallet',
    subtitle: 'For physical paper money and petty expenses in hand',
    icon: 'cash-outline',
    preset: {
      name: 'Cash in Hand',
      type: 'cash',
      color: '#10B981',
      icon: 'cash-outline',
    },
  },
  {
    id: 'credit',
    title: 'Credit Card',
    subtitle: 'Track your credit card dues, limits, and monthly statements',
    icon: 'card-outline',
    preset: {
      name: 'Credit Card',
      type: 'credit',
      color: '#EF4444',
      icon: 'card-outline',
    },
  },
];

interface Props {
  onAdd: (preset?: Partial<AccountFormState>) => void;
}

export const AccountEmptyState: React.FC<Props> = ({ onAdd }) => {
  const { colors, isDark } = useTheme();

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      {/* ── Main Educational Card ── */}
      <View
        style={[
          styles.heroCard,
          {
            backgroundColor: isDark ? colors.background.card : colors.background.secondary,
            borderColor: colors.glass.border,
          },
        ]}
      >
        <View style={[styles.iconOrb, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : 'rgba(99, 102, 241, 0.1)' }]}>
          <Ionicons name="wallet-outline" size={32} color={colors.brand.primary} />
        </View>

        <AppText variant="headingMD" style={[styles.title, { color: colors.text.primary }]}>
          Track Where Your Money Lives
        </AppText>

        <AppText style={[styles.description, { color: colors.text.secondary }]}>
          Accounts represent your real-world money storage (such as banks, cash in your wallet, or credit cards). Every transaction connects to an account so your Net Worth stays accurate.
        </AppText>

        {/* Primary Action Button */}
        <Pressable
          onPress={() => onAdd()}
          style={({ pressed }) => [
            styles.primaryButton,
            { backgroundColor: colors.brand.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
          <AppText style={styles.primaryButtonText}>Create First Account</AppText>
        </Pressable>
      </View>

      {/* ── Quick Presets Header ── */}
      <Animated.View entering={FadeInDown.delay(150).duration(350)} style={styles.presetsSection}>
        <AppText variant="caption" style={[styles.presetsLabel, { color: colors.text.tertiary }]}>
          OR QUICK START WITH A POPULAR PRESET
        </AppText>

        <View style={styles.presetList}>
          {PRESET_ACCOUNTS.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => onAdd(item.preset)}
              style={({ pressed }) => [
                styles.presetItem,
                {
                  backgroundColor: isDark ? colors.background.card : colors.background.primary,
                  borderColor: colors.glass.border,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.presetIconWrap,
                  { backgroundColor: item.preset.color ? item.preset.color + '1A' : colors.brand.primary + '1A' },
                ]}
              >
                <Ionicons name={item.icon} size={20} color={item.preset.color || colors.brand.primary} />
              </View>

              <View style={styles.presetInfo}>
                <AppText style={[styles.presetTitle, { color: colors.text.primary }]}>
                  {item.title}
                </AppText>
                <AppText style={[styles.presetSubtitle, { color: colors.text.tertiary }]}>
                  {item.subtitle}
                </AppText>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
            </Pressable>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 20,
  },
  heroCard: {
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    textAlign: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 3,
      },
    }),
  },
  iconOrb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    includeFontPadding: false,
  },
  description: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 48,
    borderRadius: Radius.lg,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
  },
  presetsSection: {
    gap: 10,
  },
  presetsLabel: {
    letterSpacing: 1,
    paddingHorizontal: 4,
    fontWeight: '600',
  },
  presetList: {
    gap: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 12,
  },
  presetIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetInfo: {
    flex: 1,
    gap: 2,
  },
  presetTitle: {
    fontSize: 14,
    fontWeight: '700',
    includeFontPadding: false,
  },
  presetSubtitle: {
    fontSize: 11,
    lineHeight: 15,
  },
});
