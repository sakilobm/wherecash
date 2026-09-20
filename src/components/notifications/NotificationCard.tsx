import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import type { ComponentProps } from 'react';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { format, isToday, isYesterday, formatDistanceToNowStrict } from 'date-fns';
import type { AppNotification, NotificationType } from '@store/notificationStore';
import type { AppTheme } from '@constants/themes';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TYPE_ICON: Record<NotificationType, IoniconName> = {
  budget_exceeded: 'alert-circle',
  budget_warning:  'warning',
  payment_due:     'calendar',
  reminder:        'alarm',
  system:          'information-circle',
};

const TYPE_COLOR: Record<NotificationType, (c: AppTheme) => string> = {
  budget_exceeded: (c) => c.status.expense,
  budget_warning:  (c) => c.status.warning,
  payment_due:     (c) => c.status.info,
  reminder:        (c) => c.status.savings,
  system:          (c) => c.text.secondary,
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d))     return formatDistanceToNowStrict(d, { addSuffix: true });
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d');
}

interface Props {
  notification: AppNotification;
  index:        number;
  onPress:      () => void;
  onDelete:     () => void;
}

export const NotificationCard = memo(function NotificationCard({ notification, index, onPress, onDelete }: Props) {
  const { colors } = useTheme();
  const metaIcon  = TYPE_ICON[notification.type];
  const metaColor = TYPE_COLOR[notification.type](colors);
  const isRead    = notification.isRead;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(140).delay(index * 40)}
      exiting={FadeOutLeft.duration(200)}
      style={[
        s.card,
        {
          backgroundColor: colors.surface.sheet,
          borderColor:     colors.glass.background,
        },
        !isRead && Platform.select({
          ios:     { shadowColor: metaColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
          android: { elevation: 3 },
        }),
        isRead && Platform.select({
          ios:     { shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
          android: { elevation: 1 },
        }),
      ]}
    >
      {/* Unread left accent bar */}
      {!isRead && (
        <View style={[s.accentBar, { backgroundColor: metaColor }]} />
      )}

      <Pressable onPress={onPress} style={[s.pressable, !isRead && { paddingLeft: 16 }]}>
        {/* Icon circle */}
        <View style={[s.iconCircle, { backgroundColor: metaColor + (isRead ? '12' : '1E') }]}>
          <Ionicons name={metaIcon} size={22} color={metaColor} style={isRead ? { opacity: 0.7 } : undefined} />
        </View>

        {/* Content */}
        <View style={s.content}>
          <View style={s.titleRow}>
            <AppText
              variant="labelMD"
              color={isRead ? colors.text.secondary : colors.text.primary}
              style={[s.titleText, !isRead && { fontWeight: '700' }]}
              numberOfLines={1}
            >
              {notification.title}
            </AppText>
            {!isRead && (
              <View style={[s.unreadDot, { backgroundColor: metaColor }]} />
            )}
          </View>

          <AppText
            variant="bodyMD"
            color={isRead ? colors.text.tertiary : colors.text.secondary}
            numberOfLines={2}
            style={s.bodyText}
          >
            {notification.body}
          </AppText>

          <AppText variant="caption" color={colors.text.tertiary} style={s.time}>
            {relativeTime(notification.createdAt)}
          </AppText>
        </View>
      </Pressable>

      {/* Delete button */}
      <Pressable onPress={onDelete} style={s.deleteBtn} hitSlop={10}>
        <View style={[s.deleteCircle, { backgroundColor: colors.glass.background }]}>
          <Ionicons name="trash-outline" size={15} color={colors.text.tertiary} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  card: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   18,
    borderWidth:    1,
    marginHorizontal: 16,
    marginVertical:   4,
    overflow:       'hidden',
  },
  accentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
  },
  pressable:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, paddingLeft: 14, gap: 13 },
  iconCircle: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  content:   { flex: 1, gap: 3 },
  titleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleText: { flex: 1, fontSize: 14, letterSpacing: -0.1 },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  bodyText:  { fontSize: 13, lineHeight: 18 },
  time:      { fontSize: 11, marginTop: 1 },
  deleteBtn: { paddingHorizontal: 12, paddingVertical: 18 },
  deleteCircle: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
