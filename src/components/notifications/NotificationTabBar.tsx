/**
 * @file NotificationTabBar.tsx
 * @architecture Presentation Layer — UI Component
 * @description Segmented sliding-pill tab bar for switching between Inbox and Reminders.
 * @associatedFiles src/app/notifications.tsx
 */

import React, { memo, useState, useEffect } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { triggerAppHaptic } from '@/services/hapticsService';
import type { NotificationTab } from '@features/notifications/hooks/useNotificationsScreen';

const TAB_H = 50;

const TABS: { id: NotificationTab; label: string; activeIcon: keyof typeof Ionicons.glyphMap; inactiveIcon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'inbox',     label: 'Inbox',     activeIcon: 'mail',  inactiveIcon: 'mail-outline'  },
  { id: 'reminders', label: 'Reminders', activeIcon: 'alarm', inactiveIcon: 'alarm-outline' },
];

export interface NotificationTabBarProps {
  activeTab: NotificationTab;
  onTabChange: (tab: NotificationTab) => void;
  unreadCount: number;
}

export const NotificationTabBar = memo(function NotificationTabBar({
  activeTab,
  onTabChange,
  unreadCount,
}: NotificationTabBarProps) {
  const { colors, isDark } = useTheme();
  const [barW, setBarW] = useState(320);
  const pillX = useSharedValue(0);

  const card = isDark ? colors.background.secondary : colors.background.card;

  useEffect(() => {
    const to = activeTab === 'inbox' ? 0 : (barW - 8) / 2;
    pillX.value = withSpring(to, { damping: 24, stiffness: 280, mass: 0.8 });
  }, [activeTab, barW, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
  }));

  const handleSelect = (tab: NotificationTab) => {
    if (tab !== activeTab) {
      triggerAppHaptic('selection', 'button');
      onTabChange(tab);
    }
  };

  return (
    <View
      style={[s.tabBar, { backgroundColor: colors.glass.backgroundMid }]}
      onLayout={(e) => setBarW(e.nativeEvent.layout.width)}
    >
      {/* Sliding animated indicator pill */}
      <Animated.View
        style={[
          s.slidingPill,
          pillStyle,
          {
            width: (barW - 8) / 2,
            backgroundColor: card,
            ...Platform.select({
              ios: { shadowColor: colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
              android: { elevation: 3 },
            }),
          },
        ]}
      />

      {/* Tabs */}
      {TABS.map(({ id, label, activeIcon, inactiveIcon }) => {
        const isActive = activeTab === id;
        return (
          <Pressable
            key={id}
            onPress={() => handleSelect(id)}
            style={s.tabItem}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Ionicons
              name={isActive ? activeIcon : inactiveIcon}
              size={16}
              color={isActive ? colors.text.primary : colors.text.tertiary}
            />
            <AppText
              variant="labelMD"
              style={{
                color: isActive ? colors.text.primary : colors.text.tertiary,
                fontWeight: isActive ? '800' : '500',
              }}
            >
              {label}
            </AppText>
            {id === 'inbox' && unreadCount > 0 && (
              <View style={[s.badge, { backgroundColor: colors.status.expense }]}>
                <AppText style={[s.badgeText, { color: colors.white }]}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </AppText>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
});

const s = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 4,
    height: TAB_H,
    position: 'relative',
    alignItems: 'center',
  },
  slidingPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    height: TAB_H - 8,
    borderRadius: 12,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    zIndex: 1,
    height: TAB_H - 8,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 11,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
