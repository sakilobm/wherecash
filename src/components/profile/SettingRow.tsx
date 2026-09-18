import React, { type ComponentProps } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon:       IoniconName;
  iconColor:  string;
  label:      string;
  subtitle?:  string;
  onPress?:   () => void;
  right?:     React.ReactNode;
  isLast?:    boolean;
  animDelay?: number;
}

export const SettingRow = React.memo(function SettingRow({ icon, iconColor, label, subtitle, onPress, right, isLast, animDelay = 0 }: Props) {
  const { colors, isDark } = useTheme();
  const scale = useSharedValue(1);
  const rowAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconBg     = iconColor + (isDark ? '28' : '1A');
  const iconBorder = iconColor + '30';

  return (
    <Animated.View
      style={[
        rowAnim,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <Pressable
        onPress={() => { if (onPress) { Haptics.selectionAsync(); onPress(); } }}
        onPressIn={() => { if (onPress) scale.value = withSpring(0.970, { damping: 16, stiffness: 300 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 16, stiffness: 300 }); }}
        style={s.row}
      >
        {/* Icon badge */}
        <View style={[s.iconBox, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>

        {/* Text */}
        <View style={s.body}>
          <AppText variant="labelLG" color={colors.text.primary} style={s.label}>
            {label}
          </AppText>
          {subtitle && (
            <AppText variant="caption" color={colors.text.tertiary} style={s.subtitle}>
              {subtitle}
            </AppText>
          )}
        </View>

        {/* Right slot */}
        {right !== undefined ? right : onPress ? (
          <View style={[s.chevronWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.text.tertiary} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing['3'],
    paddingVertical: Spacing['4'] + 2, paddingHorizontal: Spacing['4'],
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, borderWidth: 1,
  },
  body: { flex: 1, gap: 2 },
  label: { fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { fontSize: 12, marginTop: 1 },
  chevronWrap: {
    width: 26, height: 26, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
