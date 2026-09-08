/**
 * @file AccountFormSheet.tsx
 * @architecture Presentation Layer — Extracted Feature Modal
 * @description 2-Step Progressive Wizard + Ivy Wallet-inspired Ergonomics:
 *   - Step 1: Choose Account Type with interactive purpose cards (Checking, Cash, Savings, Credit, Investment)
 *   - Step 2: Ivy Wallet-styled inputs:
 *       1. Account Name (with color/icon avatar)
 *       2. Accent Color (inline horizontal swatches)
 *       3. Currency Selector (shows default from setup, tap to expand)
 *       4. Big Tactile Balance Display with Live Calculator Keypad (+, -, ×, ÷, ⌫)
 *       5. Customization Drawer (Icon grid & Set as Primary toggle)
 *   - Sticky Bottom Action Bar with simple, punchy "Next" / "Save" buttons.
 * @associatedFiles src/features/accounts/hooks/useAccountsScreen.ts, src/app/accounts.tsx, src/utils/calculator.ts
 */

import React, { useState, useEffect, useRef, type ComponentProps } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Modal,
  Platform, TextInput, KeyboardAvoidingView, Dimensions, Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, Easing, FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { Radius } from '@constants/Dimensions';
import { useTheme } from '@hooks/useTheme';
import {
  type AccountFormState,
  DEFAULT_ACCOUNT_FORM,
} from '@features/accounts/hooks/useAccountsScreen';
import type { Account, AccountType, CurrencyCode } from '@store/types';
import { useAuthStore } from '@store/authStore';
import {
  CALCULATOR_KEYS,
  applyCalculatorKey,
  evaluateExpression,
} from '@/utils/calculator';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const { height: SH } = Dimensions.get('window');

const PRESET_COLORS: string[] = [
  '#6366F1', '#10B981', '#38BDF8', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6C63FF',
];

const PRESET_ICONS: IoniconName[] = [
  'card-outline', 'wallet-outline', 'cash-outline',
  'business-outline', 'trending-up-outline', 'home-outline',
  'car-outline', 'heart-outline', 'star-outline', 'diamond-outline',
];

const CURRENCY_CODES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  CAD: 'CA$',
  AUD: 'AU$',
};

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking',   label: 'Checking / Bank' },
  { value: 'cash',       label: 'Cash Wallet'     },
  { value: 'savings',    label: 'Savings Account' },
  { value: 'credit',     label: 'Credit Card'     },
  { value: 'investment', label: 'Investments'     },
];

const ACCOUNT_TYPE_INFO: Record<AccountType, { label: string; icon: IoniconName; color: string; desc: string; placeholder: string }> = {
  checking: {
    label: 'Checking / Bank',
    icon: 'business-outline',
    color: '#6366F1',
    desc: 'For primary bank accounts, UPI, salary deposits, and regular everyday payments.',
    placeholder: 'e.g. HDFC Salary, Chase Checking',
  },
  cash: {
    label: 'Cash Wallet',
    icon: 'cash-outline',
    color: '#10B981',
    desc: 'For physical cash in hand, wallet notes, and petty everyday cash expenses.',
    placeholder: 'e.g. Cash in Hand, Pocket Wallet',
  },
  savings: {
    label: 'Savings Account',
    icon: 'wallet-outline',
    color: '#06B6D4',
    desc: 'For emergency reserves, high-yield deposits, and savings set aside for goals.',
    placeholder: 'e.g. Emergency Fund, High Yield Savings',
  },
  credit: {
    label: 'Credit Card',
    icon: 'card-outline',
    color: '#EF4444',
    desc: 'For card limits & dues. Balance is treated as a liability against your net worth.',
    placeholder: 'e.g. Amazon ICICI, Prime Card',
  },
  investment: {
    label: 'Investments',
    icon: 'trending-up-outline',
    color: '#8B5CF6',
    desc: 'For mutual funds, stocks, gold, crypto, or long-term wealth portfolios.',
    placeholder: 'e.g. Zerodha Portfolio, Mutual Funds',
  },
};

interface Props {
  visible:        boolean;
  editingAccount: Account | null;
  initialPreset?: Partial<AccountFormState>;
  onClose:        () => void;
  onSave:         (form: AccountFormState) => void;
}

export function AccountFormSheet({ visible, editingAccount, initialPreset, onClose, onSave }: Props) {
  const { colors, isDark } = useTheme();
  const insets  = useSafeAreaInsets();
  const slideY  = useSharedValue(440);

  const [step, setStep] = useState<1 | 2>(1);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [form, setForm] = useState<AccountFormState>(DEFAULT_ACCOUNT_FORM);

  const userCurrency = (useAuthStore((s) => s.user?.currency) as CurrencyCode) ?? 'INR';
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      if (editingAccount) {
        setForm({
          name:      editingAccount.name,
          type:      editingAccount.type,
          color:     editingAccount.color,
          icon:      editingAccount.icon as IoniconName,
          balance:   String(editingAccount.balance),
          currency:  editingAccount.currency as CurrencyCode,
          isDefault: editingAccount.isDefault,
        });
        setStep(2);
        setCustomizeOpen(true);
      } else {
        const baseType = initialPreset?.type ?? 'checking';
        const typeInfo = ACCOUNT_TYPE_INFO[baseType];
        setForm({
          ...DEFAULT_ACCOUNT_FORM,
          type: baseType,
          color: typeInfo.color,
          icon: typeInfo.icon,
          currency: userCurrency,
          ...initialPreset,
        });
        setStep(initialPreset ? 2 : 1);
        setCustomizeOpen(false);
      }
      setShowCurrencyPicker(false);
      slideY.value = withTiming(0, { duration: 360, easing: Easing.out(Easing.cubic) });
    } else {
      slideY.value = withTiming(440, { duration: 250, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, editingAccount, initialPreset, userCurrency]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  const set = <K extends keyof AccountFormState>(key: K, val: AccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const hasOperation = /[+\-×÷]/.test(form.balance);
  const evaluatedBalance = evaluateExpression(form.balance);

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      ...form,
      balance: String(evaluatedBalance),
    });
  };

  const sheetBg = isDark ? colors.background.secondary : '#FFFFFF';
  const inputBg = isDark ? colors.background.card : '#F8FAFC';
  const currentSymbol = CURRENCY_SYMBOLS[form.currency] || '$';

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <Pressable style={[s.backdrop, { backgroundColor: colors.overlay.heavy }]} onPress={onClose} />

        <Animated.View style={[s.sheet, sheetStyle, { backgroundColor: sheetBg, shadowColor: colors.black }]}>
          <View style={[s.handle, { backgroundColor: colors.glass.backgroundStrong }]} />

          {/* ── Top Bar ── */}
          <View style={s.header}>
            {step === 2 && !editingAccount ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStep(1);
                }}
                style={s.headerBtn}
              >
                <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
              </Pressable>
            ) : (
              <Pressable onPress={onClose} style={s.headerBtn}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            )}

            <View style={s.headerCenter}>
              <AppText variant="headingSM" color={colors.text.primary} style={{ fontWeight: '800' }}>
                {editingAccount ? 'Edit Account' : 'New Account'}
              </AppText>
              {!editingAccount && (
                <AppText variant="caption" color={colors.text.tertiary}>
                  {step === 1 ? 'Step 1 of 2: Choose Type' : 'Step 2 of 2: Account Details'}
                </AppText>
              )}
            </View>

            {step === 2 && !editingAccount ? (
              <Pressable onPress={onClose} style={s.headerBtn}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            ) : (
              <Pressable onPress={handleSave} style={[s.topSaveBtn, { backgroundColor: form.color }]}>
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </Pressable>
            )}
          </View>

          {/* ── 2-Step Progress Indicator ── */}
          {!editingAccount && (
            <View style={s.stepBarContainer}>
              <View style={[s.stepSegment, { backgroundColor: form.color }]} />
              <View
                style={[
                  s.stepSegment,
                  { backgroundColor: step === 2 ? form.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') },
                ]}
              />
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            {/* ══════════════════════════════════════════════════════
                STEP 1: SELECT ACCOUNT TYPE & PURPOSE (USER APPROVED)
               ══════════════════════════════════════════════════════ */}
            {step === 1 && !editingAccount && (
              <Animated.View entering={FadeIn.duration(220)} style={{ gap: 14 }}>
                <View style={{ marginTop: 6, marginBottom: 2 }}>
                  <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
                    What kind of account is this?
                  </AppText>
                  <AppText variant="bodySM" color={colors.text.tertiary} style={{ marginTop: 2, lineHeight: 18 }}>
                    Select the account role. MoneyApp organizes your cash flow and net worth based on this.
                  </AppText>
                </View>

                {/* 5 Selectable Type Cards */}
                <View style={{ gap: 10 }}>
                  {ACCOUNT_TYPES.map(({ value }) => {
                    const info = ACCOUNT_TYPE_INFO[value];
                    const isSelected = form.type === value;
                    return (
                      <Pressable
                        key={value}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setForm((prev) => ({
                            ...prev,
                            type: value,
                            color: info.color,
                            icon: info.icon,
                            name: prev.name.trim() === '' ? info.label : prev.name,
                          }));
                        }}
                        style={[
                          s.typeCard,
                          {
                            backgroundColor: isSelected
                              ? (isDark ? info.color + '1A' : info.color + '12')
                              : inputBg,
                            borderColor: isSelected ? info.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                      >
                        <View style={[s.typeCardIcon, { backgroundColor: info.color + '22' }]}>
                          <Ionicons name={info.icon} size={22} color={info.color} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <AppText style={[s.typeCardTitle, { color: isSelected ? info.color : colors.text.primary }]}>
                              {info.label}
                            </AppText>
                            {isSelected && (
                              <View style={[s.selectedCheck, { backgroundColor: info.color }]}>
                                <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                              </View>
                            )}
                          </View>
                          <AppText style={[s.typeCardDesc, { color: colors.text.tertiary }]}>
                            {info.desc}
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </Animated.View>
            )}

            {/* ══════════════════════════════════════════════════════
                STEP 2: IVY WALLET ORDER (Name -> Color -> Currency -> Balance Calculator)
               ══════════════════════════════════════════════════════ */}
            {(step === 2 || editingAccount) && (
              <Animated.View entering={FadeIn.duration(220)} style={{ gap: 14 }}>
                {/* 1. Account Name with Color/Icon Avatar */}
                <View style={[s.nameCard, { backgroundColor: inputBg, borderColor: colors.glass.border }]}>
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCustomizeOpen(!customizeOpen);
                    }}
                    style={[s.avatarCircle, { backgroundColor: form.color }]}
                  >
                    <Ionicons name={form.icon} size={22} color="#FFFFFF" />
                  </Pressable>

                  <View style={s.nameInputWrap}>
                    <AppText variant="caption" color={colors.text.tertiary} style={s.tinyHeader}>
                      ACCOUNT NAME
                    </AppText>
                    <TextInput
                      ref={nameInputRef}
                      style={[s.nameInput, { color: colors.text.primary }]}
                      value={form.name}
                      onChangeText={(v) => set('name', v)}
                      placeholder={ACCOUNT_TYPE_INFO[form.type].placeholder}
                      placeholderTextColor={colors.text.tertiary}
                      autoFocus={!editingAccount}
                    />
                  </View>
                </View>

                {/* 2. Accent Color (Inline Swatches) */}
                <View style={s.section}>
                  <AppText variant="caption" color={colors.text.tertiary} style={s.tinyHeader}>
                    CARD COLOR
                  </AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.colorScroll}>
                    {PRESET_COLORS.map((c) => {
                      const active = form.color === c;
                      return (
                        <Pressable
                          key={c}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            set('color', c);
                          }}
                          style={[
                            s.colorDot,
                            { backgroundColor: c },
                            active && s.colorDotActive,
                          ]}
                        />
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 3. Currency Selector */}
                <View style={s.section}>
                  <View style={s.currencyHeaderRow}>
                    <AppText variant="caption" color={colors.text.tertiary} style={s.tinyHeader}>
                      CURRENCY
                    </AppText>
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowCurrencyPicker(!showCurrencyPicker);
                      }}
                      style={[s.currencyActivePill, { backgroundColor: form.color + '15', borderColor: form.color + '40' }]}
                    >
                      <AppText style={{ color: form.color, fontWeight: '800', fontSize: 13 }}>
                        {currentSymbol} {form.currency}
                      </AppText>
                      <Ionicons name={showCurrencyPicker ? 'chevron-up' : 'chevron-down'} size={14} color={form.color} />
                    </Pressable>
                  </View>

                  {showCurrencyPicker && (
                    <Animated.View entering={FadeIn.duration(200)} style={s.currencyGrid}>
                      {CURRENCY_CODES.map((code) => {
                        const active = form.currency === code;
                        return (
                          <Pressable
                            key={code}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              set('currency', code);
                              setShowCurrencyPicker(false);
                            }}
                            style={[
                              s.currencyChip,
                              {
                                backgroundColor: active ? form.color : inputBg,
                                borderColor: active ? form.color : colors.glass.border,
                              },
                            ]}
                          >
                            <AppText style={{ color: active ? '#FFFFFF' : colors.text.secondary, fontWeight: active ? '700' : '500', fontSize: 12.5 }}>
                              {CURRENCY_SYMBOLS[code]} {code}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  )}
                </View>

                {/* 4. Tactile Balance Card with Live Calculated Evaluation */}
                <View style={[s.balanceCard, { backgroundColor: inputBg, borderColor: form.color + '38' }]}>
                  <View style={s.balanceCardHeader}>
                    <AppText variant="caption" color={colors.text.tertiary} style={s.tinyHeader}>
                      STARTING BALANCE
                    </AppText>
                    {hasOperation && (
                      <AppText variant="caption" color={form.color} style={{ fontWeight: '700' }}>
                        = {currentSymbol}{evaluatedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </AppText>
                    )}
                  </View>

                  <View style={s.balanceRow}>
                    <AppText style={[s.balanceSymbol, { color: form.color }]}>
                      {currentSymbol}
                    </AppText>
                    <AppText
                      style={[
                        s.balanceBigDisplay,
                        { color: colors.text.primary },
                        form.balance.length > 9 && { fontSize: 24 },
                        form.balance.length > 14 && { fontSize: 20 },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {form.balance || '0'}
                    </AppText>
                  </View>
                </View>

                {/* 5. Ivy Wallet Calculator Keypad (No System Keyboard Required!) */}
                <View style={s.keypadContainer}>
                  {CALCULATOR_KEYS.map((row, rIdx) => (
                    <View key={rIdx} style={s.keypadRow}>
                      {row.map((key) => {
                        const isOperator = ['+', '-', '×', '÷'].includes(key);
                        const isBackspace = key === '⌫';
                        return (
                          <Pressable
                            key={key}
                            onPress={() => {
                              Keyboard.dismiss();
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              const next = applyCalculatorKey(form.balance || '0', key);
                              set('balance', next);
                            }}
                            style={({ pressed }) => [
                              s.keypadBtn,
                              {
                                backgroundColor: isOperator
                                  ? form.color + '18'
                                  : isBackspace
                                  ? (isDark ? 'rgba(239, 68, 68, 0.12)' : 'rgba(239, 68, 68, 0.08)')
                                  : (isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF'),
                                borderColor: isOperator
                                  ? form.color + '35'
                                  : isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                opacity: pressed ? 0.6 : 1,
                              },
                            ]}
                          >
                            {isBackspace ? (
                              <Ionicons name="backspace-outline" size={20} color={colors.status.expense} />
                            ) : (
                              <AppText
                                style={[
                                  s.keypadBtnText,
                                  {
                                    color: isOperator ? form.color : colors.text.primary,
                                    fontWeight: isOperator ? '800' : '600',
                                    fontSize: isOperator ? 20 : 18,
                                  },
                                ]}
                              >
                                {key}
                              </AppText>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  ))}
                </View>

                {/* 6. Customization Drawer (Icons & Primary Default) */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCustomizeOpen(!customizeOpen);
                  }}
                  style={[s.accordionToggle, { backgroundColor: inputBg, borderColor: colors.glass.border }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="sparkles-outline" size={16} color={form.color} />
                    <AppText variant="labelMD" color={colors.text.primary} style={{ fontWeight: '600' }}>
                      Customize Icon & Primary Default
                    </AppText>
                  </View>
                  <Ionicons name={customizeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
                </Pressable>

                {customizeOpen && (
                  <Animated.View entering={FadeIn.duration(200)} style={{ gap: 12 }}>
                    <AppText variant="caption" color={colors.text.tertiary} style={s.tinyHeader}>
                      SELECT CARD ICON
                    </AppText>
                    <View style={s.iconGrid}>
                      {PRESET_ICONS.map((ic) => {
                        const active = form.icon === ic;
                        return (
                          <Pressable
                            key={ic}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              set('icon', ic);
                            }}
                            style={[
                              s.iconBtn,
                              {
                                backgroundColor: active ? form.color + '25' : inputBg,
                                borderColor: active ? form.color : colors.glass.border,
                                borderWidth: active ? 2 : 1,
                              },
                            ]}
                          >
                            <Ionicons name={ic} size={20} color={active ? form.color : colors.text.secondary} />
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Primary Account Toggle */}
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        set('isDefault', !form.isDefault);
                      }}
                      style={[s.toggleCard, { backgroundColor: inputBg, borderColor: colors.glass.border }]}
                    >
                      <View style={{ flex: 1, paddingRight: 10 }}>
                        <AppText variant="labelMD" color={colors.text.primary}>Set as Primary Account</AppText>
                        <AppText variant="caption" color={colors.text.tertiary}>Selected by default for all new expenses and income</AppText>
                      </View>
                      <View style={[s.toggleSwitch, { backgroundColor: form.isDefault ? form.color : colors.glass.backgroundStrong }]}>
                        <View style={[s.toggleThumb, { backgroundColor: '#FFFFFF', transform: [{ translateX: form.isDefault ? 18 : 0 }] }]} />
                      </View>
                    </Pressable>
                  </Animated.View>
                )}
              </Animated.View>
            )}
          </ScrollView>

          {/* ── Sticky Bottom Action Bar (Next / Save) ── */}
          <View
            style={[
              s.stickyFooter,
              {
                backgroundColor: sheetBg,
                borderTopColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                paddingBottom: Math.max(insets.bottom, 14),
              },
            ]}
          >
            {step === 1 && !editingAccount ? (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setStep(2);
                }}
                style={({ pressed }) => [
                  s.stickyBtn,
                  { backgroundColor: form.color, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <AppText style={s.stickyBtnText}>Next</AppText>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </Pressable>
            ) : (
              <Pressable
                onPress={handleSave}
                style={({ pressed }) => [
                  s.stickyBtn,
                  { backgroundColor: form.color, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <AppText style={s.stickyBtnText}>Save</AppText>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SH * 0.94,
    ...Platform.select({
      ios:     { shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: -6 } },
      android: { elevation: 20 },
    }),
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  topSaveBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  stepBarContainer: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },

  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  section: { gap: 6 },
  tinyHeader: { fontWeight: '700', letterSpacing: 0.8 },

  /* ── Step 1 Cards ── */
  typeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: Radius.xl,
  },
  typeCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    includeFontPadding: false,
  },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },

  /* ── Step 2 Inputs ── */
  /* 1. Name Card */
  nameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: 4,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameInputWrap: {
    flex: 1,
    gap: 2,
  },
  nameInput: {
    fontSize: 16,
    fontWeight: '700',
    paddingVertical: 2,
  },

  /* 2. Colors */
  colorScroll: {
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.2 }],
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },

  /* 3. Currency */
  currencyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencyActivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  currencyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  currencyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },

  /* 4. Balance Card */
  balanceCard: {
    padding: 16,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    gap: 6,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceSymbol: {
    fontSize: 28,
    fontWeight: '800',
    includeFontPadding: false,
  },
  balanceBigDisplay: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    includeFontPadding: false,
    flex: 1,
  },

  /* 5. Keypad */
  keypadContainer: {
    gap: 8,
    marginTop: 2,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  keypadBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keypadBtnText: {
    includeFontPadding: false,
  },

  /* 6. Customization Drawer */
  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  toggleSwitch: {
    width: 46,
    height: 28,
    borderRadius: 14,
    padding: 3,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  /* Sticky Bottom Footer */
  stickyFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  stickyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: Radius.xl,
  },
  stickyBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
