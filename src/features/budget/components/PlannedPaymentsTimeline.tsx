/**
 * @file PlannedPaymentsTimeline.tsx
 * @architecture Presentation Layer — UI Component
 * @description Ultra-clean, modern minimalist timeline and card list for planned bills.
 *   - Native 60/120fps UI-thread Reanimated gestures (swipe right to settle, swipe left to delete)
 *   - Authentic category squircle icons with micro-status pulse indicator
 *   - Clean urgency badges (Overdue, Due Today, Urgent, Upcoming, Settled)
 *   - Visual progress bar for partial payments
 *   - Direct 1-tap quick settle checkmark & 'Pay' modal trigger
 * @associatedFiles src/features/budget/hooks/useBudgetScreen.ts, src/app/(tabs)/budget.tsx
 */

import React, { memo, useCallback } from 'react';
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
import { format, parseISO } from 'date-fns';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { useAccountStore } from '@store/accountStore';
import { Spacing, Radius } from '@constants/Dimensions';
import { daysUntilDue, isUrgent } from '@store/plannedPaymentsStore';
import type { PlannedPayment } from '@store/plannedPaymentsStore';

// ─── Category Metadata ─────────────────────────────────────────────────────────

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface CategoryMeta {
  icon: IoniconName;
  color: string;
}

const CATEGORY_META: Record<string, CategoryMeta> = {
  housing:       { icon: 'home-outline',                 color: '#3B82F6' },
  food:          { icon: 'restaurant-outline',           color: '#10B981' },
  transport:     { icon: 'car-outline',                  color: '#38BDF8' },
  health:        { icon: 'fitness-outline',              color: '#EF4444' },
  entertainment: { icon: 'film-outline',                 color: '#8B5CF6' },
  shopping:      { icon: 'bag-handle-outline',           color: '#EC4899' },
  education:     { icon: 'school-outline',               color: '#F59E0B' },
  savings:       { icon: 'wallet-outline',               color: '#10B981' },
  bills:         { icon: 'flash-outline',                color: '#EAB308' },
  other:         { icon: 'receipt-outline',              color: '#6B7280' },
};

// ─── Gesture Thresholds ────────────────────────────────────────────────────────

const SWIPE_SETTLE_THRESHOLD = 80;
const TX_DELETE_W = 84;
const TX_SNAP_AT = TX_DELETE_W * 0.55;
const TX_AUTO_DELETE = 175;

// ─── Payment Row Component (Memoized) ──────────────────────────────────────────

interface PaymentRowProps {
  payment: PlannedPayment;
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (payment: PlannedPayment) => void;
}

const PaymentRow = memo(function PaymentRow({ payment, onSettle, onDelete, onPress }: PaymentRowProps) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();
  const account = useAccountStore((s) => s.accounts.find((a) => a.id === payment.accountId));

  const paid = payment.amountPaid ?? 0;
  const remaining = Math.max(0, payment.amount - paid);
  const progressPct = payment.amount > 0 ? Math.min(1, paid / payment.amount) : 0;
  const isSettled = payment.status === 'SETTLED';

  const days = daysUntilDue(payment.dueDate);
  const urgent = isUrgent(payment.dueDate);
  const isOverdue = payment.status === 'OVERDUE' || days < 0;

  // Reanimated Shared Values
  const translateX = useSharedValue(0);
  const rowOpacity = useSharedValue(1);
  const pressScale = useSharedValue(1);

  // Category & Status Colors
  const catMeta = CATEGORY_META[payment.category] || { icon: 'receipt-outline', color: colors.brand.primary };
  const catColor = catMeta.color;

  const dotColor = isSettled
    ? colors.status.income
    : isOverdue
      ? colors.status.expense
      : urgent || days === 0
        ? colors.status.warning
        : colors.brand.primary;

  // Format Due Date
  let formattedDate = '';
  try {
    formattedDate = format(parseISO(payment.dueDate), 'MMM d');
  } catch {
    formattedDate = payment.dueDate;
  }

  // Settle action with animation
  const handleSettleAction = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    translateX.value = withTiming(240, { duration: 200 });
    rowOpacity.value = withTiming(0, { duration: 220 });
    setTimeout(() => {
      onSettle(payment.id);
    }, 220);
  }, [onSettle, payment.id, translateX, rowOpacity]);

  // Delete action with animation
  const handleDeleteAction = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    translateX.value = withTiming(-400, { duration: 220 });
    rowOpacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      onDelete(payment.id);
    }, 220);
  }, [onDelete, payment.id, translateX, rowOpacity]);

  // UI-Thread Native Pan Gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      'worklet';
      if (isSettled) {
        // Settled bills only allow swipe-left to delete
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

  // Animated Styles
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

  const cardBg = colors.surface.sheet;

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
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onPress(payment);
            }
          }}
          style={styles.pressableCard}
        >
          <Animated.View
            style={[
              styles.card,
              cardAnimatedStyle,
              {
                backgroundColor: cardBg,
                borderColor: isSettled ? colors.glass.border + '14' : colors.glass.border,
                opacity: isSettled ? 0.72 : 1,
              },
            ]}
          >
            {/* Top Primary Row */}
            <View style={styles.cardHeaderRow}>
              {/* Category Squircle with Micro Pulse Dot */}
              <View style={styles.iconWrapper}>
                <View
                  style={[
                    styles.iconBox,
                    { backgroundColor: catColor + (isDark ? '24' : '16') },
                  ]}
                >
                  <Ionicons name={catMeta.icon} size={18} color={catColor} />
                </View>
                {/* Status Dot */}
                <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
              </View>

              {/* Title & Metadata */}
              <View style={styles.infoCol}>
                <View style={styles.titleRow}>
                  <AppText
                    variant="labelMD"
                    color={isSettled ? colors.text.secondary : colors.text.primary}
                    numberOfLines={1}
                    style={[styles.billTitle, isSettled && styles.settledTitle]}
                  >
                    {payment.title}
                  </AppText>
                  {payment.isRecurring && (
                    <View style={[styles.recurringChip, { backgroundColor: colors.glass.backgroundMid }]}>
                      <Ionicons name="repeat" size={9} color={colors.text.tertiary} />
                      <AppText style={[styles.recurringText, { color: colors.text.tertiary }]}>
                        {payment.recurringInterval || 'Monthly'}
                      </AppText>
                    </View>
                  )}
                </View>

                {/* Badges: Due Date & Account */}
                <View style={styles.chipsRow}>
                  {/* Urgency Pill */}
                  <View
                    style={[
                      styles.urgencyPill,
                      {
                        backgroundColor: isSettled
                          ? colors.status.income + '16'
                          : isOverdue
                            ? colors.status.expense + '18'
                            : urgent || days === 0
                              ? colors.status.warning + '18'
                              : colors.glass.backgroundMid,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isSettled
                          ? 'checkmark-circle'
                          : isOverdue
                            ? 'alert-circle'
                            : urgent || days === 0
                              ? 'time-outline'
                              : 'calendar-outline'
                      }
                      size={10}
                      color={
                        isSettled
                          ? colors.status.income
                          : isOverdue
                            ? colors.status.expense
                            : urgent || days === 0
                              ? colors.status.warning
                              : colors.text.secondary
                      }
                    />
                    <AppText
                      style={[
                        styles.urgencyText,
                        {
                          color: isSettled
                            ? colors.status.income
                            : isOverdue
                              ? colors.status.expense
                              : urgent || days === 0
                                ? colors.status.warning
                                : colors.text.secondary,
                        },
                      ]}
                    >
                      {isSettled
                        ? 'Settled'
                        : isOverdue
                          ? `${Math.abs(days) || 1}d overdue`
                          : days === 0
                            ? 'Due today'
                            : `${formattedDate} · in ${days}d`}
                    </AppText>
                  </View>

                  {/* Bank Account Pill */}
                  {account && (
                    <View style={[styles.accountPill, { backgroundColor: account.color + '14' }]}>
                      <View style={[styles.accountMiniDot, { backgroundColor: account.color }]} />
                      <AppText style={[styles.accountLabel, { color: account.color }]} numberOfLines={1}>
                        {account.name}
                      </AppText>
                    </View>
                  )}
                </View>
              </View>

              {/* Right Side: Amount & CTA */}
              <View style={styles.amountCol}>
                <AppText
                  variant="labelLG"
                  style={[
                    styles.amountText,
                    {
                      color: isSettled
                        ? colors.status.income
                        : isOverdue
                          ? colors.status.expense
                          : colors.text.primary,
                    },
                  ]}
                >
                  {symbol}{remaining.toFixed(remaining % 1 === 0 ? 0 : 2)}
                </AppText>

                {/* Quick Action Buttons */}
                {!isSettled ? (
                  <View style={styles.actionButtonGroup}>
                    {/* Pay Button (Opens Partial/Full Payment Sheet) */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        onPress(payment);
                      }}
                      hitSlop={4}
                      style={[
                        styles.payPill,
                        {
                          backgroundColor: colors.brand.primary + '18',
                          borderColor: colors.brand.primary + '40',
                        },
                      ]}
                    >
                      <AppText style={[styles.payPillText, { color: colors.brand.primary }]}>
                        Pay
                      </AppText>
                      <Ionicons name="arrow-forward" size={10} color={colors.brand.primary} />
                    </Pressable>

                    {/* Quick 1-Tap Settle Checkmark */}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        handleSettleAction();
                      }}
                      hitSlop={6}
                      style={[
                        styles.quickCheckBtn,
                        {
                          backgroundColor: colors.status.income + '18',
                          borderColor: colors.status.income + '35',
                        },
                      ]}
                    >
                      <Ionicons name="checkmark" size={12} color={colors.status.income} />
                    </Pressable>
                  </View>
                ) : (
                  <View style={[styles.settledBadge, { backgroundColor: colors.status.income + '18' }]}>
                    <Ionicons name="checkmark-done" size={11} color={colors.status.income} />
                    <AppText style={[styles.settledBadgeText, { color: colors.status.income }]}>
                      Paid
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* Bottom Progress Row (For Partial Payments) */}
            {paid > 0 && !isSettled && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressTrack, { backgroundColor: colors.glass.backgroundMid }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.max(4, Math.min(100, progressPct * 100))}%`,
                        backgroundColor: catColor,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressMetaRow}>
                  <AppText style={[styles.progressMetaText, { color: colors.text.tertiary }]}>
                    Paid {symbol}{paid.toFixed(0)} ({Math.round(progressPct * 100)}%)
                  </AppText>
                  <AppText style={[styles.progressRemainingText, { color: catColor }]}>
                    {symbol}{remaining.toFixed(0)} left of {symbol}{payment.amount.toFixed(0)}
                  </AppText>
                </View>
              </View>
            )}
          </Animated.View>
        </Pressable>
      </GestureDetector>
    </Animated.View>
  );
});

// ─── Timeline Container Component ──────────────────────────────────────────────

interface PlannedPaymentsTimelineProps {
  payments: PlannedPayment[];
  onSettle: (id: string) => void;
  onDelete: (id: string) => void;
  onPress: (payment: PlannedPayment) => void;
}

export function PlannedPaymentsTimeline({ payments, onSettle, onDelete, onPress }: PlannedPaymentsTimelineProps) {
  const { colors } = useTheme();
  const { symbol } = useFormatCurrency();

  const activePayments = payments
    .filter((p) => p.status !== 'SETTLED')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const settledPayments = payments
    .filter((p) => p.status === 'SETTLED')
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  const totalUpcoming = activePayments.reduce((sum, p) => sum + Math.max(0, p.amount - (p.amountPaid ?? 0)), 0);

  if (!payments.length) return null;

  return (
    <View style={styles.container}>
      {/* Clean Header Bar */}
      <View style={styles.headerBar}>
        <View>
          <AppText variant="headingSM" color={colors.text.primary} style={styles.headerTitle}>
            Planned Payments
          </AppText>
          {activePayments.length > 0 && (
            <AppText variant="caption" color={colors.text.tertiary} style={styles.headerSubtitle}>
              {activePayments.length} upcoming · {symbol}{totalUpcoming.toLocaleString()} pending
            </AppText>
          )}
        </View>

        {/* Minimalist Micro Gesture Indicator */}
        <View style={styles.gestureIndicator}>
          <Ionicons name="swap-horizontal" size={11} color={colors.text.tertiary} />
          <AppText style={[styles.gestureIndicatorText, { color: colors.text.tertiary }]}>
            Swipe left/right
          </AppText>
        </View>
      </View>

      {/* Upcoming Bills List */}
      {activePayments.length > 0 && (
        <View style={styles.section}>
          <AppText variant="labelSM" color={colors.text.tertiary} style={styles.sectionHeader}>
            UPCOMING ({activePayments.length})
          </AppText>
          <View style={styles.list}>
            {activePayments.map((p) => (
              <PaymentRow key={p.id} payment={p} onSettle={onSettle} onDelete={onDelete} onPress={onPress} />
            ))}
          </View>
        </View>
      )}

      {/* Settled Bills List */}
      {settledPayments.length > 0 && (
        <View style={[styles.section, activePayments.length > 0 && { marginTop: Spacing['3'] }]}>
          <AppText variant="labelSM" color={colors.text.tertiary} style={styles.sectionHeader}>
            COMPLETED & SETTLED ({settledPayments.length})
          </AppText>
          <View style={styles.list}>
            {settledPayments.map((p) => (
              <PaymentRow key={p.id} payment={p} onSettle={onSettle} onDelete={onDelete} onPress={onPress} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Stylesheet ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: Spacing['3'],
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    marginBottom: Spacing['1'],
  },
  headerTitle: {
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '500',
  },
  gestureIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  gestureIndicatorText: {
    fontSize: 10,
    fontWeight: '600',
  },
  section: {
    gap: Spacing['2'],
  },
  sectionHeader: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  list: {
    gap: Spacing['2'],
  },

  // ── Row Wrapper & Underlays ──────────────────────────────────────────────────
  rowWrapper: {
    position: 'relative',
    borderRadius: Radius.xl,
    overflow: 'hidden',
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

  // ── Main Card ────────────────────────────────────────────────────────────────
  card: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
    gap: Spacing['2'],
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },

  // Category Icon & Pulse Dot
  iconWrapper: {
    position: 'relative',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  // Info Column
  infoCol: {
    flex: 1,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'nowrap',
  },
  billTitle: {
    fontWeight: '700',
    fontSize: 14,
    flexShrink: 1,
  },
  settledTitle: {
    textDecorationLine: 'line-through',
  },
  recurringChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Radius.sm,
  },
  recurringText: {
    fontSize: 9.5,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Chips: Urgency & Account
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  urgencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  accountMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  accountLabel: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Amount & Action Column
  amountCol: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  amountText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  actionButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  payPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  payPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  quickCheckBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  settledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: Radius.full,
  },
  settledBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Partial Payment Progress Bar
  progressContainer: {
    gap: 3,
    marginTop: 2,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.12)',
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },
  progressMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressMetaText: {
    fontSize: 9.5,
    fontWeight: '500',
  },
  progressRemainingText: {
    fontSize: 9.5,
    fontWeight: '700',
  },
});
