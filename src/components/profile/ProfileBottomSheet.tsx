/**
 * @file ProfileBottomSheet.tsx
 * @architecture Presentation Layer — Reusable UI Component
 * @description Content-adaptive, draggable animated bottom-sheet modal used by the Profile screen.
 *   Uses native flexbox auto-sizing based on content while strictly capping below top bar safe area.
 * @associatedFiles src/app/(tabs)/profile.tsx, src/features/profile/hooks/useProfileScreen.ts
 */

import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet, Modal, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { ToastContainer } from '@components/Toast';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  snapHeight?: number;
}

export function ProfileBottomSheet({ visible, onClose, title, children }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;

  // Dynamic max height capped strictly below top bar / status bar
  const maxAllowedHeight = screenHeight - insets.top - 20;

  const [isMounted, setIsMounted] = React.useState(visible);
  const ty = useSharedValue(screenHeight);
  const startY = useSharedValue(0);
  const dimOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
      dimOpacity.value = withTiming(1, { duration: 220 });
      ty.value = withSpring(0, { damping: 26, stiffness: 220, mass: 0.9 });
    } else if (isMounted) {
      dimOpacity.value = withTiming(0, { duration: 180 });
      ty.value = withTiming(screenHeight, { duration: 220 }, (finished) => {
        if (finished) {
          runOnJS(setIsMounted)(false);
        }
      });
    }
  }, [visible, isMounted, screenHeight]);

  const handleClose = React.useCallback(() => {
    dimOpacity.value = withTiming(0, { duration: 180 });
    ty.value = withTiming(screenHeight, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(onClose)();
      }
    });
  }, [onClose, screenHeight]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .onStart(() => {
        startY.value = ty.value;
      })
      .onUpdate((e) => {
        const newY = startY.value + e.translationY;
        if (newY < 0) {
          ty.value = newY * 0.2; // Rubber-band resistance when pulling up
        } else {
          ty.value = newY;
        }
      })
      .onEnd((e) => {
        if (ty.value > 120 || e.velocityY > 500) {
          dimOpacity.value = withTiming(0, { duration: 180 });
          ty.value = withTiming(screenHeight, { duration: 200 }, (finished) => {
            if (finished) {
              runOnJS(onClose)();
            }
          });
        } else {
          ty.value = withSpring(0, { damping: 26, stiffness: 220 });
        }
      });
  }, [onClose, screenHeight]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: ty.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: dimOpacity.value }));

  if (!isMounted) return null;

  return (
    <Modal
      transparent
      visible={isMounted}
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[s.backdrop, { backgroundColor: colors.overlay.heavy }, backdropStyle]} pointerEvents={visible ? 'auto' : 'none'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            s.panel,
            sheetStyle,
            {
              maxHeight: maxAllowedHeight,
              backgroundColor: colors.surface.sheet,
              borderColor: colors.glass.backgroundMid,
              shadowColor: colors.black,
              paddingBottom: insets.bottom + Spacing['3'],
            },
          ]}
        >
          <GestureDetector gesture={panGesture}>
            <Animated.View style={s.dragHeader}>
              <View style={[s.handle, { backgroundColor: colors.glass.borderStrong }]} />
              <View style={s.titleRow}>
                <AppText variant="headingSM" color={colors.text.primary}>{title}</AppText>
                <Pressable onPress={handleClose} hitSlop={12}>
                  <View style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}>
                    <Ionicons name="close" size={15} color={colors.text.secondary} />
                  </View>
                </Pressable>
              </View>
            </Animated.View>
          </GestureDetector>

          <View style={[s.contentContainer, { maxHeight: maxAllowedHeight - 80 }]}>
            {children}
          </View>
        </Animated.View>
        <ToastContainer isModal />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'transparent',
  },
  panel: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    flexDirection: 'column',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },
  dragHeader: {
    paddingTop: Spacing['3'],
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: Spacing['2'],
  },
  titleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing['5'], paddingBottom: Spacing['3'],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  contentContainer: {
    width: '100%',
    flexShrink: 1,
  },
});
