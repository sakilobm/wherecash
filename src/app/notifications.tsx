/**
 * @file notifications.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Notifications & Reminders Screen. Pure declarative orchestrator:
 *   reads a single contract from useNotificationsScreen and renders extracted components.
 *   Controls moved to Settings/Profile for clean, clutter-free activity inbox.
 * @associatedFiles src/features/notifications/hooks/useNotificationsScreen.ts,
 *   src/components/notifications/
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { NotificationHeader } from '@components/notifications/NotificationHeader';
import { NotificationTabBar } from '@components/notifications/NotificationTabBar';
import { NotificationCard } from '@components/notifications/NotificationCard';
import { ReminderCard } from '@components/notifications/ReminderCard';
import { NotificationEmptyState } from '@components/notifications/NotificationEmptyState';
import { ReminderPermissionBanner } from '@components/notifications/ReminderPermissionBanner';
import { ReminderFAB } from '@components/notifications/ReminderFAB';
import { AddReminderSheet } from '@components/notifications/AddReminderSheet';
import { useNotificationsScreen } from '@features/notifications/hooks/useNotificationsScreen';

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
  const screen = useNotificationsScreen();

  const bg = isDark ? colors.background.primary : colors.background.tertiary;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }]} edges={['top']}>
      {/* ── Header ── */}
      <NotificationHeader
        unreadCount={screen.unreadCount}
        activeTab={screen.activeTab}
        hasNotifications={screen.notifications.length > 0}
        onBack={() => router.back()}
        onMarkAllRead={screen.handlers.markAllRead}
        onOpenSettings={() => router.push('/profile')}
      />

      {/* ── Sliding Tab Bar ── */}
      <NotificationTabBar
        activeTab={screen.activeTab}
        onTabChange={screen.setActiveTab}
        unreadCount={screen.unreadCount}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ────────── INBOX ────────── */}
        {screen.activeTab === 'inbox' && (
          <>
            {screen.notifications.length > 0 && (
              <Animated.View entering={FadeInDown.springify().damping(22)} style={s.clearRow}>
                <AppText variant="caption" color={colors.text.tertiary}>
                  {screen.notifications.length} notification{screen.notifications.length !== 1 ? 's' : ''}
                </AppText>
                <Pressable onPress={screen.handlers.clearAll} hitSlop={8}>
                  <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '700' }}>
                    Clear All
                  </AppText>
                </Pressable>
              </Animated.View>
            )}

            {screen.notifications.length === 0 ? (
              <NotificationEmptyState type="inbox" />
            ) : (
              <View>
                {screen.notifications.map((n, i) => (
                  <NotificationCard
                    key={n.id}
                    notification={n}
                    index={i}
                    onPress={() => screen.handlers.markRead(n.id)}
                    onDelete={() => screen.handlers.delete(n.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* ────────── REMINDERS ────────── */}
        {screen.activeTab === 'reminders' && (
          <>
            {!screen.hasPermission && <ReminderPermissionBanner />}

            {screen.reminders.length === 0 ? (
              <NotificationEmptyState type="reminders" />
            ) : (
              <View>
                {screen.reminders.map((r, i) => (
                  <ReminderCard
                    key={r.id}
                    reminder={r}
                    index={i}
                    onToggle={() => screen.handlers.toggleReminder(r.id)}
                    onDelete={() => screen.handlers.deleteReminder(r.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Add Reminder FAB ── */}
      {screen.activeTab === 'reminders' && (
        <ReminderFAB onPress={screen.openAddSheet} />
      )}

      {/* ── Add Reminder Bottom Sheet ── */}
      <AddReminderSheet
        visible={screen.addSheetVisible}
        onClose={screen.closeAddSheet}
        onSave={screen.handlers.addReminder}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 108,
  },
  clearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 8,
    marginTop: 4,
  },
});
