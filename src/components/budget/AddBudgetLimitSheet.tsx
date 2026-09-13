/**
 * @file AddBudgetLimitSheet.tsx
 * @architecture Presentation Layer — Extracted Feature Modal
 * @description Ultra-clean, minimalist budget amount sheet (Apple/Ivy Wallet inspired):
 *   - Direct 1-tap amount entry: Big bold hero display, quick chips (+₹500, +₹1,000, +₹5,000, Clear).
 *   - Advanced Settings Drawer: Revealed only via subtle [⚙️] icon in header (Delete budget, Reset).
 *   - On-demand calculator toggle for arithmetic calculations.
 *   - Zero visual clutter, zero cognitive friction, saves in 2 seconds.
 * @associatedFiles src/utils/calculator.ts, src/features/budget/hooks/useBudgets.ts
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View, StyleSheet, Modal, TextInput,
  Pressable, ScrollView, Keyboard, Alert,
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
import { useBudgets } from '@features/budget/hooks/useBudgets';
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
  const deleteBudget = useBudgetStore((s) => s.deleteBudget);
  const existingBudgets = useBudgetStore((s) => s.budgets);
  const { spendingBreakdown } = useBudgets();

  const [category, setCategory] = useState('food');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

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
      setShowAdvancedSettings(false);
    }
  }, [visible, defaultCategory, existingBudgets]);

  const existing = existingBudgets.find((b) => b.category === category);
  const catInfo = CATEGORIES.find((c) => c.id === category) || CATEGORIES[0];
  const catStats = spendingBreakdown.find((s) => s.category === category);

  const spentSoFar = catStats ? catStats.spent : (existing?.spent ?? 0);
  const currentLimit = existing ? existing.limit : 0;
  const currentRemaining = currentLimit - spentSoFar;

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
    setShowAdvancedSettings(false);
  };

  // Quick Preset Chips
  const handleAddPreset = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const currentVal = evaluateExpression(limit) || 0;
    setLimit(String(currentVal + amount));
    setError(null);
  };

  const handleClearLimit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLimit('');
    setError(null);
  };

  // Arithmetic calculations
  const hasOperation = useMemo(() => /[+\-×÷]/.test(limit), [limit]);
  const evaluatedLimit = useMemo(() => evaluateExpression(limit), [limit]);

  // Primary Action Save
  const handleSave = () => {
    const val = evaluateExpression(limit);
    if (isNaN(val) || val <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Please enter a valid budget amount');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (existing) {
      updateBudget(existing.id, { limit: val });
      toast.success(`${catInfo.label} budget set to ${symbol}${val.toLocaleString()}`);
    } else {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

      addBudget({
        id: `b-${Date.now()}`,
        userId: 'user-1',
        category,
        limit: val,
        spent: 0,
        currency: 'USD',
        period: 'monthly',
        startDate: firstDay,
        endDate: lastDay,
        color: catInfo.color,
      });
      toast.success(`${catInfo.label} budget established at ${symbol}${val.toLocaleString()}`);
    }

    setLimit('');
    setError(null);
    onClose();
  };

  // Advanced Delete Action
  const handleDeleteBudget = () => {
    if (!existing) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      `Delete ${catInfo.label} Budget?`,
      'This will remove the monthly spending limit for this category. Your transaction history will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteBudget(existing.id);
            toast.success(`${catInfo.label} budget removed`);
            onClose();
          },
        },
      ]
    );
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

          {/* 1. Ultra-Clean Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <View style={[s.iconBox, { backgroundColor: catInfo.color + '20' }]}>
                <Ionicons name={catInfo.icon as any} size={18} color={catInfo.color} />
              </View>
              <View>
                <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '700' }}>
                  {catInfo.label} Budget
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>
                  {existing ? `Current: ${symbol}${currentLimit.toLocaleString()} · Spent: ${symbol}${spentSoFar.toLocaleString()}` : 'Set monthly spending limit'}
                </AppText>
              </View>
            </View>

            {/* Header Right Actions: [⚙️ Settings] + [✕ Close] */}
            <View style={s.headerRight}>
              {existing && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setShowAdvancedSettings(!showAdvancedSettings);
                  }}
                  style={[
                    s.settingsBtn,
                    {
                      backgroundColor: showAdvancedSettings ? colors.brand.primary + '25' : colors.glass.backgroundMid,
                      borderColor: showAdvancedSettings ? colors.brand.primary : 'transparent',
                    },
                  ]}
                >
                  <Ionicons
                    name="settings-outline"
                    size={16}
                    color={showAdvancedSettings ? colors.brand.primary : colors.text.secondary}
                  />
                </Pressable>
              )}
              <Pressable onPress={onClose} style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}>
                <Ionicons name="close" size={17} color={colors.text.secondary} />
              </Pressable>
            </View>
          </View>

          <KeyboardAvoidingSheet
            dividerColor={dividerC}
            contentStyle={s.body}
            footer={
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  s.submitBtn,
                  { backgroundColor: catInfo.color, opacity: pressed ? 0.85 : 1 }
                ]}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <AppText style={s.submitBtnText}>
                  Save Budget {evaluatedLimit > 0 ? `(${symbol}${evaluatedLimit.toLocaleString()})` : ''}
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

              {/* 2. Hidden Advanced Settings Drawer (Only visible when ⚙️ is tapped) */}
              {showAdvancedSettings && existing && (
                <Animated.View entering={FadeIn.duration(160)} style={[s.advancedBox, { backgroundColor: colors.background.card, borderColor: colors.glass.border }]}>
                  <View style={s.advancedHeader}>
                    <Ionicons name="options-outline" size={15} color={catInfo.color} />
                    <AppText variant="caption" color={colors.text.primary} style={{ fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Advanced Budget Controls
                    </AppText>
                  </View>

                  {/* Feature 1: Quick Extend / Top-Up Allowance */}
                  <View style={s.extendSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '700' }}>
                        Extend Budget (+Top-Up Allowance)
                      </AppText>
                      <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 10 }}>
                        Current Cap: {symbol}{currentLimit.toLocaleString()}
                      </AppText>
                    </View>

                    <View style={s.extendChipsRow}>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <Pressable
                          key={amt}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            const newTotal = currentLimit + amt;
                            setLimit(String(newTotal));
                            toast.info(`Extended by +${symbol}${amt.toLocaleString()} → New Cap: ${symbol}${newTotal.toLocaleString()}`);
                          }}
                          style={[s.extendChip, { backgroundColor: catInfo.color + '15', borderColor: catInfo.color + '30' }]}
                        >
                          <Ionicons name="arrow-up" size={10} color={catInfo.color} />
                          <AppText variant="caption" style={{ color: catInfo.color, fontWeight: '800', fontSize: 11 }}>
                            +{symbol}{amt.toLocaleString()}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Feature 2: Quick Cap Presets */}
                  <View style={s.extendSection}>
                    <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '700' }}>
                      Quick Cap Presets
                    </AppText>
                    <View style={s.extendChipsRow}>
                      {[2000, 5000, 10000, 20000].map((amt) => (
                        <Pressable
                          key={amt}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setLimit(String(amt));
                          }}
                          style={[s.extendChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                        >
                          <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '700', fontSize: 11 }}>
                            {symbol}{amt.toLocaleString()}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Feature 3: Actions: Reset & Delete */}
                  <View style={s.advancedActionsRow}>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLimit('0');
                      }}
                      style={[s.advancedActionBtn, { backgroundColor: colors.glass.background }]}
                    >
                      <Ionicons name="refresh-outline" size={13} color={colors.text.primary} />
                      <AppText variant="caption" color={colors.text.primary} style={{ fontWeight: '600' }}>Reset to 0</AppText>
                    </Pressable>

                    <Pressable
                      onPress={handleDeleteBudget}
                      style={[s.advancedActionBtn, { backgroundColor: colors.status.expense + '15' }]}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.status.expense} />
                      <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '700' }}>Delete Budget</AppText>
                    </Pressable>
                  </View>
                </Animated.View>
              )}

              {/* Exact Status Card with 2-Column Metrics & Vertical Divider */}
              <View style={[s.statusCard, { backgroundColor: catInfo.color + '10', borderColor: catInfo.color + '28' }]}>
                <View style={s.statusCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={[s.catIconSmallBox, { backgroundColor: catInfo.color + '25' }]}>
                      <Ionicons name={catInfo.icon as any} size={16} color={catInfo.color} />
                    </View>
                    <View>
                      <AppText variant="labelMD" color={colors.text.primary} style={{ fontWeight: '800', letterSpacing: 0.3 }}>
                        {catInfo.label.toUpperCase()}
                      </AppText>
                      <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 10 }}>
                        {existing ? 'Monthly Spending Limit' : 'New Spending Target'}
                      </AppText>
                    </View>
                  </View>

                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <View style={[s.activeLimitBadge, { backgroundColor: catInfo.color + '22' }]}>
                      <AppText variant="caption" style={{ color: catInfo.color, fontWeight: '800', fontSize: 11 }}>
                        {existing && evaluatedLimit > 0 && evaluatedLimit !== currentLimit
                          ? `New: ${symbol}${evaluatedLimit.toLocaleString()}`
                          : `Cap: ${symbol}${currentLimit > 0 ? currentLimit.toLocaleString() : (evaluatedLimit || 0).toLocaleString()}`}
                      </AppText>
                    </View>

                    {existing && evaluatedLimit > 0 && evaluatedLimit !== currentLimit && (
                      <View style={[s.diffPillSmall, { backgroundColor: (evaluatedLimit > currentLimit ? colors.status.income : colors.status.warning) + '20' }]}>
                        <Ionicons
                          name={evaluatedLimit > currentLimit ? 'arrow-up' : 'arrow-down'}
                          size={10}
                          color={evaluatedLimit > currentLimit ? colors.status.income : colors.status.warning}
                        />
                        <AppText
                          variant="caption"
                          style={{
                            color: evaluatedLimit > currentLimit ? colors.status.income : colors.status.warning,
                            fontWeight: '800',
                            fontSize: 9.5,
                          }}
                        >
                          {evaluatedLimit > currentLimit
                            ? `+${symbol}${(evaluatedLimit - currentLimit).toLocaleString()}`
                            : `-${symbol}${Math.abs(evaluatedLimit - currentLimit).toLocaleString()}`}
                        </AppText>
                      </View>
                    )}
                  </View>
                </View>

                {/* 2-Column Metrics with Vertical Divider */}
                <View style={s.statusMetricsRow}>
                  <View style={s.metricCol}>
                    <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 11 }}>
                      Spent so far
                    </AppText>
                    <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '800' }}>
                      {symbol}{spentSoFar.toLocaleString()}
                    </AppText>
                  </View>

                  <View style={s.metricDivider} />

                  <View style={s.metricCol}>
                    <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 11 }}>
                      {existing && evaluatedLimit > 0 && evaluatedLimit !== currentLimit ? 'New Remaining' : 'Remaining'}
                    </AppText>
                    <AppText
                      variant="labelLG"
                      style={{
                        fontWeight: '800',
                        color: (existing && evaluatedLimit > 0 && evaluatedLimit !== currentLimit
                          ? (evaluatedLimit - spentSoFar)
                          : currentRemaining) < 0
                          ? colors.status.expense
                          : colors.status.income,
                      }}
                    >
                      {symbol}{(existing && evaluatedLimit > 0 && evaluatedLimit !== currentLimit
                        ? (evaluatedLimit - spentSoFar)
                        : (existing ? currentRemaining : Math.max((evaluatedLimit || 0) - spentSoFar, 0))).toLocaleString()}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* 4. Big Bold Hero Numeric Display */}
              <View style={[s.heroAmountCard, { backgroundColor: inputBg, borderColor: colors.glass.border }]}>
                <View style={s.heroAmountRow}>
                  <AppText style={[s.heroCurrency, { color: catInfo.color }]}>{symbol}</AppText>
                  {showCalculator ? (
                    <AppText
                      style={[s.heroInputDisplay, { color: colors.text.primary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {limit || '0'}
                    </AppText>
                  ) : (
                    <TextInput
                      style={[s.heroInput, { color: colors.text.primary }]}
                      keyboardType="decimal-pad"
                      value={limit}
                      onChangeText={(val) => { setLimit(val); setError(null); }}
                      placeholder="0"
                      placeholderTextColor={colors.text.tertiary + '60'}
                      autoFocus={!existing}
                    />
                  )}
                </View>

                {/* Optional Calculator Switcher Icon */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    Keyboard.dismiss();
                    setShowCalculator(!showCalculator);
                  }}
                  style={[s.calcMiniBtn, { backgroundColor: showCalculator ? catInfo.color + '20' : colors.glass.backgroundMid }]}
                >
                  <Ionicons
                    name="calculator-outline"
                    size={15}
                    color={showCalculator ? catInfo.color : colors.text.secondary}
                  />
                  <AppText variant="caption" style={{ color: showCalculator ? catInfo.color : colors.text.secondary, fontSize: 10, fontWeight: '700' }}>
                    {showCalculator ? 'Keyboard' : 'Calc'}
                  </AppText>
                </Pressable>
              </View>

              {/* Live Arithmetic Result Banner (if user typed + / - / * in calc) */}
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

              {/* 5. 1-Tap Quick Increment Chips */}
              <View style={s.presetRow}>
                <Pressable
                  onPress={() => handleAddPreset(500)}
                  style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                >
                  <AppText variant="caption" color={colors.text.secondary} style={s.presetText}>
                    +{symbol}500
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => handleAddPreset(1000)}
                  style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                >
                  <AppText variant="caption" color={colors.text.secondary} style={s.presetText}>
                    +{symbol}1,000
                  </AppText>
                </Pressable>

                <Pressable
                  onPress={() => handleAddPreset(5000)}
                  style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                >
                  <AppText variant="caption" color={colors.text.secondary} style={s.presetText}>
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

              {/* 6. Optional On-Demand Calculator Keypad (Only when Calc is clicked) */}
              {showCalculator && (
                <Animated.View entering={FadeIn.duration(160)} style={s.keypadContainer}>
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

                  {/* Calculator Row 5 */}
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
                        { backgroundColor: catInfo.color, opacity: pressed ? 0.85 : 1 },
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
    maxHeight: '90%',
  },
  handle: { width: 38, height: 4.5, borderRadius: 3, alignSelf: 'center', marginTop: 10 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing['5'],
    paddingTop: Spacing['3'],
    paddingBottom: Spacing['2'],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

  // Advanced settings drawer
  advancedBox: {
    padding: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 10,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  extendSection: {
    gap: 6,
  },
  extendChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  extendChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  advancedActionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  advancedActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.md,
  },

  // Exact 2-Column Status Card Styles
  statusCard: {
    padding: 13,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 10,
  },
  statusCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catIconSmallBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeLimitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  diffPillSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  statusMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  metricCol: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
    marginHorizontal: 12,
  },

  // Big Bold Hero Numeric Display
  heroAmountCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroCurrency: {
    fontSize: 28,
    fontWeight: '800',
    marginRight: 6,
  },
  heroInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    padding: 0,
  },
  heroInputDisplay: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
  },
  calcMiniBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },

  liveResultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  liveResultText: { fontSize: 13, fontWeight: '700' },

  // Presets
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetText: {
    fontWeight: '700',
    fontSize: 12,
  },

  submitBtn: {
    flexDirection: 'row',
    height: 52,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Keypad
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
