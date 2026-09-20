/**
 * @file ReminderFAB.tsx
 * @architecture Presentation Layer — UI Component
 * @description Floating Action Button for scheduling new reminders.
 * @associatedFiles src/app/notifications.tsx
 */

import React, { memo } from 'react';
import { StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { triggerAppHaptic } from '@/services/hapticsService';

export interface ReminderFABProps {
  onPress: () => void;
}

export const ReminderFAB = memo(function ReminderFAB({ onPress }: ReminderFABProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    triggerAppHaptic('medium', 'button');
    onPress();
  };

  return (
    <Animated.View entering={FadeInDown.springify().damping(22)} style={s.fab}>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [s.fabBtn, { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        accessibilityRole="button"
        accessibilityLabel="Add finance reminder"
      >
        <LinearGradient
          colors={colors.gradients.purpleViolet as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.fabGrad}
        >
          <Ionicons name="add" size={22} color={colors.white} />
          <AppText style={[s.fabLabel, { color: colors.white }]}>Add Reminder</AppText>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 28,
    left: 16,
    right: 16,
  },
  fabBtn: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  fabGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 58,
  },
  fabLabel: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
