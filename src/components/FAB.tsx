/**
 * @file FAB.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Ultra-minimalist, high-performance circular Floating Action Button (+).
 *   - Pure Icon Only: Text completely removed to prevent card obstruction.
 *   - Auto Hide on Scroll Down: Slides down off-screen natively on the UI thread when scrolling down.
 *   - Auto Reveal on Scroll Up: Springs back into view smoothly when scrolling up.
 *   - 100% Native Reanimated Worklet: Zero JS bridge re-renders, silky 60/120fps.
 */

import React from 'react';
import { StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing, Layout } from '@constants/index';

interface FABProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  label?: string; // Optional for backward compatibility
  onPress: () => void;
  bottom?: number;
  visible?: SharedValue<boolean>;
}

const FAB_SIZE = 52;
const SPRING_CONFIG = { damping: 18, stiffness: 240 };

export function FAB({ icon = 'add', onPress, bottom, visible }: FABProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    scale.value = withSpring(0.88, { damping: 14, stiffness: 360 }, () => {
      scale.value = withSpring(1, { damping: 14, stiffness: 360 });
    });
    onPress();
  };

  // 100% Native UI-Thread translation on scroll
  const containerAnimatedStyle = useAnimatedStyle(() => {
    const isVis = visible ? visible.value : true;
    const translateY = withSpring(isVis ? 0 : 85, SPRING_CONFIG);
    const opacity = withTiming(isVis ? 1 : 0, { duration: 150 });

    return {
      opacity,
      transform: [
        { translateY },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents={visible ? (visible.value ? 'auto' : 'none') : 'auto'}
      style={[
        styles.wrapper,
        {
          bottom: bottom ?? Layout.tabBarHeight + 16,
          shadowColor: colors.brand.primary,
        },
        containerAnimatedStyle,
      ]}
    >
      <Pressable onPress={handlePress} style={styles.pressable}>
        <LinearGradient
          colors={[colors.brand.primary, colors.brand.accent] as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name={icon} size={24} color={colors.white} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    right: Spacing['5'],
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: Radius.full,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.38,
        shadowRadius: 14,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  pressable: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
