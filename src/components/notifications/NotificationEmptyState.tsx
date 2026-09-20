/**
 * @file NotificationEmptyState.tsx
 * @architecture Presentation Layer — UI Component
 * @description Standard hero empty state for the Notifications screen.
 *   Provides dedicated visual anatomy for both Inbox ("All caught up!") and Reminders ("No reminders yet").
 * @associatedFiles src/app/notifications.tsx
 */

import React, { memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing } from '@constants/index';

export interface NotificationEmptyStateProps {
  type: 'inbox' | 'reminders';
}

export const NotificationEmptyState = memo(function NotificationEmptyState({
  type,
}: NotificationEmptyStateProps) {
  const { colors } = useTheme();

  const isInbox = type === 'inbox';
  const accentHex = isInbox ? colors.brand.primary : colors.status.savings;
  const iconName = isInbox ? 'notifications-off-outline' : 'alarm-outline';
  const title = isInbox ? 'All caught up!' : 'No reminders yet';
  const subtitle = isInbox
    ? 'Budget alerts and payment reminders will show here.'
    : 'Tap the button below to schedule your first finance reminder.';

  return (
    <View style={s.root}>
      {/* ── Hero Anatomy ─── */}
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={s.heroWrap}>
        <View style={[s.outerRing, { borderColor: accentHex + '28' }]} />
        <LinearGradient
          colors={[accentHex, colors.brand.accent] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.iconCircle, { shadowColor: colors.black }]}
        >
          <Ionicons name={iconName} size={36} color={colors.white} />
        </LinearGradient>
        <View style={[s.badge, { backgroundColor: accentHex + '20' }]}>
          <Ionicons
            name={isInbox ? 'checkmark' : 'add'}
            size={16}
            color={accentHex}
          />
        </View>
      </Animated.View>

      {/* ── Text Block ─── */}
      <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140).delay(80)} style={s.textBlock}>
        <AppText variant="headingSM" color={colors.text.primary} align="center" style={{ fontWeight: '800' }}>
          {title}
        </AppText>
        <AppText variant="bodySM" color={colors.text.secondary} align="center" style={s.subtitle}>
          {subtitle}
        </AppText>
      </Animated.View>
    </View>
  );
});

const s = StyleSheet.create({
  root: {
    alignItems: 'center',
    paddingHorizontal: Spacing['6'],
    paddingTop: Spacing['8'],
    gap: Spacing['4'],
  },
  heroWrap: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  iconCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
      android: { elevation: 12 },
    }),
  },
  badge: {
    position: 'absolute',
    bottom: 14,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    gap: Spacing['2'],
  },
  subtitle: {
    maxWidth: 280,
    lineHeight: 20,
  },
});
