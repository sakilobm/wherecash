import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Switch, Platform } from 'react-native';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import type { NotificationReminder, RepeatInterval } from '@store/notificationStore';

const REPEAT_LABEL: Record<RepeatInterval, string> = {
  none:    'Once',
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
};

const REPEAT_ICON: Record<RepeatInterval, string> = {
  none:    'radio-button-on-outline',
  daily:   'repeat-outline',
  weekly:  'calendar-outline',
  monthly: 'refresh-circle-outline',
};

function fmt24to12(time: string): string {
  const [hStr, mStr] = time.split(':');
  const h     = parseInt(hStr, 10);
  const m     = parseInt(mStr, 10);
  const ampm  = h >= 12 ? 'PM' : 'AM';
  const h12   = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

interface Props {
  reminder: NotificationReminder;
  index:    number;
  onToggle: () => void;
  onDelete: () => void;
}

export const ReminderCard = memo(function ReminderCard({ reminder, index, onToggle, onDelete }: Props) {
  const { colors } = useTheme();
  const accent = colors.status.savings;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(22).stiffness(140).delay(index * 40)}
      exiting={FadeOutLeft.duration(200)}
      style={[
        s.card,
        {
          backgroundColor: colors.surface.sheet,
          borderColor:     colors.glass.background,
          opacity:         reminder.isActive ? 1 : 0.52,
        },
        reminder.isActive
          ? Platform.select({
              ios:     { shadowColor: accent, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 10 },
              android: { elevation: 3 },
            })
          : Platform.select({
              ios:     { shadowColor: colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 },
              android: { elevation: 1 },
            }),
      ]}
    >
      {/* Active accent bar */}
      {reminder.isActive && (
        <View style={[s.accentBar, { backgroundColor: accent }]} />
      )}

      {/* Left: icon + status dot */}
      <View style={s.iconWrap}>
        <View style={[s.iconCircle, { backgroundColor: accent + (reminder.isActive ? '1E' : '10') }]}>
          <Ionicons name="alarm" size={22} color={accent} />
        </View>
        <View
          style={[
            s.statusDot,
            { backgroundColor: reminder.isActive ? colors.status.income : colors.text.tertiary },
          ]}
        />
      </View>

      {/* Content */}
      <View style={s.content}>
        <AppText
          variant="labelMD"
          color={reminder.isActive ? colors.text.primary : colors.text.secondary}
          numberOfLines={1}
          style={{ fontWeight: reminder.isActive ? '700' : '500', fontSize: 14 }}
        >
          {reminder.title}
        </AppText>

        {reminder.body ? (
          <AppText variant="caption" color={colors.text.tertiary} numberOfLines={1} style={{ marginTop: 1 }}>
            {reminder.body}
          </AppText>
        ) : null}

        <View style={s.metaRow}>
          {/* Time badge */}
          <View style={[s.timeBadge, { backgroundColor: accent + '15' }]}>
            <Ionicons name="time-outline" size={11} color={accent} />
            <AppText style={[s.timeText, { color: accent }]}>
              {fmt24to12(reminder.time)}
            </AppText>
          </View>

          {/* Repeat badge */}
          <View style={[s.repeatBadge, { backgroundColor: colors.glass.background }]}>
            <Ionicons name={REPEAT_ICON[reminder.repeat] as any} size={10} color={colors.text.tertiary} />
            <AppText variant="caption" color={colors.text.tertiary} style={{ fontWeight: '500' }}>
              {REPEAT_LABEL[reminder.repeat]}
            </AppText>
          </View>
        </View>
      </View>

      {/* Controls */}
      <View style={s.controls}>
        <Switch
          value={reminder.isActive}
          onValueChange={onToggle}
          trackColor={{
            false: colors.glass.backgroundStrong,
            true:  accent + '55',
          }}
          thumbColor={reminder.isActive ? accent : colors.text.tertiary}
          ios_backgroundColor={colors.glass.backgroundStrong}
          style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
        />
        <Pressable onPress={onDelete} hitSlop={10}>
          <View style={[s.deleteCircle, { backgroundColor: colors.glass.background }]}>
            <Ionicons name="trash-outline" size={14} color={colors.text.tertiary} />
          </View>
        </Pressable>
      </View>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             12,
    borderRadius:    18,
    borderWidth:     1,
    marginHorizontal: 16,
    marginVertical:   4,
    padding:          14,
    overflow:         'hidden',
  },
  accentBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
  },
  iconWrap: { position: 'relative', flexShrink: 0 },
  iconCircle: {
    width: 48, height: 48, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute', bottom: 0, right: 0,
    width: 10, height: 10, borderRadius: 5,
  },
  content: { flex: 1, gap: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  timeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7,
  },
  timeText: { fontSize: 11, fontWeight: '700' },
  repeatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7,
  },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },
  deleteCircle: {
    width: 30, height: 30, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});
