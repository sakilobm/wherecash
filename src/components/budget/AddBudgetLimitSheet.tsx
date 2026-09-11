/**
 * @file AddBudgetLimitSheet.tsx
 * @architecture Presentation Layer — Extracted Feature Modal
 * @description Modern, interactive budget limit creator/editor sheet:
 *   - Category selector chips with icons and theme colors
 *   - Quick increment chips (+₹500, +₹1,000, +₹5,000)
 *   - On-demand calculator keypad toggle (CALCULATOR_KEYS, live expression evaluation)
 *   - Keyboard clearance via KeyboardAvoidingSheet
 * @associatedFiles src/utils/calculator.ts, src/features/budget/hooks/useBudgetScreen.ts
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, Modal, TextInput,
  Platform, Pressable, ScrollView, Keyboard,
} from 'react-native';
import { KeyboardAvoidingSheet } from '@components/KeyboardAvoidingSheet';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { useBudgetStore } from '@store/budgetStore';
import { Spacing, Radius } from '@constants/index';
import { toast } from '@store/toastStore';
import {
  CALCULATOR_KEYS,
  applyCalculatorKey,
  evaluateExpression,
} from '../../utils/calculator';

interface Props {
  visible: boolean;
  onClose: () => void;
  defaultCategory?: string;
}

export const CATEGORIES = [
  { id: 'housing', label: 'Housing', icon: 'home-outline', color: '#3B82F6' },
  { id: 'food', label: 'Food', icon: 'restaurant-outline', color: '#10B981' },
  { id: 'transport', label: 'Transport', icon: 'car-outline', color: '#38BDF8' },
  { id: 'health', label: 'Health', icon: 'fitness-outline', color: '#EF4444' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline', color: '#8B5CF6' },
  { id: 'shopping', label: 'Shopping', icon: 'bag-handle-outline', color: '#EC4899' },
  { id: 'education', label: 'Education', icon: 'school-outline', color: '#F59E0B' },
  { id: 'savings', label: 'Savings', icon: 'wallet-outline', color: '#10B981' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline', color: '#6B7280' },
];

export function AddBudgetLimitSheet({ visible, onClose, defaultCategory }: Props) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();
  const addBudget = useBudgetStore((s) => s.addBudget);
  const updateBudget = useBudgetStore((s) => s.updateBudget);
  const existingBudgets = useBudgetStore((s) => s.budgets);

  const [category, setCategory] = useState('food');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (visible) {
      const cat = defaultCategory || 'food';
      setCategory(cat);
      
      const existing = existingBudgets.find((b) => b.category === cat);
      if (existing) {
        setLimit(existing.limit.toString());
      } else {
        setLimit('');
      }
      setError(null);
      setShowCalculator(false);
    }
  }, [visible, defaultCategory, existingBudgets]);

  const existing = existingBudgets.find((b) => b.category === category);
  const catInfo = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];

  const scale = useSharedValue(0.86);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: scale.value }));

  const handleShow = () => { scale.value = withSpring(1, { damping: 18, stiffness: 220 }); };
  const handleHide = () => { scale.value = withSpring(0.86, { damping: 18, stiffness: 220 }); };

  // Select Category
  const handleSelectCategory = (catId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCategory(catId);
    const existingForCat = existingBudgets.find((b) => b.category === catId);
    if (existingForCat) {
      setLimit(existingForCat.limit.toString());
    } else {
      setLimit('');
    }
    setError(null);
  };

  // Quick Presets
  const handleAddPreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentVal = evaluateExpression(limit) || 0;
    const newVal = currentVal + amount;
    setLimit(String(newVal));
    setError(null);
  };

  const handleClearLimit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLimit('');
    setError(null);
  };

  // Expression evaluation for calculator
  const hasOperation = useMemo(() => /[+\-×÷]/.test(limit), [limit]);
  const evaluatedLimit = useMemo(() => evaluateExpression(limit), [limit]);

  const handleSubmit = () => {
    const evaluated = evaluateExpression(limit);
    if (isNaN(evaluated) || evaluated <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter a valid limit amount');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (existing) {
      updateBudget(existing.id, { limit: evaluated });
      toast.success(`Monthly limit for ${catInfo.label} updated to ${symbol}${evaluated}`);
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      addBudget({
        id: `b-${Date.now()}`,
        userId: 'user-1',
        category,
        limit: evaluated,
        spent: 0,
        currency: 'USD',
        period: 'monthly',
        startDate: firstDay,
        endDate: lastDay,
        color: catInfo.color,
      });
      toast.success(`Monthly limit of ${symbol}${evaluated} set for ${catInfo.label}`);
    }

    setLimit('');
    setError(null);
    onClose();
  };

  const cardBg = colors.surface.sheet;
  const inputBg = colors.surface.input;
  const dividerC = colors.glass.background;

  return (
    <Modal
      visible={visible} transparent animationType="none"
      onRequestClose={onClose} onShow={handleShow} onDismiss={handleHide}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
        <BlurView intensity={isDark ? 40 : 30} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.medium }]} />
      </Pressable>

      <View style={s.outer} pointerEvents="box-none">
        <Animated.View style={[s.sheet, sheetStyle, { backgroundColor: cardBg, shadowColor: colors.black }]}>
          <View style={[s.handle, { backgroundColor: colors.text.tertiary + '35' }]} />

          <View style={s.header}>
            <View>
              <AppText variant="headingMD" color={colors.text.primary}>
                {existing ? 'Edit Budget Limit' : 'Set Category Budget'}
              </AppText>
              <AppText variant="caption" color={colors.text.tertiary} style={{ marginTop: 2 }}>
                {existing ? 'Update monthly spending cap' : 'Establish monthly spending limit'}
              </AppText>
            </View>
            <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}>
              <Ionicons name="close" size={17} color={colors.text.secondary} />
            </Pressable>
          </View>

          <KeyboardAvoidingSheet
            dividerColor={dividerC}
            contentStyle={s.body}
            footer={
              <Pressable
                onPress={handleSubmit}
                style={({ pressed }) => [
                  s.submitBtn,
                  { backgroundColor: catInfo.color, opacity: pressed ? 0.85 : 1 }
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <AppText style={[s.submitBtnText, { color: '#FFFFFF' }]}>
                  {existing ? `Update ${catInfo.label} Limit` : `Set ${catInfo.label} Limit`}
                </AppText>
              </Pressable>
            }
          >
            <View style={s.form}>
              
              {/* Error box */}
              {!!error && (
                <View style={[s.errorBox, { backgroundColor: colors.status.expense + '15', borderColor: colors.status.expense + '30' }]}>
                  <Ionicons name="alert-circle" size={16} color={colors.status.expense} />
                  <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '600', flex: 1 }}>{error}</AppText>
                </View>
              )}

              {/* 1. Category Selector Carousel */}
              <View style={s.sectionBlock}>
                <AppText variant="labelSM" color={colors.text.secondary} style={s.sectionTitle}>
                  Select Category
                </AppText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.categoryChipsScroll}
                >
                  {CATEGORIES.map((c) => {
                    const isSelected = c.id === category;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => handleSelectCategory(c.id)}
                        style={[
                          s.categoryChip,
                          {
                            backgroundColor: isSelected ? c.color + '22' : colors.glass.background,
                            borderColor: isSelected ? c.color : colors.glass.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={c.icon as any}
                          size={15}
                          color={isSelected ? c.color : colors.text.secondary}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            color: isSelected ? c.color : colors.text.secondary,
                            fontWeight: isSelected ? '700' : '500',
                          }}
                        >
                          {c.label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              {/* 2. Active Category Banner */}
              <View style={[s.categoryBanner, { backgroundColor: catInfo.color + '12', borderColor: catInfo.color + '30' }]}>
                <View style={[s.catBannerIconBox, { backgroundColor: catInfo.color + '22' }]}>
                  <Ionicons name={catInfo.icon as any} size={22} color={catInfo.color} />
                </View>
                <View style={s.catBannerInfo}>
                  <AppText variant="labelLG" color={colors.text.primary} style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700' }}>
                    {catInfo.label}
                  </AppText>
                  <AppText variant="caption" color={colors.text.tertiary}>
                    {existing ? `Current limit: ${symbol}${existing.limit.toFixed(0)} / mo` : 'No active limit set yet'}
                  </AppText>
                </View>
              </View>

              {/* 3. Input Limit Header + Calculator Mode Toggle */}
              <View style={s.inputGroup}>
                <View style={s.inputHeaderRow}>
                  <AppText variant="labelSM" color={colors.text.secondary}>Monthly Spending Limit</AppText>
                  
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      Keyboard.dismiss();
                      setShowCalculator(!showCalculator);
                    }}
                    style={[
                      s.calcToggleBtn,
                      {
                        backgroundColor: showCalculator ? catInfo.color + '20' : colors.glass.backgroundMid,
                        borderColor: showCalculator ? catInfo.color : colors.glass.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="calculator-outline"
                      size={14}
                      color={showCalculator ? catInfo.color : colors.text.secondary}
                    />
                    <AppText
                      variant="caption"
                      style={{
                        color: showCalculator ? catInfo.color : colors.text.secondary,
                        fontWeight: '700',
                        fontSize: 11,
                      }}
                    >
                      {showCalculator ? 'Keyboard' : 'Calculator'}
                    </AppText>
                  </Pressable>
                </View>

                {/* Main Input Display */}
                <View style={[s.inputWrap, { backgroundColor: inputBg, borderColor: colors.glass.border }]}>
                  <AppText style={[s.symbolText, { color: catInfo.color }]}>{symbol}</AppText>
                  {showCalculator ? (
                    <AppText
                      style={[s.calcDisplayText, { color: colors.text.primary }]}
                      numberOfLines={1}
                    >
                      {limit || '0'}
                    </AppText>
                  ) : (
                    <TextInput
                      style={[s.input, { color: colors.text.primary }]}
                      keyboardType="decimal-pad"
                      value={limit}
                      onChangeText={(val) => { setLimit(val); setError(null); }}
                      placeholder="0.00"
                      placeholderTextColor={colors.text.tertiary}
                    />
                  )}
                </View>

                {/* Live Arithmetic Result Banner (when using calculator operators) */}
                {hasOperation && (
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      const next = applyCalculatorKey(limit || '0', '=');
                      setLimit(next);
                    }}
                    style={[s.liveResultRow, { backgroundColor: catInfo.color + '12', borderColor: catInfo.color + '35' }]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText variant="caption" color={colors.text.tertiary}>TOTAL</AppText>
                      <AppText style={[s.liveResultText, { color: catInfo.color }]}>
                        = {symbol}{evaluatedLimit.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </AppText>
                    </View>
                    <AppText variant="caption" color={catInfo.color} style={{ fontWeight: '700' }}>
                      Tap = to apply
                    </AppText>
                  </Pressable>
                )}

                {/* 4. Quick Increment Preset Chips */}
                <View style={s.presetRow}>
                  <Pressable
                    onPress={() => handleAddPreset(500)}
                    style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                  >
                    <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '600' }}>
                      +{symbol}500
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => handleAddPreset(1000)}
                    style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                  >
                    <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '600' }}>
                      +{symbol}1,000
                    </AppText>
                  </Pressable>

                  <Pressable
                    onPress={() => handleAddPreset(5000)}
                    style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                  >
                    <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '600' }}>
                      +{symbol}5,000
                    </AppText>
                  </Pressable>

                  {limit !== '' && (
                    <Pressable
                      onPress={handleClearLimit}
                      style={[s.presetChip, { backgroundColor: colors.status.expense + '12', borderColor: colors.status.expense + '25' }]}
                    >
                      <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '700' }}>
                        Clear
                      </AppText>
                    </Pressable>
                  )}
                </View>
              </View>

              {/* 5. On-Demand Calculator Keypad */}
              {showCalculator && (
                <Animated.View entering={FadeIn.duration(180)} style={s.keypadContainer}>
                  {CALCULATOR_KEYS.map((row, rIdx) => (
                    <View key={rIdx} style={s.keypadRow}>
                      {row.map((key) => {
                        const isOperator = ['+', '-', '×', '÷'].includes(key);
                        const isClear = key === 'C';
                        return (
                          <Pressable
                            key={key}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const next = applyCalculatorKey(limit || '0', key);
                              setLimit(next);
                            }}
                            style={({ pressed }) => [
                              s.keypadBtn,
                              {
                                backgroundColor: isOperator
                                  ? catInfo.color + '18'
                                  : isClear
                                  ? colors.status.expense + '15'
                                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF'),
                                borderColor: isOperator
                                  ? catInfo.color + '35'
                                  : isClear
                                  ? colors.status.expense + '30'
                                  : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                opacity: pressed ? 0.6 : 1,
                              },
                            ]}
                          >
                            <AppText
                              style={[
                                s.keypadBtnText,
                                {
                                  color: isOperator ? catInfo.color : isClear ? colors.status.expense : colors.text.primary,
                                  fontWeight: isOperator || isClear ? '800' : '600',
                                  fontSize: isOperator ? 19 : 17,
                                },
                              ]}
                            >
                              {key}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}

                  {/* Calculator Row 5: [ ⌫ Backspace ] and [ = Calculate Total ] */}
                  <View style={s.keypadRow}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const next = applyCalculatorKey(limit || '0', '⌫');
                        setLimit(next);
                      }}
                      style={({ pressed }) => [
                        s.keypadBackspaceBtn,
                        {
                          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
                          borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                          opacity: pressed ? 0.6 : 1,
                        },
                      ]}
                    >
                      <Ionicons name="backspace-outline" size={20} color={colors.text.secondary} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        const next = applyCalculatorKey(limit || '0', '=');
                        setLimit(next);
                      }}
                      style={({ pressed }) => [
                        s.keypadEqualsBtn,
                        {
                          backgroundColor: catInfo.color,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <AppText style={s.keypadEqualsBtnText}>= Calculate</AppText>
                    </Pressable>
                  </View>
                </Animated.View>
              )}

            </View>
          </KeyboardAvoidingSheet>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
    maxHeight: '92%',
  },
  handle: { width: 38, height: 4.5, borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['5'],
    paddingTop: Spacing['4'],
    paddingBottom: Spacing['3'],
  },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing['5'], paddingBottom: Spacing['4'] },
  form: { gap: Spacing['3'], paddingTop: Spacing['2'] },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  sectionBlock: { gap: 6 },
  sectionTitle: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 11 },
  categoryChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  categoryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
  },
  catBannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catBannerInfo: {
    flex: 1,
    gap: 2,
  },
  inputGroup: { gap: 6 },
  inputHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calcToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing['4'],
  },
  symbolText: { fontSize: 18, fontWeight: '700', marginRight: 6 },
  input: { flex: 1, fontSize: 18, fontWeight: '600', padding: 0 },
  calcDisplayText: { flex: 1, fontSize: 18, fontWeight: '700' },
  liveResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  liveResultText: { fontSize: 13, fontWeight: '700' },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  submitBtn: {
    flexDirection: 'row',
    height: 50,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { fontSize: 16, fontWeight: '700' },

  // Keypad styles
  keypadContainer: {
    gap: 6,
    marginTop: 4,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 6,
  },
  keypadBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnText: {
    textAlign: 'center',
  },
  keypadBackspaceBtn: {
    flex: 1,
    height: 42,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadEqualsBtn: {
    flex: 3,
    height: 42,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadEqualsBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
