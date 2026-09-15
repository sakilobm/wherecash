/**
 * @file LedgerInfoSheet.tsx
 * @architecture Presentation Layer — Feature Component
 * @description Animated bottom sheet that displays the full detail view for a single
 *   LedgerEntry: avatar, direction/status chips, a three-cell stats card, repayment
 *   progress bar, note/due-date meta rows, and action buttons (partial return + settle).
 *   All animation is driven by Reanimated shared values; no business logic lives here.
 * @associatedFiles
 *   src/app/(tabs)/ledger.tsx,
 *   src/features/ledger/hooks/useLedgerScreen.ts,
 *   src/store/ledgerStore.ts
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { useAccountStore } from '@store/accountStore';
import { Radius, Spacing } from '@constants/Dimensions';
import type { LedgerEntry } from '@store/ledgerStore';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  entry:           LedgerEntry | undefined;
  onClose:         () => void;
  onPartialReturn: (entry: LedgerEntry) => void;
  onSettle:        (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LedgerInfoSheet({ entry, onClose, onPartialReturn, onSettle }: Props) {
  const { colors, isDark } = useTheme();
  const { symbol }         = useFormatCurrency();
  const account = useAccountStore((s) => s.accounts.find((a) => a.id === entry?.accountId));

  const translateY  = useSharedValue(600);
  const backdropOp  = useSharedValue(0);
  const visible     = !!entry;

  useEffect(() => {
    if (visible) {
      backdropOp.value = withTiming(1,   { duration: 220 });
      translateY.value = withSpring(0,   { damping: 22, stiffness: 160, mass: 0.9 });
    } else {
      backdropOp.value = withTiming(0,   { duration: 180 });
      translateY.value = withSpring(600, { damping: 20, stiffness: 200 });
    }
  }, [visible]);

  const sheetStyle    = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOp.value }));

  if (!entry) return null;

  const remaining   = Math.max(0, entry.totalAmount - entry.amountReturned);
  const returnedPct = entry.totalAmount > 0 ? Math.min(entry.amountReturned / entry.totalAmount, 1) : 0;
  const remainingPct = entry.totalAmount > 0 ? Math.max(remaining / entry.totalAmount, 0) : 0;
  const dirColor    = entry.direction === 'OWED_TO_ME' ? colors.status.income : colors.status.expense;
  const statusColor =
    entry.status === 'SETTLED' ? colors.status.income :
    entry.status === 'OVERDUE' ? colors.status.expense : colors.status.info;

  // Clear Intentional Semantic Colors:
  // - Returned: Emerald Green (recovered/settled progress)
  // - Remaining: Amber for Owed To Me (receivable pending) or Rose/Expense for I Owe (payable pending)
  const returnedColor = colors.status.income;
  const remainingColor = remaining > 0
    ? (entry.direction === 'OWED_TO_ME' ? colors.status.warning : colors.status.expense)
    : colors.text.tertiary;

  const stats = [
    { label: 'Total',     value: entry.totalAmount,    color: colors.text.primary },
    { label: 'Returned',  value: entry.amountReturned, color: returnedColor },
    { label: 'Remaining', value: remaining,            color: remainingColor },
  ];

  return (
    <Modal visible={visible} transparent statusBarTranslucent animationType="none" onRequestClose={onClose}>
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.heavy }, backdropStyle]} />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[
          s.sheet,
          {
            backgroundColor: colors.surface.sheet,
            borderColor:     colors.glass.backgroundMid,
            shadowColor:     colors.black,
          },
          sheetStyle,
        ]}
      >
        {/* Handle */}
        <View style={[s.handle, { backgroundColor: colors.text.tertiary + '40' }]} />

        {/* Close button */}
        <Pressable onPress={onClose} hitSlop={12} style={s.closeBtn}>
          <Ionicons name="close" size={20} color={colors.text.tertiary} />
        </Pressable>

        {/* Avatar + name */}
        <View style={s.avatarRow}>
          <View style={[s.avatar, { backgroundColor: entry.personColor + '28', borderColor: entry.personColor + '55' }]}>
            <AppText style={[s.avatarText, { color: entry.personColor }]}>
              {entry.personInitials}
            </AppText>
          </View>
          <View style={s.nameBlock}>
            <AppText variant="headingSM" color={colors.text.primary} style={s.nameText}>
              {entry.personName}
            </AppText>
            <View style={s.chipRow}>
              <View style={[s.directionChip, { backgroundColor: dirColor + '18', borderColor: dirColor + '40' }]}>
                <Ionicons
                  name={entry.direction === 'OWED_TO_ME' ? 'arrow-down' : 'arrow-up'}
                  size={11} color={dirColor}
                />
                <AppText style={[s.chipText, { color: dirColor }]}>
                  {entry.direction === 'OWED_TO_ME' ? 'Owed to me' : 'I owe'}
                </AppText>
              </View>
              <View style={[s.statusChip, { backgroundColor: statusColor + '18' }]}>
                <AppText style={[s.chipText, { color: statusColor }]}>
                  {entry.status === 'SETTLED' ? 'Settled' : entry.status === 'OVERDUE' ? 'Overdue' : 'Active'}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        {/* Stats card */}
        <View style={[s.statsCard, { backgroundColor: colors.background.tertiary, borderColor: colors.glass.background }]}>
          {stats.map((stat, i) => (
            <View
              key={stat.label}
              style={[
                s.statCell,
                i < 2 && { borderRightWidth: 1, borderRightColor: colors.glass.background },
              ]}
            >
              <AppText style={[s.statValue, { color: stat.color }]}>
                {symbol}{stat.value.toFixed(2)}
              </AppText>
              <AppText variant="caption" color={colors.text.tertiary} style={s.statLabel}>
                {stat.label}
              </AppText>
            </View>
          ))}
        </View>

        {/* Intentional Segmented Progress Bar matching Returned & Remaining colors */}
        {entry.totalAmount > 0 && (
          <View style={s.progressSection}>
            <View style={[s.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
              {returnedPct > 0 && (
                <View
                  style={[
                    s.progressSegment,
                    {
                      width: `${returnedPct * 100}%` as any,
                      backgroundColor: returnedColor,
                      borderTopLeftRadius: 3,
                      borderBottomLeftRadius: 3,
                      borderTopRightRadius: remainingPct === 0 ? 3 : 0,
                      borderBottomRightRadius: remainingPct === 0 ? 3 : 0,
                    },
                  ]}
                />
              )}
              {remainingPct > 0 && (
                <View
                  style={[
                    s.progressSegment,
                    {
                      width: `${remainingPct * 100}%` as any,
                      backgroundColor: remainingColor,
                      borderTopRightRadius: 3,
                      borderBottomRightRadius: 3,
                      borderTopLeftRadius: returnedPct === 0 ? 3 : 0,
                      borderBottomLeftRadius: returnedPct === 0 ? 3 : 0,
                    },
                  ]}
                />
              )}
            </View>

            {/* Sub-bar context row */}
            <View style={s.progressMetaRow}>
              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: returnedColor }]} />
                <AppText style={[s.legendText, { color: returnedColor }]}>
                  {Math.round(returnedPct * 100)}% Returned
                </AppText>
              </View>

              <View style={s.legendItem}>
                <View style={[s.legendDot, { backgroundColor: remainingColor }]} />
                <AppText style={[s.legendText, { color: remainingColor }]}>
                  {Math.round(remainingPct * 100)}% Remaining
                </AppText>
              </View>
            </View>
          </View>
        )}

        {/* Note / due date / account */}
        {(entry.note || entry.dueDate || account) && (
          <View style={s.meta}>
            {account && (
              <View style={s.metaRow}>
                <Ionicons name={(account.icon as any) || "wallet-outline"} size={13} color={account.color} />
                <AppText variant="caption" color={colors.text.secondary}>
                  Account: <AppText variant="caption" style={{ color: account.color, fontWeight: '600' }}>{account.name}</AppText>
                </AppText>
              </View>
            )}
            {entry.note && (
              <View style={s.metaRow}>
                <Ionicons name="chatbubble-outline" size={13} color={colors.text.tertiary} />
                <AppText variant="caption" color={colors.text.secondary}>{entry.note}</AppText>
              </View>
            )}
            {entry.dueDate && (
              <View style={s.metaRow}>
                <Ionicons name="calendar-outline" size={13} color={colors.text.tertiary} />
                <AppText variant="caption" color={colors.text.secondary}>Due {entry.dueDate}</AppText>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        {entry.status !== 'SETTLED' && (
          <View style={s.actions}>
            {remaining > 0 && (
              <Pressable
                onPress={() => { onClose(); onPartialReturn(entry); }}
                style={[s.actionBtn, s.actionPrimary, { overflow: 'hidden' }]}
              >
                <LinearGradient
                  colors={[colors.brand.primary, colors.brand.accent] as [string, string]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
                <Ionicons name="return-down-back-outline" size={16} color={colors.white} />
                <AppText style={[s.actionPrimaryText, { color: colors.white }]}>Record Partial Return</AppText>
              </Pressable>
            )}
            <Pressable
              onPress={() => onSettle(entry.id)}
              style={[s.actionBtn, { borderWidth: 1, borderColor: colors.status.income + '50', backgroundColor: colors.status.income + '10' }]}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.status.income} />
              <AppText style={[s.actionSecondaryText, { color: colors.status.income }]}>Mark as Settled</AppText>
            </Pressable>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: { backgroundColor: 'transparent' },

  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopLeftRadius:  Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: Spacing['5'],
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    gap: Spacing['4'],
    ...Platform.select({
      ios:     { shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 20 },
      android: { elevation: 20 },
    }),
  },

  handle:  { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 12 },
  closeBtn: { position: 'absolute', top: 16, right: Spacing['5'] },

  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'], marginTop: Spacing['1'] },
  avatar:    { width: 52, height: 52, borderRadius: 26, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  nameBlock:  { flex: 1, gap: 6 },
  nameText:   { fontSize: 20, fontWeight: '700' },

  chipRow:      { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  directionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  statusChip:    { paddingHorizontal: 9, paddingVertical: 3, borderRadius: Radius.full },
  chipText:      { fontSize: 11, fontWeight: '600' },

  statsCard: { flexDirection: 'row', borderRadius: Radius.xl, borderWidth: 1, overflow: 'hidden' },
  statCell:  { flex: 1, alignItems: 'center', paddingVertical: Spacing['4'], gap: 4 },
  statValue: { fontSize: 16, fontWeight: '700' },
  statLabel: { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },

  progressSection: {
    gap: 6,
    marginTop: -2,
    marginBottom: 4,
  },
  progressTrack: {
    height: 7,
    borderRadius: 3.5,
    flexDirection: 'row',
    overflow: 'hidden',
    width: '100%',
  },
  progressSegment: {
    height: '100%',
  },
  progressMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
  },

  meta:    { gap: Spacing['2'] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  actions:   { gap: Spacing['3'], marginTop: Spacing['1'] },
  actionBtn: { height: 52, borderRadius: Radius.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionPrimary:     {},
  actionPrimaryText: { fontWeight: '700', fontSize: 15 },
  actionSecondaryText: { fontWeight: '600', fontSize: 15 },
});
