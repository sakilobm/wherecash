import React, { useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { useAccountStore } from '@store/accountStore';
import { Radius, Spacing } from '@constants/Dimensions';
import { NudgeButton } from './NudgeButton';
import type { LedgerEntry } from '@store/ledgerStore';

// ─── Avatar ──────────────────────────────────────────────────────────────────

const RING_SIZE = 44;
const AVATAR_INNER = RING_SIZE - 4;
const RING_THICKNESS = 2;

const AvatarRing = memo(function AvatarRing({
  initials,
  color,
  status,
}: {
  initials: string;
  color: string;
  status: LedgerEntry['status'];
}) {
  const { colors, isDark } = useTheme();
  const ringColor =
    status === 'SETTLED' ? colors.text.tertiary :
      status === 'OVERDUE' ? colors.status.expense :
        color;

  return (
    <View
      style={[
        styles.avatarRing,
        {
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: RING_SIZE / 2,
          borderColor: ringColor,
          borderWidth: RING_THICKNESS,
          shadowColor: ringColor,
          shadowOpacity: status !== 'SETTLED' ? (isDark ? 0.35 : 0.15) : 0,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: status !== 'SETTLED' ? 3 : 0,
        },
      ]}
    >
      <View
        style={[
          styles.avatarInner,
          {
            width: AVATAR_INNER,
            height: AVATAR_INNER,
            borderRadius: AVATAR_INNER / 2,
            backgroundColor: color + (status === 'SETTLED' ? '15' : '22'),
          },
        ]}
      >
        <AppText
          variant="labelMD"
          style={[
            styles.initials,
            { color: status === 'SETTLED' ? colors.text.tertiary : color },
          ]}
        >
          {initials}
        </AppText>
      </View>
    </View>
  );
});

// ─── Status chip ─────────────────────────────────────────────────────────────

const StatusChip = memo(function StatusChip({ status }: { status: LedgerEntry['status'] }) {
  const { colors } = useTheme();
  const chipColor =
    status === 'SETTLED' ? colors.status.income :
      status === 'OVERDUE' ? colors.status.expense :
        colors.status.info;

  const label = status === 'SETTLED' ? 'Settled' : status === 'OVERDUE' ? 'Overdue' : 'Active';

  return (
    <View style={[styles.chip, { backgroundColor: chipColor + '12', borderColor: chipColor + '22' }]}>
      <View style={[styles.chipDot, { backgroundColor: chipColor }]} />
      <AppText variant="caption" style={[styles.chipText, { color: chipColor }]}>
        {label}
      </AppText>
    </View>
  );
});

// ─── Card ────────────────────────────────────────────────────────────────────

// ─── Gesture Thresholds (Identical to Budget) ──────────────────────────────────
const SWIPE_SETTLE_THRESHOLD = 80;
const TX_DELETE_W = 84;
const TX_SNAP_AT = TX_DELETE_W * 0.55;
const TX_AUTO_DELETE = 175;

interface PersonLedgerCardProps {
  entry: LedgerEntry;
  onPress: (entry: LedgerEntry) => void;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
}

export const PersonLedgerCard = memo(function PersonLedgerCard({
  entry,
  onPress,
  onSettle,
  onDelete,
}: PersonLedgerCardProps) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();
  const account = useAccountStore((s) => s.accounts.find((a) => a.id === entry.accountId));

  const isSettled = entry.status === 'SETTLED';

  // Reanimated Shared Values
  const translateX = useSharedValue(0);
  const rowOpacity = useSharedValue(1);
  const pressScale = useSharedValue(1);

  // Settle action with smooth animation (Swipe Right)
  const handleSettleAction = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    translateX.value = withTiming(240, { duration: 200 });
    rowOpacity.value = withTiming(0, { duration: 220 });
    setTimeout(() => {
      onSettle(entry.id);
    }, 220);
  }, [entry.id, onSettle, translateX, rowOpacity]);

  // Delete action with smooth animation (Swipe Left)
  const handleDeleteAction = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    translateX.value = withTiming(-400, { duration: 220 });
    rowOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      onDelete(entry.id);
    }, 220);
  }, [entry.id, onDelete, translateX, rowOpacity]);

  // UI-Thread Native Pan Gesture (Identical to Budget)
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      'worklet';
      if (isSettled) {
        // Settled entries only allow swipe-left to delete
        if (e.translationX < 0) {
          translateX.value = Math.max(e.translationX, -(TX_DELETE_W + 16));
        }
        return;
      }

      if (e.translationX > 0) {
        // Swipe Right -> Settle
        translateX.value = Math.min(e.translationX, 130);
      } else {
        // Swipe Left -> Delete
        translateX.value = Math.max(e.translationX, -(TX_DELETE_W + 16));
      }
    })
    .onEnd((e) => {
      'worklet';
      if (e.translationX >= SWIPE_SETTLE_THRESHOLD && !isSettled) {
        // Swiped right enough to settle
        runOnJS(handleSettleAction)();
      } else if (e.translationX < 0) {
        // Delete direction
        if (e.velocityX < -650 || e.translationX < -TX_AUTO_DELETE) {
          // Fast flick or deep swipe -> auto delete
          runOnJS(handleDeleteAction)();
        } else if (e.translationX < -TX_SNAP_AT) {
          // Snap open delete button
          translateX.value = withSpring(-TX_DELETE_W, { damping: 20, stiffness: 220 });
        } else {
          translateX.value = withSpring(0, { damping: 22, stiffness: 260 });
        }
      } else {
        translateX.value = withSpring(0, { damping: 22, stiffness: 260 });
      }
    });

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: pressScale.value },
    ],
  }));

  const wrapAnimatedStyle = useAnimatedStyle(() => ({
    opacity: rowOpacity.value,
  }));

  const settleUnderlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(translateX.value / SWIPE_SETTLE_THRESHOLD, 0), 1),
  }));

  const deleteUnderlayStyle = useAnimatedStyle(() => ({
    opacity: Math.min(Math.max(-translateX.value / TX_SNAP_AT, 0), 1),
  }));

  const remaining = entry.totalAmount - entry.amountReturned;
  const progressPct = entry.totalAmount > 0 ? entry.amountReturned / entry.totalAmount : 0;

  const dirColor =
    entry.direction === 'OWED_TO_ME' ? colors.status.income : colors.status.expense;

  const ringColor =
    entry.status === 'SETTLED' ? colors.text.tertiary :
      entry.status === 'OVERDUE' ? colors.status.expense :
        entry.personColor;

  const glowColor =
    entry.status === 'SETTLED' ? colors.transparent : ringColor;

  // Modern glow border: dynamic glow color at low opacity, or fallback to glass border
  const cardBorderColor = entry.status !== 'SETTLED'
    ? glowColor + (isDark ? '44' : '26') // Translucent border glow matching person/status
    : (isDark ? colors.glass.border : colors.glass.borderStrong);

  const cardGradColors = isDark
    ? [colors.background.secondary, colors.background.tertiary] as const
    : ['#FFFFFF', '#F8FAFC'] as const;

  return (
    <Animated.View style={[styles.rowWrapper, wrapAnimatedStyle]}>
      {/* ── Settle Underlay (Left to Right) ── */}
      {!isSettled && (
        <Animated.View style={[styles.underlaySettle, settleUnderlayStyle, { backgroundColor: colors.status.income }]}>
          <Ionicons name="checkmark-circle" size={22} color={colors.white} />
          <AppText variant="labelSM" style={[styles.underlayText, { color: colors.white }]}>
            Mark Settled
          </AppText>
        </Animated.View>
      )}

      {/* ── Delete Underlay (Right to Left) ── */}
      <Animated.View style={[styles.underlayDelete, deleteUnderlayStyle, { backgroundColor: colors.status.expense }]}>
        <Pressable onPress={handleDeleteAction} style={styles.underlayDeletePressable}>
          <Ionicons name="trash-outline" size={20} color={colors.white} />
          <AppText variant="labelSM" style={[styles.underlayText, { color: colors.white }]}>
            Delete
          </AppText>
        </Pressable>
      </Animated.View>

      {/* ── Main Interactive Card ── */}
      <GestureDetector gesture={panGesture}>
        <Pressable
          onPressIn={() => {
            pressScale.value = withSpring(0.985, { damping: 15 });
          }}
          onPressOut={() => {
            pressScale.value = withSpring(1, { damping: 15 });
          }}
          onPress={() => {
            if (translateX.value < -8) {
              // Tap to snap back if swiped open
              translateX.value = withSpring(0, { damping: 20, stiffness: 260 });
            } else {
              onPress(entry);
            }
          }}
          style={styles.pressableCard}
        >
          <Animated.View
            style={[
              styles.card,
              cardAnimatedStyle,
              {
                shadowColor: glowColor,
                shadowOpacity: entry.status !== 'SETTLED' ? (isDark ? 0.35 : 0.1) : 0,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                backgroundColor: isDark ? colors.background.secondary : colors.white,
              },
            ]}
          >
            {/* Inner clips container for child elements to allow overflow shadows */}
            <View style={[styles.cardInner, { borderColor: cardBorderColor }]}>
              {/* Custom Linear Gradient for polished visual depth */}
              <LinearGradient
                colors={cardGradColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Ambient glow blob matching the status or person color */}
              {entry.status !== 'SETTLED' && (
                <View
                  style={[
                    styles.cardGlowBlob,
                    {
                      backgroundColor: glowColor,
                      opacity: isDark ? 0.08 : 0.04,
                    },
                  ]}
                />
              )}

              {/* Top shine overlay to give glassmorphic texture in dark mode */}
              {isDark && (
                <View style={[styles.cardShine, { backgroundColor: colors.glass.shine }]} />
              )}

              <View style={styles.cardContent}>
                {/* Row 1: Avatar + Name + Amount */}
                <View style={styles.mainRow}>
                  <AvatarRing
                    initials={entry.personInitials}
                    color={entry.personColor}
                    status={entry.status}
                  />

                  <View style={styles.nameBlock}>
                    <AppText
                      variant="labelLG"
                      color={colors.text.primary}
                      numberOfLines={1}
                      style={styles.name}
                    >
                      {entry.personName}
                    </AppText>

                    {/* Meta line: account badge + note */}
                    <View style={styles.metaRow}>
                      {account && (
                        <View
                          style={[
                            styles.accountBadge,
                            {
                              backgroundColor: isDark ? account.color + '15' : account.color + '0E',
                              borderColor: isDark ? account.color + '2C' : account.color + '18',
                            },
                          ]}
                        >
                          <Ionicons name={account.icon as any} size={9} color={account.color} />
                          <AppText style={[styles.accountLabel, { color: account.color }]}>
                            {account.name}
                          </AppText>
                        </View>
                      )}
                      {entry.note && (
                        <AppText
                          variant="caption"
                          color={colors.text.secondary}
                          numberOfLines={1}
                          style={styles.note}
                        >
                          {entry.note}
                        </AppText>
                      )}
                    </View>
                  </View>

                  {/* Right: Amount + Status */}
                  <View style={styles.amountBlock}>
                    <AppText
                      style={[styles.amount, { color: dirColor }]}
                      numberOfLines={1}
                    >
                      {entry.direction === 'OWED_TO_ME' ? '+' : '-'}{symbol}{remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </AppText>
                    <View style={styles.amountMeta}>
                      <StatusChip status={entry.status} />
                      {entry.status !== 'SETTLED' && <NudgeButton entry={entry} size={28} />}
                    </View>
                  </View>
                </View>

                {/* Row 2: Clean Progress bar (only when partial returns exist) */}
                {entry.totalAmount > 0 && progressPct > 0 && progressPct < 1 && (
                  <View style={styles.progressSection}>
                    <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progressPct * 100}%` as any,
                            backgroundColor: entry.personColor,
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  rowWrapper: {
    position: 'relative',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing['3'],
  },
  pressableCard: {
    zIndex: 2,
  },
  underlaySettle: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing['5'],
    gap: Spacing['2'],
    zIndex: 1,
  },
  underlayDelete: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    zIndex: 1,
  },
  underlayDeletePressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing['5'],
    gap: 6,
    height: '100%',
  },
  underlayText: {
    fontWeight: '700',
    fontSize: 12,
  },
  card: {
    borderRadius: Radius.xl,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 14,
      },
      android: { elevation: 3 },
    }),
  },
  cardInner: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  cardShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  cardGlowBlob: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cardContent: {
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['4'],
    gap: Spacing['3'],
  },

  /* Row 1: main content */
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  avatarRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  accountLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  note: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '400',
  },

  /* Right: amount + status */
  amountBlock: {
    alignItems: 'flex-end',
    gap: 5,
  },
  amount: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  amountMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  /* Status chip */
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  chipDot: {
    width: 4.5,
    height: 4.5,
    borderRadius: 2.25,
  },
  chipText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },

  /* Progress section */
  progressSection: {
    marginTop: 2,
  },
  progressTrack: {
    height: 3.5,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 3.5,
    borderRadius: 2,
  },
});
