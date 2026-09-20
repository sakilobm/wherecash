import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from './AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  icon?: IoniconName;
  layout?: 'auto' | 'row' | 'column';
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  danger = false,
  icon,
  layout = 'auto',
}: ConfirmModalProps) {
  const { colors, isDark } = useTheme();

  const isLongText =
    confirmLabel.length > 10 ||
    cancelLabel.length > 10 ||
    confirmLabel.length + cancelLabel.length > 18;
  const isStacked = layout === 'column' || (layout !== 'row' && isLongText);

  const scale = useSharedValue(0.82);
  const opacity = useSharedValue(0);
  const dimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      dimOpacity.value = withTiming(1, { duration: 220 });
      opacity.value = withTiming(1, { duration: 200 });
      scale.value = withSpring(1, { damping: 20, stiffness: 260, mass: 0.8 });
    } else {
      dimOpacity.value = withTiming(0, { duration: 180 });
      opacity.value = withTiming(0, { duration: 160 });
      scale.value = withTiming(0.88, { duration: 180 });
    }
  }, [visible]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  const accentColor = danger ? colors.status.expense : colors.brand.primary;
  const confirmTextColor = danger ? colors.white : (colors.brand.onPrimary || '#0B0F19');
  const iconName: IoniconName = icon ?? (danger ? 'warning' : 'information-circle');
  const cardBg = colors.surface.sheet;

  if (!visible) return null;

  const renderCancelBtn = () => (
    <Pressable
      onPress={onCancel}
      style={({ pressed }) => [
        styles.btn,
        styles.cancelBtn,
        isStacked && styles.btnStacked,
        {
          backgroundColor: colors.glass.background,
          borderColor: colors.glass.backgroundMid,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <AppText
        variant="labelLG"
        color={colors.text.secondary}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ lineHeight: undefined, fontWeight: '600' }}
      >
        {cancelLabel}
      </AppText>
    </Pressable>
  );

  const renderConfirmBtn = () => (
    <Pressable
      onPress={() => {
        Haptics.notificationAsync(
          danger
            ? Haptics.NotificationFeedbackType.Warning
            : Haptics.NotificationFeedbackType.Success
        );
        onConfirm();
      }}
      style={({ pressed }) => [
        styles.btn,
        styles.confirmBtn,
        isStacked && styles.btnStacked,
        {
          backgroundColor: accentColor,
          opacity: pressed ? 0.82 : 1,
        },
      ]}
    >
      <AppText
        variant="labelLG"
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ color: confirmTextColor, fontWeight: '700', lineHeight: undefined }}
      >
        {confirmLabel}
      </AppText>
    </Pressable>
  );

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        {/* Blurred backdrop */}
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={isDark ? 30 : 18}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.medium }]} />
          <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        </Animated.View>

        {/* Card */}
        <Animated.View
          style={[
            styles.card,
            cardStyle,
            {
              backgroundColor: cardBg,
              borderColor: colors.glass.background,
              shadowColor: colors.black,
            },
          ]}
        >
          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: accentColor + '22' }]}>
            <Ionicons name={iconName} size={28} color={accentColor} />
          </View>

          {/* Title */}
          <AppText
            variant="headingSM"
            color={colors.text.primary}
            align="center"
            style={styles.title}
          >
            {title}
          </AppText>

          {/* Message */}
          {message && (
            <AppText
              variant="bodySM"
              color={colors.text.secondary}
              align="center"
              style={styles.message}
            >
              {message}
            </AppText>
          )}

          {/* Buttons */}
          <View style={[styles.btnContainer, isStacked ? styles.btnCol : styles.btnRow]}>
            {isStacked ? (
              <>
                {renderConfirmBtn()}
                {renderCancelBtn()}
              </>
            ) : (
              <>
                {renderCancelBtn()}
                {renderConfirmBtn()}
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  dimLayer: {},
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['3'],
    zIndex: 1,
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.22,
        shadowRadius: 32,
      },
      android: { elevation: 24 },
    }),
  },
  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['1'],
  },
  title: {
    fontWeight: '800',
    lineHeight: 26,
  },
  message: {
    lineHeight: 22,
    opacity: 0.85,
    marginBottom: Spacing['2'],
  },
  btnContainer: {
    width: '100%',
    marginTop: Spacing['2'],
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
  },
  btnCol: {
    flexDirection: 'column',
    gap: Spacing['2'],
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing['4'],
  },
  btnStacked: {
    flex: 0,
    width: '100%',
  },
  cancelBtn: {
    borderWidth: 1,
  },
  confirmBtn: {},
});
