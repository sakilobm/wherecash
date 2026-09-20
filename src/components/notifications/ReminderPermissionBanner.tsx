/**
 * @file ReminderPermissionBanner.tsx
 * @architecture Presentation Layer — UI Component
 * @description In-app banner alerting users when device notification permissions are disabled.
 * @associatedFiles src/app/notifications.tsx
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';

export const ReminderPermissionBanner = memo(function ReminderPermissionBanner() {
  const { colors } = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).delay(60)}
      style={[s.permBanner, { borderColor: colors.status.warning + '50' }]}
    >
      <LinearGradient
        colors={[colors.status.warning + '1A', colors.brand.accentWarm + '0D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[s.permIcon, { backgroundColor: colors.status.warning + '20' }]}>
        <Ionicons name="warning-outline" size={18} color={colors.status.warning} />
      </View>
      <AppText variant="bodySM" color={colors.text.secondary} style={s.permText}>
        Enable notifications to receive scheduled reminders
      </AppText>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    overflow: 'hidden',
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  permText: {
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
});
