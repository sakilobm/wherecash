/**
 * @file NotificationHeader.tsx
 * @architecture Presentation Layer — UI Component
 * @description Header for the Notifications screen. Displays back navigation, title,
 *   unread message counter, "Mark read" batch action, and settings shortcut.
 * @associatedFiles src/app/notifications.tsx
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { triggerAppHaptic } from '@/services/hapticsService';

export interface NotificationHeaderProps {
  unreadCount: number;
  activeTab: 'inbox' | 'reminders';
  hasNotifications: boolean;
  onBack: () => void;
  onMarkAllRead: () => void;
  onOpenSettings?: () => void;
}

export const NotificationHeader = memo(function NotificationHeader({
  unreadCount,
  activeTab,
  hasNotifications,
  onBack,
  onMarkAllRead,
  onOpenSettings,
}: NotificationHeaderProps) {
  const { colors } = useTheme();

  const handleBack = () => {
    triggerAppHaptic('light', 'button');
    onBack();
  };

  const handleSettings = () => {
    triggerAppHaptic('light', 'button');
    onOpenSettings?.();
  };

  return (
    <View style={s.header}>
      {/* Back button */}
      <Pressable
        onPress={handleBack}
        style={({ pressed }) => [
          s.iconBtn,
          {
            backgroundColor: colors.glass.backgroundMid,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="arrow-back" size={20} color={colors.text.primary} />
      </Pressable>

      {/* Header title & subtitle */}
      <View style={s.headerText}>
        <AppText variant="headingSM" color={colors.text.primary} style={s.headerTitle}>
          Notifications
        </AppText>
        {unreadCount > 0 && activeTab === 'inbox' && (
          <AppText variant="caption" color={colors.text.tertiary}>
            {unreadCount} unread message{unreadCount !== 1 ? 's' : ''}
          </AppText>
        )}
      </View>

      {/* Actions */}
      <View style={s.actionsRow}>
        {activeTab === 'inbox' && unreadCount > 0 && (
          <Pressable
            onPress={onMarkAllRead}
            style={({ pressed }) => [
              s.markAllBtn,
              {
                backgroundColor: colors.brand.accent + '16',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            hitSlop={8}
            accessibilityLabel="Mark all notifications as read"
            accessibilityRole="button"
          >
            <AppText variant="labelSM" color={colors.brand.accent} style={s.markAllText}>
              Mark read
            </AppText>
          </Pressable>
        )}

        {/* Settings gear shortcut */}
        {Boolean(onOpenSettings) && (
          <Pressable
            onPress={handleSettings}
            style={({ pressed }) => [
              s.iconBtn,
              {
                backgroundColor: colors.glass.backgroundMid,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
            accessibilityLabel="Notification settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={18} color={colors.text.secondary} />
          </Pressable>
        )}
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.4,
    fontSize: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  markAllText: {
    fontWeight: '700',
  },
});
