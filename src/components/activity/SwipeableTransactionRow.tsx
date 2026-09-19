/**
 * @file SwipeableTransactionRow.tsx
 * @architecture Presentation Layer — UI Component
 * @description A swipeable transaction row: swipe left to reveal a red delete action.
 *   Velocity-based dismiss threshold fires onDelete after a slide-out animation.
 * @associatedFiles src/features/transactions/components/TransactionListItem.tsx,
 *   src/app/(tabs)/transactions.tsx
 */

import React from 'react';
import { View, StyleSheet, Pressable, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { TransactionListItem } from '@features/transactions/components/TransactionListItem';
import { useTheme } from '@hooks/useTheme';
import type { Transaction } from '@store/types';

const DELETE_W = 72;
const SNAP_AT  = DELETE_W / 2;

interface Props {
  tx:       Transaction;
  onDelete: () => void;
  onPress:  (tx: Transaction) => void;
  balanceAfter?: number;
}

export const SwipeableTransactionRow = React.memo(function SwipeableTransactionRow({ tx, onDelete, onPress, balanceAfter }: Props) {
  const { colors } = useTheme();
  const cardBg = colors.surface.sheet;
  const translateX = useSharedValue(0);
  const rowOpacity = useSharedValue(1);
  const rowHeight  = useSharedValue<number | undefined>(undefined);

  const handleLayout = (e: LayoutChangeEvent) => {
    if (rowHeight.value === undefined) {
      rowHeight.value = e.nativeEvent.layout.height;
    }
  };

  const dismiss = () => {
    'worklet';
    translateX.value = withTiming(-400, { duration: 250 });
    rowOpacity.value = withTiming(0,    { duration: 200 });
    if (rowHeight.value === undefined) {
      rowHeight.value = 72;
    }
    rowHeight.value  = withTiming(0,    { duration: 250 }, (finished) => {
      if (finished) {
        runOnJS(onDelete)();
      }
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10000])
    .failOffsetY([-12, 12])
    .onUpdate((e) => {
      'worklet';
      translateX.value = Math.min(Math.max(e.translationX, -(DELETE_W + 8)), 0);
    })
    .onEnd((e) => {
      'worklet';
      if (e.velocityX < -600 || e.translationX < -180) {
        dismiss();
      } else if (e.translationX < -SNAP_AT) {
        translateX.value = withSpring(-DELETE_W, { damping: 20, stiffness: 200 });
      } else {
        translateX.value = withSpring(0, { damping: 20, stiffness: 250 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform:       [{ translateX: translateX.value }],
    opacity:         rowOpacity.value,
    backgroundColor: cardBg,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    height:   rowHeight.value,
    overflow: 'hidden',
  }));

  return (
    <Animated.View onLayout={handleLayout} style={[s.wrapper, containerStyle]}>
      <Pressable onPress={dismiss} style={[s.deleteAction, { backgroundColor: colors.status.expense }]}>
        <Ionicons name="trash-outline" size={17} color={colors.white} />
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>
          <TransactionListItem
            transaction={tx}
            onPress={(t) => {
              if (translateX.value < -5) {
                translateX.value = withSpring(0, { damping: 20, stiffness: 250 });
              } else {
                onPress(t);
              }
            }}
            balanceAfter={balanceAfter}
          />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
});

const s = StyleSheet.create({
  wrapper: { position: 'relative', overflow: 'hidden' },
  deleteAction: {
    position: 'absolute', top: 0, right: 0, bottom: 0,
    width: DELETE_W, alignItems: 'center', justifyContent: 'center',
  },
});
