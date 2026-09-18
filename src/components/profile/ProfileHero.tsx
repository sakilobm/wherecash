/**
 * @file ProfileHero.tsx
 * @architecture Presentation Layer — UI Component
 * @description Gradient hero card at the top of the Profile screen. Displays the
 *   user's avatar initials, full name, email, and stat badges (member since, tx count,
 *   currency). Tap the avatar to trigger name editing.
 * @associatedFiles src/app/(tabs)/profile.tsx, src/features/profile/hooks/useProfileScreen.ts
 */

import React, { useEffect, type ComponentProps } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { CURRENCY_SYMBOLS } from '@store/types';
import { Spacing, Radius } from '@constants/index';
import type { CurrencyCode } from '@store/types';
import { getAvatar } from '@constants/avatars';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  avatarId?: string;
  initials: string;
  fullName: string;
  email: string;
  memberSince: string;
  txCount: number;
  currency: CurrencyCode;
  onEditPress: () => void;
}

function useEntrance(delay: number) {
  const opacity = useSharedValue(0);
  const ty = useSharedValue(18);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 360 }));
    ty.value = withDelay(delay, withSpring(0, { damping: 22, stiffness: 200 }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));
}

export const ProfileHero = React.memo(function ProfileHero({ avatarId, initials, fullName, email, memberSince, txCount, currency, onEditPress }: Props) {
  const { colors, isDark } = useTheme();
  const anim = useEntrance(0);

  const avatar = getAvatar(avatarId);
  const gradient = colors.profileCard.gradient as unknown as [string, string];

  // Calculate spender tier details, icon, level, and progress
  let spenderTier = 'Budget Starter';
  let tierIcon: IoniconName = 'leaf-outline';
  let levelText = 'LVL 1 · ROOKIE';
  let progressText = '';
  let progressFraction = 0;

  if (txCount >= 50) {
    spenderTier = 'Wealth Builder';
    tierIcon = 'trophy-outline';
    levelText = 'LVL 3 · ELITE';
    progressText = 'Max level reached';
    progressFraction = 1.0;
  } else if (txCount >= 15) {
    spenderTier = 'Smart Spender';
    tierIcon = 'rocket-outline';
    levelText = 'LVL 2 · PRO';
    const currentProgress = txCount - 15;
    const targetProgress = 50 - 15;
    progressText = `${txCount}/50 txs to Elite`;
    progressFraction = Math.min(1.0, Math.max(0, currentProgress / targetProgress));
  } else {
    spenderTier = 'Budget Starter';
    tierIcon = 'wallet-outline';
    levelText = 'LVL 1 · ROOKIE';
    progressText = `${txCount}/15 txs to Pro`;
    progressFraction = Math.min(1.0, Math.max(0, txCount / 15));
  }

  const badges: { icon: IoniconName; label: string }[] = [
    { icon: 'calendar-outline', label: `Joined ${memberSince}` },
    { icon: 'swap-horizontal-outline', label: `${txCount} txs` },
    { icon: 'cash-outline', label: `${currency} (${CURRENCY_SYMBOLS[currency] || currency})` },
  ];

  return (
    <Animated.View style={[s.hero, { shadowColor: colors.black }, anim]}>
      {/* Background Gradient */}
      <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* Glowing Blob effects */}
      <View style={[s.blobTL, { backgroundColor: colors.profileCard.blobTL }]} />
      <View style={[s.blobBR, { backgroundColor: colors.profileCard.blobBR }]} />
      {/* Card Border */}
      <View style={[StyleSheet.absoluteFill, s.border, { borderColor: colors.profileCard.borderColor }]} pointerEvents="none" />

      <View style={s.inner}>
        {/* Top Section: Card Info and Level Tag */}
        <View style={s.headerRow}>
          <View style={s.logoContainer}>
            <Ionicons name="hardware-chip" size={20} color={colors.profileCard.nameColor} style={s.chipIcon} />
            <AppText variant="caption" style={[s.headerTitle, { color: colors.profileCard.nameColor, opacity: 0.8 }]}>
              WHEREKASH PASS
            </AppText>
          </View>
          <View
            style={[
              s.tierChip,
              {
                backgroundColor: colors.profileCard.proBg,
                borderColor:     colors.profileCard.proBorder,
              },
            ]}
          >
            <Ionicons name={tierIcon} size={11} color={colors.profileCard.proText} />
            <AppText style={[s.tierText, { color: colors.profileCard.proText }]}>
              {levelText}
            </AppText>
          </View>
        </View>

        {/* Middle Section: Avatar and User Details */}
        <View style={s.bodyRow}>
          <Pressable onPress={onEditPress} style={s.avatarWrap}>
            <LinearGradient
              colors={avatar.gradient}
              style={s.avatarCircle}
            >
              <AppText style={s.avatarEmoji}>{avatar.emoji}</AppText>
            </LinearGradient>
            <View style={[s.editBadge, { backgroundColor: isDark ? colors.brand.primary : colors.black }]}>
              <Ionicons name="pencil" size={8} color={colors.white} />
            </View>
          </Pressable>

          <View style={s.profileDetails}>
            <AppText variant="headingMD" style={[s.name, { color: colors.profileCard.nameColor }]} numberOfLines={1}>
              {fullName}
            </AppText>
            <AppText variant="caption" style={[s.email, { color: colors.profileCard.emailColor }]} numberOfLines={1}>
              {email || 'No email registered'}
            </AppText>
            <AppText style={[s.tierNameText, { color: colors.profileCard.proText }]}>
              {spenderTier}
            </AppText>
          </View>
        </View>

        {/* Progress Bar (Level Tracker) */}
        <View style={s.progressSection}>
          <View style={s.progressInfo}>
            <AppText variant="caption" style={[s.progressLabel, { color: colors.profileCard.emailColor }]}>
              Level Progress
            </AppText>
            <AppText variant="caption" style={[s.progressVal, { color: colors.profileCard.emailColor }]}>
              {progressText}
            </AppText>
          </View>
          <View style={[s.progressBarBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <View
              style={[
                s.progressBarFill,
                {
                  backgroundColor: colors.profileCard.proText,
                  width: `${progressFraction * 100}%`,
                },
              ]}
            />
          </View>
        </View>

        {/* Thin Glassmorphic Divider */}
        <View style={[s.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }]} />

        {/* Footer Row: Account Badges */}
        <View style={s.badges}>
          {badges.map((b) => (
            <View
              key={b.label}
              style={[
                s.badge,
                {
                  backgroundColor: colors.profileCard.badgeBg,
                  borderColor:     colors.profileCard.badgeBorder,
                  borderWidth:     StyleSheet.hairlineWidth,
                },
              ]}
            >
              <Ionicons name={b.icon} size={11} color={colors.profileCard.badgeText} />
              <AppText style={{ color: colors.profileCard.badgeText, fontSize: 10, fontWeight: '600' }}>
                {b.label}
              </AppText>
            </View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  hero: {
    borderRadius: Radius['2xl'],
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16 },
      android: { elevation: 6 },
    }),
  },
  border: { ...StyleSheet.absoluteFill, borderRadius: Radius['2xl'], borderWidth: 1 },
  blobTL: { position: 'absolute', top: -50, left: -40, width: 140, height: 140, borderRadius: 70 },
  blobBR: { position: 'absolute', bottom: -40, right: -30, width: 110, height: 110, borderRadius: 55 },
  inner: { 
    padding: Spacing['4'],
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipIcon: {
    transform: [{ rotate: '90deg' }],
  },
  headerTitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 8.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  avatarWrap: { 
    position: 'relative',
  },
  avatarCircle: {
    width: 58, 
    height: 58, 
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.25)',
  },
  avatarEmoji: { fontSize: 26, lineHeight: 32, textAlign: 'center' },
  editBadge: {
    position: 'absolute', 
    bottom: 0, 
    right: 0,
    width: 17, 
    height: 17, 
    borderRadius: 8.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5, 
    borderColor: 'rgba(255,255,255,0.9)',
  },
  profileDetails: {
    flex: 1,
    justifyContent: 'center',
    gap: 0.5,
  },
  name: { 
    fontWeight: '700', 
    letterSpacing: -0.3,
  },
  email: { 
    fontSize: 12,
    opacity: 0.8,
  },
  tierNameText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  progressSection: {
    gap: 3.5,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 8.5,
    fontWeight: '600',
    opacity: 0.85,
  },
  progressVal: {
    fontSize: 8.5,
    fontWeight: '700',
    opacity: 0.9,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  divider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
  },
  badges: { 
    flexDirection: 'row', 
    gap: Spacing['2'], 
    flexWrap: 'wrap', 
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    paddingHorizontal: 9, 
    paddingVertical: 4, 
    borderRadius: Radius.lg,
  },
});
