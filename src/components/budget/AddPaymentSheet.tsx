/**
 * @file AddPaymentSheet.tsx
 * @architecture Presentation Layer — UI Component (Interactive 2-Step Flow)
 * @description Ultra-clean, minimal, 2-step progressive disclosure sheet for scheduling planned payments:
 *   - Step 1: Big prominent Segmented Switch (Monthly Recurring vs One-time) + Big Hero Numeric Input + Collapsible Template Dropdown
 *   - Step 2: Date, Category Capsule & Account Selection (Streamlined final confirmation)
 *   - Smooth animated slide transitions & haptic feedback between steps
 * @associatedFiles src/features/budget/hooks/usePlannedPaymentForm.ts, src/app/(tabs)/budget.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, Modal, TextInput,
  Platform, Pressable, ScrollView,
  ActivityIndicator,
} from 'react-native';
import { KeyboardAvoidingSheet } from '@components/KeyboardAvoidingSheet';
import { DatePickerField } from '@components/DatePickerField';
import { BlurView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, FadeIn, FadeInLeft, FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { CategoryFormSheet } from '@components/CategoryFormSheet';
import { AccountsSheet } from '@components/AccountsSheet';
import { usePlannedPaymentForm, type PlannedPaymentFormData } from '@features/budget/hooks/usePlannedPaymentForm';
import { useTheme } from '@hooks/useTheme';
import { useFormatCurrency } from '@hooks/useFormatCurrency';
import { Spacing, Radius } from '@constants/index';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: PlannedPaymentFormData) => void;
}

// Quick Bill Templates available inside collapsible dropdown
const QUICK_TEMPLATES = [
  { id: 'netflix', label: 'Netflix Subscription', title: 'Netflix', icon: 'film-outline', category: 'entertainment', color: '#E50914', amount: 649 },
  { id: 'spotify', label: 'Spotify Premium', title: 'Spotify', icon: 'musical-notes-outline', category: 'entertainment', color: '#1DB954', amount: 119 },
  { id: 'rent', label: 'House / Room Rent', title: 'Rent', icon: 'home-outline', category: 'housing', color: '#3B82F6', amount: 12000 },
  { id: 'wifi', label: 'WiFi / Fiber Broadband', title: 'WiFi / Internet', icon: 'wifi-outline', category: 'utilities', color: '#06B6D4', amount: 999 },
  { id: 'electricity', label: 'Electricity / EB Bill', title: 'Electricity', icon: 'flash-outline', category: 'utilities', color: '#F59E0B', amount: 1500 },
  { id: 'gym', label: 'Gym / Fitness Membership', title: 'Gym / Fitness', icon: 'barbell-outline', category: 'health', color: '#EF4444', amount: 2000 },
];

export function AddPaymentSheet({ visible, onClose, onSubmit }: Props) {
  const { colors, isDark } = useTheme();
  const { symbol } = useFormatCurrency();
  const [step, setStep] = useState<1 | 2>(1);
  const [createVisible, setCreateVisible] = useState(false);
  const [accountsVisible, setAccountsVisible] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [localStepError, setLocalStepError] = useState<string | null>(null);

  // Clean date display helper
  const formatDisplayDate = (dStr: string) => {
    if (!dStr) return '';
    try {
      const [y, m, d] = dStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dStr;
    }
  };

  const {
    title, setTitle,
    amount, setAmount,
    dueDate, setDueDate,
    category, setCategory,
    accountId, setAccountId,
    isRecurring, setIsRecurring,
    recurringInterval, setRecurringInterval,
    applyTemplate,
    accounts,
    cats,
    handleSubmit,
    reset,
    error,
    isSaving,
  } = usePlannedPaymentForm(onSubmit, onClose);

  useEffect(() => {
    if (visible) {
      reset();
      setStep(1);
      setShowTemplatesDropdown(false);
      setLocalStepError(null);
    }
  }, [visible, reset]);

  const scale = useSharedValue(0.86);
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: scale.value }));

  const handleShow = () => { scale.value = withSpring(1, { damping: 18, stiffness: 220 }); };
  const handleHide = () => { scale.value = withSpring(0.86, { damping: 18, stiffness: 220 }); };

  // Step 1 to Step 2 Transition
  const handleProceedToStep2 = () => {
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalStepError('Please enter a valid bill amount');
      return;
    }
    setLocalStepError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(2);
  };

  const handleBackToStep1 = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(1);
    setLocalStepError(null);
  };

  // Quick increment chips
  const handleAddPreset = (increment: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const curr = parseFloat(amount) || 0;
    setAmount(String(curr + increment));
    setLocalStepError(null);
  };

  const handleClearAmount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount('');
  };

  // Template select: auto-advance to step 2 with haptics
  const handleSelectTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    applyTemplate(tpl);
    setShowTemplatesDropdown(false);
    setLocalStepError(null);
    setTimeout(() => {
      setStep(2);
    }, 180);
  };

  const selectedCategoryObj = cats.find((c) => c.id === category) || {
    id: category,
    label: category.charAt(0).toUpperCase() + category.slice(1),
    icon: 'card-outline',
    color: colors.brand.primary,
  };

  const selectedAccount = accounts.find((a) => a.id === accountId);
  const parsedAmount = parseFloat(amount) || 0;

  const cardBg = colors.surface.sheet;
  const inputBg = colors.surface.input;
  const dividerC = colors.glass.background;
  const activeColor = selectedCategoryObj.color || colors.brand.primary;

  return (
    <>
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

            {/* Top Drag Handle */}
            <View style={[s.handle, { backgroundColor: colors.text.tertiary + '35' }]} />

            {/* Header with Step Indicator */}
            <View style={s.header}>
              <View style={s.headerLeft}>
                {step === 2 && (
                  <Pressable onPress={handleBackToStep1} style={s.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={18} color={colors.text.primary} />
                  </Pressable>
                )}
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText variant="headingMD" color={colors.text.primary} style={{ fontWeight: '800' }}>
                      {step === 1 ? 'Schedule Planned Bill' : 'Confirm Bill Details'}
                    </AppText>
                    {/* Step pill */}
                    <View style={[s.stepPill, { backgroundColor: activeColor + '18', borderColor: activeColor + '35' }]}>
                      <AppText variant="caption" style={{ color: activeColor, fontWeight: '800', fontSize: 10 }}>
                        {step === 1 ? 'Step 1 of 2' : 'Step 2 of 2'}
                      </AppText>
                    </View>
                  </View>
                  <AppText variant="caption" color={colors.text.tertiary} style={{ marginTop: 2 }}>
                    {step === 1 ? 'Choose frequency and amount' : 'Set due date, category & bank account'}
                  </AppText>
                </View>
              </View>

              <Pressable
                onPress={onClose} hitSlop={12}
                style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}
              >
                <Ionicons name="close" size={17} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Body */}
            <KeyboardAvoidingSheet
              dividerColor={dividerC}
              contentStyle={s.body}
              footer={
                step === 1 ? (
                  <Pressable
                    onPress={handleProceedToStep2}
                    style={({ pressed }) => [
                      s.submitBtn,
                      {
                        backgroundColor: activeColor,
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <AppText variant="labelLG" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                      Next: Bill Details {parsedAmount > 0 ? `(${symbol}${parsedAmount.toLocaleString()})` : ''}
                    </AppText>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </Pressable>
                ) : (
                  <View style={s.step2FooterRow}>
                    <Pressable
                      onPress={handleBackToStep1}
                      style={[s.backFooterBtn, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                    >
                      <Ionicons name="arrow-back" size={16} color={colors.text.secondary} />
                      <AppText variant="caption" color={colors.text.secondary} style={{ fontWeight: '700' }}>
                        Back
                      </AppText>
                    </Pressable>

                    <Pressable
                      onPress={handleSubmit}
                      disabled={isSaving}
                      style={({ pressed }) => [
                        s.submitBtn,
                        {
                          flex: 1,
                          backgroundColor: activeColor,
                          opacity: isSaving ? 0.6 : (pressed ? 0.85 : 1),
                        },
                      ]}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={19} color="#FFFFFF" />
                          <AppText variant="labelLG" style={{ color: '#FFFFFF', fontWeight: '800' }}>
                            Schedule {symbol}{parsedAmount.toLocaleString()}
                          </AppText>
                        </>
                      )}
                    </Pressable>
                  </View>
                )
              }
            >
              <View style={{ opacity: isSaving ? 0.65 : 1, gap: 14 }} pointerEvents={isSaving ? 'none' : 'auto'}>
                {(error || localStepError) && (
                  <View style={[s.errorBanner, { backgroundColor: colors.status.expense + '15', borderColor: colors.status.expense + '30' }]}>
                    <Ionicons name="alert-circle-outline" size={16} color={colors.status.expense} />
                    <AppText style={[s.errorText, { color: colors.status.expense }]}>{error || localStepError}</AppText>
                  </View>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    STEP 1: RECURRING SEGMENT + BIG AMOUNT + TEMPLATE DROPDOWN
                ══════════════════════════════════════════════════════════════ */}
                {step === 1 && (
                  <Animated.View entering={FadeInLeft.duration(180)} style={{ gap: 14 }}>
                    
                    {/* 1. Clear, High-Contrast Segmented Switch: Monthly Recurring vs One-time */}
                    <View style={[s.segmentedControl, { backgroundColor: colors.background.card, borderColor: colors.glass.border }]}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsRecurring(true);
                        }}
                        style={[
                          s.segmentTab,
                          isRecurring && [s.segmentTabActive, { backgroundColor: activeColor, borderColor: activeColor }]
                        ]}
                      >
                        <Ionicons
                          name="repeat"
                          size={16}
                          color={isRecurring ? '#FFFFFF' : colors.text.secondary}
                        />
                        <AppText
                          variant="labelMD"
                          style={{
                            fontWeight: '800',
                            color: isRecurring ? '#FFFFFF' : colors.text.secondary,
                            fontSize: 13,
                          }}
                        >
                          Monthly Recurring
                        </AppText>
                      </Pressable>

                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setIsRecurring(false);
                        }}
                        style={[
                          s.segmentTab,
                          !isRecurring && [s.segmentTabActive, { backgroundColor: activeColor, borderColor: activeColor }]
                        ]}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={16}
                          color={!isRecurring ? '#FFFFFF' : colors.text.secondary}
                        />
                        <AppText
                          variant="labelMD"
                          style={{
                            fontWeight: '800',
                            color: !isRecurring ? '#FFFFFF' : colors.text.secondary,
                            fontSize: 13,
                          }}
                        >
                          One-Time Bill
                        </AppText>
                      </Pressable>
                    </View>

                    {/* 2. Big Bold Hero Numeric Amount Card */}
                    <View style={[s.heroAmountCard, { backgroundColor: inputBg, borderColor: colors.glass.border }]}>
                      <View style={s.heroAmountRow}>
                        <AppText style={[s.heroCurrency, { color: activeColor }]}>
                          {symbol}
                        </AppText>
                        <TextInput
                          style={[s.heroInput, { color: colors.text.primary }]}
                          keyboardType="decimal-pad"
                          value={amount}
                          onChangeText={(v) => { setAmount(v); setLocalStepError(null); }}
                          placeholder="0"
                          placeholderTextColor={colors.text.tertiary + '50'}
                          autoFocus
                        />
                      </View>
                    </View>

                    {/* 3. Quick 1-Tap Increment Chips */}
                    <View style={s.presetRow}>
                      {[500, 1000, 2000, 5000].map((amt) => (
                        <Pressable
                          key={amt}
                          onPress={() => handleAddPreset(amt)}
                          style={[s.presetChip, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                        >
                          <AppText variant="caption" color={colors.text.secondary} style={s.presetText}>
                            +{symbol}{amt >= 1000 ? `${amt / 1000}k` : amt}
                          </AppText>
                        </Pressable>
                      ))}
                      {amount !== '' && (
                        <Pressable
                          onPress={handleClearAmount}
                          style={[s.presetChip, { backgroundColor: colors.status.expense + '15', borderColor: colors.status.expense + '30' }]}
                        >
                          <AppText variant="caption" style={{ color: colors.status.expense, fontWeight: '700' }}>
                            Clear
                          </AppText>
                        </Pressable>
                      )}
                    </View>

                    {/* 4. Collapsible Template Dropdown (Kept hidden by default) */}
                    <View style={s.dropdownContainer}>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowTemplatesDropdown(!showTemplatesDropdown);
                        }}
                        style={[s.dropdownTrigger, { backgroundColor: colors.glass.background, borderColor: colors.glass.border }]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Ionicons name="flash-outline" size={15} color={colors.brand.primary} />
                          <AppText variant="caption" color={colors.text.primary} style={{ fontWeight: '700' }}>
                            Use Popular Bill Template
                          </AppText>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 11 }}>
                            {showTemplatesDropdown ? 'Hide' : 'Select'}
                          </AppText>
                          <Ionicons
                            name={showTemplatesDropdown ? 'chevron-up' : 'chevron-down'}
                            size={14}
                            color={colors.text.tertiary}
                          />
                        </View>
                      </Pressable>

                      {showTemplatesDropdown && (
                        <Animated.View entering={FadeIn.duration(160)} style={[s.dropdownMenu, { backgroundColor: colors.background.card, borderColor: colors.glass.border }]}>
                          {QUICK_TEMPLATES.map((tpl) => (
                            <Pressable
                              key={tpl.id}
                              onPress={() => handleSelectTemplate(tpl)}
                              style={({ pressed }) => [
                                s.dropdownItem,
                                { backgroundColor: pressed ? colors.glass.backgroundMid : 'transparent' }
                              ]}
                            >
                              <View style={[s.templateIconCircle, { backgroundColor: tpl.color + '20' }]}>
                                <Ionicons name={tpl.icon as any} size={15} color={tpl.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <AppText variant="caption" style={{ color: colors.text.primary, fontWeight: '700', fontSize: 12 }}>
                                  {tpl.label}
                                </AppText>
                                <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 10 }}>
                                  Approx {symbol}{tpl.amount.toLocaleString()} · {tpl.category}
                                </AppText>
                              </View>
                              <Ionicons name="arrow-forward" size={13} color={colors.text.tertiary} />
                            </Pressable>
                          ))}
                        </Animated.View>
                      )}
                    </View>

                  </Animated.View>
                )}

                {/* ══════════════════════════════════════════════════════════════
                    STEP 2: DUE DATE, CATEGORY & ACCOUNT
                ══════════════════════════════════════════════════════════════ */}
                {step === 2 && (
                  <Animated.View entering={FadeInRight.duration(180)} style={{ gap: 14 }}>
                    
                    {/* Bill Title Input */}
                    <View style={s.inputField}>
                      <AppText style={[s.fieldLabel, { color: colors.text.tertiary }]}>BILL / SUBSCRIPTION TITLE</AppText>
                      <View style={[s.inputWithIcon, { backgroundColor: inputBg, borderColor: colors.glass.border }]}>
                        <Ionicons name="receipt-outline" size={17} color={activeColor} />
                        <TextInput
                          style={[s.innerInput, { color: colors.text.primary }]}
                          placeholder="e.g. Netflix, Apartment Rent, WiFi"
                          placeholderTextColor={colors.text.tertiary + '60'}
                          value={title}
                          onChangeText={setTitle}
                          autoFocus={!title}
                        />
                      </View>
                    </View>

                    {/* 2-Column Row: Due Date & Category with exact vertical alignment */}
                    <View style={s.twoColRow}>
                      {/* Due Date Trigger Button */}
                      <View style={s.colField}>
                        <AppText style={[s.fieldLabel, { color: colors.text.tertiary }]}>DUE DATE</AppText>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setDatePickerVisible(true);
                          }}
                          style={[s.pickerFieldTrigger, { backgroundColor: inputBg, borderColor: colors.glass.border }]}
                        >
                          <Ionicons name="calendar-outline" size={17} color={activeColor} />
                          <AppText
                            variant="labelMD"
                            numberOfLines={1}
                            style={{
                              color: dueDate ? colors.text.primary : colors.text.tertiary,
                              fontWeight: '700',
                              flex: 1,
                              fontSize: 13,
                            }}
                          >
                            {dueDate ? formatDisplayDate(dueDate) : 'Pick due date'}
                          </AppText>
                          <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
                        </Pressable>
                      </View>

                      {/* Category Capsule Selector */}
                      <View style={s.colField}>
                        <AppText style={[s.fieldLabel, { color: colors.text.tertiary }]}>CATEGORY</AppText>
                        <Pressable
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCategoryPickerVisible(true);
                          }}
                          style={[s.pickerFieldTrigger, { backgroundColor: inputBg, borderColor: activeColor + '45' }]}
                        >
                          <View style={[s.catDot, { backgroundColor: activeColor }]} />
                          <AppText
                            variant="labelMD"
                            numberOfLines={1}
                            style={{ color: colors.text.primary, fontWeight: '700', flex: 1, fontSize: 13 }}
                          >
                            {selectedCategoryObj.label}
                          </AppText>
                          <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
                        </Pressable>
                      </View>
                    </View>

                    {/* Pay From Account Selection */}
                    <View style={s.inputField}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <AppText style={[s.fieldLabel, { color: colors.text.tertiary }]}>PAY FROM ACCOUNT</AppText>
                        <Pressable onPress={() => setAccountsVisible(true)}>
                          <AppText variant="caption" color={colors.brand.primary} style={{ fontWeight: '700', fontSize: 11 }}>
                            + Manage
                          </AppText>
                        </Pressable>
                      </View>

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.accountsRow}>
                        {accounts.map((acc) => {
                          const active = acc.id === accountId;
                          return (
                            <Pressable
                              key={acc.id}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setAccountId(acc.id);
                              }}
                              style={[
                                s.accChip,
                                {
                                  backgroundColor: active ? acc.color + '18' : inputBg,
                                  borderColor: active ? acc.color : colors.glass.border,
                                },
                              ]}
                            >
                              <Ionicons name={acc.icon as any} size={13} color={acc.color} />
                              <AppText
                                variant="caption"
                                style={{ color: active ? acc.color : colors.text.secondary, fontWeight: active ? '800' : '500', fontSize: 11 }}
                              >
                                {acc.name}
                              </AppText>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    {/* Recurring Cycle Selector (Only when isRecurring is true) */}
                    {isRecurring && (
                      <View style={s.inputField}>
                        <AppText style={[s.fieldLabel, { color: colors.text.tertiary }]}>RECURRING CYCLE</AppText>
                        <View style={s.intervalRow}>
                          {(['weekly', 'monthly', 'yearly'] as const).map((cycle) => {
                            const active = recurringInterval === cycle;
                            return (
                              <Pressable
                                key={cycle}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setRecurringInterval(cycle);
                                }}
                                style={[
                                  s.intervalChip,
                                  {
                                    backgroundColor: active ? activeColor + '20' : inputBg,
                                    borderColor: active ? activeColor : colors.glass.border,
                                  },
                                ]}
                              >
                                <AppText
                                  variant="caption"
                                  style={{
                                    color: active ? activeColor : colors.text.secondary,
                                    fontWeight: active ? '800' : '600',
                                    textTransform: 'capitalize',
                                    fontSize: 11,
                                  }}
                                >
                                  {cycle}
                                </AppText>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}

                  </Animated.View>
                )}

              </View>
            </KeyboardAvoidingSheet>

          </Animated.View>
        </View>
      </Modal>

      {/* ── DEDICATED FULL-SCALE DATE PICKER MODAL (Spacious, 60fps Native UI) ── */}
      <Modal
        visible={datePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDatePickerVisible(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setDatePickerVisible(false)}>
          <BlurView intensity={isDark ? 45 : 35} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.medium }]} />
        </Pressable>

        <View style={s.centerModalOuter} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(200)} style={[s.dateModalCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
            <View style={s.dateModalHeader}>
              <View>
                <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '800' }}>
                  Select Bill Due Date
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>
                  Pick the day payment is scheduled
                </AppText>
              </View>
              <Pressable
                onPress={() => setDatePickerVisible(false)}
                style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}
              >
                <Ionicons name="close" size={17} color={colors.text.secondary} />
              </Pressable>
            </View>

            {/* Calendar Component embedded cleanly */}
            <View style={s.datePickerModalBody}>
              <DatePickerField
                value={dueDate}
                onChange={(d) => {
                  setDueDate(d);
                  setTimeout(() => setDatePickerVisible(false), 220);
                }}
                placeholder="Choose date"
              />
            </View>

            <Pressable
              onPress={() => setDatePickerVisible(false)}
              style={[s.modalDoneBtn, { backgroundColor: activeColor }]}
            >
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <AppText style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>
                Confirm Date ({dueDate ? formatDisplayDate(dueDate) : 'Today'})
              </AppText>
            </Pressable>
          </Animated.View>
        </View>
      </Modal>

      {/* ── DEDICATED CATEGORY PICKER MODAL ── */}
      <Modal
        visible={categoryPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCategoryPickerVisible(false)}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setCategoryPickerVisible(false)}>
          <BlurView intensity={isDark ? 45 : 35} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.medium }]} />
        </Pressable>

        <View style={s.centerModalOuter} pointerEvents="box-none">
          <Animated.View entering={FadeIn.duration(200)} style={[s.categoryModalCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
            <View style={s.dateModalHeader}>
              <View>
                <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '800' }}>
                  Select Category
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>
                  Assign expense category for budgeting
                </AppText>
              </View>
              <Pressable
                onPress={() => setCategoryPickerVisible(false)}
                style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}
              >
                <Ionicons name="close" size={17} color={colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={s.categoryModalGrid} showsVerticalScrollIndicator={false}>
              {cats.map((catItem) => {
                const isSelected = catItem.id === category;
                return (
                  <Pressable
                    key={catItem.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCategory(catItem.id);
                      setCategoryPickerVisible(false);
                    }}
                    style={[
                      s.categoryModalTile,
                      {
                        backgroundColor: isSelected ? catItem.color + '22' : inputBg,
                        borderColor: isSelected ? catItem.color : colors.glass.border,
                      },
                    ]}
                  >
                    <View style={[s.templateIconCircle, { backgroundColor: catItem.color + '20' }]}>
                      <Ionicons name={catItem.icon as any} size={16} color={catItem.color} />
                    </View>
                    <AppText
                      variant="labelMD"
                      numberOfLines={1}
                      style={{
                        color: isSelected ? catItem.color : colors.text.primary,
                        fontWeight: isSelected ? '800' : '600',
                        fontSize: 12.5,
                      }}
                    >
                      {catItem.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      <CategoryFormSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onSaved={(id) => setCategory(id)}
      />

      <AccountsSheet
        visible={accountsVisible}
        onClose={() => setAccountsVisible(false)}
      />
    </>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: Radius['2xl'],
    borderTopRightRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '92%',
    ...Platform.select({
      ios: { shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 24 },
      android: { elevation: 24 },
    }),
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 12 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  backBtn: {
    paddingRight: 4,
    paddingVertical: 2,
  },
  stepPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 0,
    paddingTop: 4,
    paddingBottom: 12,
    gap: 14,
  },

  // 1. Prominent Segmented Control
  segmentedControl: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: 6,
  },
  segmentTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  segmentTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 32,
    fontWeight: '800',
    padding: 0,
  },

  // 1-Tap Quick Increment Chips
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

  // Collapsible Dropdown
  dropdownContainer: {
    gap: 6,
    marginTop: 2,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  dropdownMenu: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.15)',
  },
  templateIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Core Inputs
  inputField: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    fontWeight: '700',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  innerInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  colField: {
    flex: 1,
    gap: 6,
  },
  pickerFieldTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 48,
    borderRadius: Radius.lg,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  catDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Modal Pickers (Spacious & Clean)
  centerModalOuter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateModalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  datePickerModalBody: {
    paddingVertical: 4,
  },
  modalDoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 48,
    borderRadius: Radius.xl,
  },

  categoryModalCard: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '75%',
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 20,
  },
  categoryModalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  categoryModalTile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },

  // Accounts Row
  accountsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },

  // Interval
  intervalRow: {
    flexDirection: 'row',
    gap: 8,
  },
  intervalChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Footer Actions
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.xl,
  },
  step2FooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: Radius.xl,
    borderWidth: 1,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
