/**
 * @file AccountFormSheet.tsx
 * @architecture Presentation Layer — Extracted Feature Modal
 * @description 2-Step Progressive Account Creation Wizard:
 *   - Step 1: Select account type and understand its use case (Checking, Cash, Savings, Credit, Investment)
 *   - Step 2: Name and Balance with live card preview, and collapsible appearance customizations (Color, Icon, Default)
 *   Eliminates visual clutter and cognitive fatigue so users can create accounts effortlessly in seconds.
 * @associatedFiles src/features/accounts/hooks/useAccountsScreen.ts, src/app/accounts.tsx
 */

import React, { useState, useEffect, type ComponentProps } from 'react';
import {
  View, ScrollView, StyleSheet, Pressable, Modal,
  Platform, TextInput, KeyboardAvoidingView, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

const CURRENCY_CODES: CurrencyCode[] = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'];

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
    desc: 'For physical cash in hand, wallet notes, and day-to-day petty cash expenses.',
    placeholder: 'e.g. Cash in Hand, Wallet Pocket',
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
  const [form, setForm] = useState<AccountFormState>(DEFAULT_ACCOUNT_FORM);

  const userCurrency = useAuthStore((s) => s.user?.currency) ?? 'USD';

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
        // If an initial preset was picked from empty state cards, jump directly to step 2!
        setStep(initialPreset ? 2 : 1);
        setCustomizeOpen(false);
      }
      slideY.value = withTiming(0, { duration: 380, easing: Easing.out(Easing.cubic) });
    } else {
      slideY.value = withTiming(440, { duration: 260, easing: Easing.in(Easing.cubic) });
    }
  }, [visible, editingAccount, initialPreset]);

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: slideY.value }] }));

  const set = <K extends keyof AccountFormState>(key: K, val: AccountFormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const sheetBg = colors.background.secondary;
  const inputBg = colors.background.primary;
  const inputClr = colors.text.primary;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.overlay}>
        <Pressable style={[s.backdrop, { backgroundColor: colors.overlay.heavy }]} onPress={onClose} />

        <Animated.View style={[s.sheet, sheetStyle, { backgroundColor: sheetBg, paddingBottom: insets.bottom + 16, shadowColor: colors.black }]}>
          <View style={[s.handle, { backgroundColor: colors.glass.backgroundStrong }]} />

          {/* ── Sheet Header ── */}
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
              <AppText variant="headingSM" color={colors.text.primary}>
                {editingAccount ? 'Edit Account' : 'New Account'}
              </AppText>
              {!editingAccount && (
                <AppText variant="caption" color={colors.text.tertiary}>
                  {step === 1 ? 'Step 1 of 2: Choose Type' : 'Step 2 of 2: Details & Balance'}
                </AppText>
              )}
            </View>

            {step === 2 && !editingAccount ? (
              <Pressable onPress={onClose} style={s.headerBtn}>
                <Ionicons name="close" size={22} color={colors.text.secondary} />
              </Pressable>
            ) : (
              <View style={{ width: 38 }} />
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
                STEP 1: SELECT ACCOUNT TYPE & PURPOSE
               ══════════════════════════════════════════════════════ */}
            {step === 1 && !editingAccount && (
              <Animated.View entering={FadeIn.duration(220)} style={{ gap: 14 }}>
                <View style={{ marginTop: 6, marginBottom: 2 }}>
                  <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
                    What kind of account is this?
                  </AppText>
                  <AppText variant="bodySM" color={colors.text.tertiary} style={{ marginTop: 2, lineHeight: 18 }}>
                    Select the role of this account. This helps MoneyApp separate your liquid cash from credit and investments.
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

                {/* Continue to Step 2 Button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setStep(2);
                  }}
                  style={[s.saveBtn, { backgroundColor: form.color, marginTop: 8 }]}
                >
                  <AppText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 16 }}>
                    Continue to Details
                  </AppText>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </Animated.View>
            )}

            {/* ══════════════════════════════════════════════════════
                STEP 2: DETAILS, BALANCE & COLLAPSIBLE CUSTOMIZATION
               ══════════════════════════════════════════════════════ */}
            {(step === 2 || editingAccount) && (
              <Animated.View entering={FadeIn.duration(220)} style={{ gap: 4 }}>
                {/* Live preview card */}
                <View style={[s.previewWrap, { shadowColor: form.color }]}>
                  <LinearGradient colors={[form.color, form.color + 'BB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.previewCard}>
                    <View style={[s.previewBlob1, { backgroundColor: colors.glass.backgroundStrong }]} />
                    <View style={[s.previewBlob2, { backgroundColor: colors.glass.background }]} />
                    <View style={s.previewContent}>
                      <View style={s.previewTop}>
                        <View style={[s.iconCircle, { backgroundColor: colors.glass.backgroundStrong }]}>
                          <Ionicons name={form.icon} size={18} color={colors.white} />
                        </View>
                        <View style={[s.typePill, { backgroundColor: colors.glass.backgroundStrong }]}>
                          <AppText style={[s.typeText, { color: colors.white }]}>{form.type.toUpperCase()}</AppText>
                        </View>
                      </View>
                      <AppText style={[s.balanceValue, { fontSize: 24, color: colors.white }]}>
                        {form.currency || 'USD'} {parseFloat(form.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </AppText>
                      <AppText style={[s.accountName, { color: colors.white + 'CC' }]}>{form.name || 'Account Name'}</AppText>
                    </View>
                  </LinearGradient>
                </View>

                {/* Account Name */}
                <AppText variant="labelMD" color={colors.text.secondary} style={s.fieldLabel}>Account Name</AppText>
                <TextInput
                  style={[s.input, { backgroundColor: inputBg, color: inputClr }]}
                  value={form.name}
                  onChangeText={(v) => set('name', v)}
                  placeholder={ACCOUNT_TYPE_INFO[form.type].placeholder}
                  placeholderTextColor={colors.text.tertiary}
                />

                {/* Current Balance */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, marginBottom: 6 }}>
                  <AppText variant="labelMD" color={colors.text.secondary}>Current Balance</AppText>
                  <AppText variant="caption" color={colors.text.tertiary}>Default: 0.00</AppText>
                </View>
                <TextInput
                  style={[s.input, { backgroundColor: inputBg, color: inputClr, fontSize: 18, fontWeight: '700' }]}
                  value={form.balance}
                  onChangeText={(v) => set('balance', v.replace(/[^0-9.]/g, ''))}
                  placeholder="0.00"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="decimal-pad"
                />

                {/* Currency */}
                <AppText variant="labelMD" color={colors.text.secondary} style={[s.fieldLabel, { marginTop: 14 }]}>
                  Currency
                </AppText>
                <View style={s.chipRow}>
                  {CURRENCY_CODES.map((code) => {
                    const active = form.currency === code;
                    return (
                      <Pressable
                        key={code}
                        onPress={() => set('currency', code)}
                        style={[s.chip, { backgroundColor: active ? form.color : inputBg, borderColor: active ? form.color : 'transparent', borderWidth: 1.5 }]}
                      >
                        <AppText variant="labelSM" style={{ color: active ? colors.white : colors.text.secondary, fontWeight: active ? '700' : '500' }}>
                          {code}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Collapsible Appearance & Defaults Section */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCustomizeOpen(!customizeOpen);
                  }}
                  style={[s.accordionToggle, { backgroundColor: inputBg, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="color-palette-outline" size={18} color={form.color} />
                    <AppText variant="labelMD" color={colors.text.primary} style={{ fontWeight: '600' }}>
                      Customize Icon, Color & Defaults
                    </AppText>
                  </View>
                  <Ionicons name={customizeOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.tertiary} />
                </Pressable>

                {customizeOpen && (
                  <Animated.View entering={FadeIn.duration(200)} style={s.accordionContent}>
                    {/* Color Swatches */}
                    <AppText variant="labelSM" color={colors.text.secondary} style={{ marginTop: 4, marginBottom: 8 }}>
                      Card Theme Color
                    </AppText>
                    <View style={s.colorRow}>
                      {PRESET_COLORS.map((c) => {
                        const active = form.color === c;
                        return (
                          <Pressable
                            key={c}
                            onPress={() => set('color', c)}
                            style={[s.colorDot, { backgroundColor: c }, active && { transform: [{ scale: 1.2 }], borderWidth: 3, borderColor: colors.white, shadowColor: c, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 }]}
                          />
                        );
                      })}
                    </View>

                    {/* Icon Grid */}
                    <AppText variant="labelSM" color={colors.text.secondary} style={{ marginTop: 14, marginBottom: 8 }}>
                      Card Icon
                    </AppText>
                    <View style={s.iconRow}>
                      {PRESET_ICONS.map((ic) => {
                        const active = form.icon === ic;
                        return (
                          <Pressable
                            key={ic}
                            onPress={() => set('icon', ic)}
                            style={[s.iconOption, { backgroundColor: active ? form.color + '22' : inputBg, borderWidth: active ? 2 : 0, borderColor: active ? form.color : 'transparent' }]}
                          >
                            <Ionicons name={ic} size={22} color={active ? form.color : colors.text.secondary} />
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Set as Default Account Toggle */}
                    <Pressable onPress={() => set('isDefault', !form.isDefault)} style={s.toggleRow}>
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <AppText variant="labelMD" color={colors.text.primary}>Set as Primary Account</AppText>
                        <AppText variant="caption" color={colors.text.tertiary}>Selected by default for all new expenses and income</AppText>
                      </View>
                      <View style={[s.toggle, { backgroundColor: form.isDefault ? form.color : colors.glass.backgroundStrong }]}>
                        <View style={[s.toggleThumb, { backgroundColor: colors.white, transform: [{ translateX: form.isDefault ? 18 : 0 }] }]} />
                      </View>
                    </Pressable>
                  </Animated.View>
                )}

                {/* Save Button */}
                <Pressable onPress={() => onSave(form)} style={[s.saveBtn, { backgroundColor: form.color, marginTop: 16 }]}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.white} />
                  <AppText style={{ color: colors.white, fontWeight: '700', fontSize: 16 }}>
                    {editingAccount ? 'Save Changes' : 'Create Account'}
                  </AppText>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: SH * 0.92,
    ...Platform.select({
      ios:     { shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: -6 } },
      android: { elevation: 20 },
    }),
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },

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

  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 4 },

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

  previewWrap: {
    marginVertical: 10, borderRadius: Radius.xl,
    ...Platform.select({
      ios:     { shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  previewCard:    { height: 130, borderRadius: Radius.xl, overflow: 'hidden' },
  previewBlob1:   { position: 'absolute', width: 160, height: 160, borderRadius: 80, top: -50, right: -40 },
  previewBlob2:   { position: 'absolute', width: 100, height: 100, borderRadius: 50, bottom: -30, left: 30 },
  previewContent: { flex: 1, padding: 16, justifyContent: 'space-between' },
  previewTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconCircle:     { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  typePill:       { paddingHorizontal: 10, paddingVertical: 3.5, borderRadius: 99 },
  typeText:       { fontSize: 9.5, fontWeight: '700', letterSpacing: 1 },
  balanceValue:   { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, includeFontPadding: false },
  accountName:    { fontSize: 13.5, fontWeight: '600', includeFontPadding: false },

  fieldLabel: { marginTop: 12, marginBottom: 6 },
  input: { height: 48, borderRadius: Radius.lg, paddingHorizontal: 14, fontSize: 15 },

  chipRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 2 },
  chip:     { paddingHorizontal: 13, paddingVertical: 7, borderRadius: Radius.full },

  accordionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 16,
  },
  accordionContent: {
    paddingTop: 8,
    gap: 4,
  },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 },
  colorDot: { width: 34, height: 34, borderRadius: 17 },
  iconRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconOption: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 },
  toggle:    { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  toggleThumb: { width: 22, height: 22, borderRadius: 11 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: Radius.lg,
  },
});
