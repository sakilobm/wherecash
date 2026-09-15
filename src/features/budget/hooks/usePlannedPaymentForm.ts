/**
 * @file usePlannedPaymentForm.ts
 * @architecture Business Logic Layer — Headless Form Hook
 * @description Manages state, validation, and auto-categorization for planned payments.
 *   Connected to usePlannedPaymentDraftStore to preserve draft fields across screen transitions.
 * @associatedFiles src/store/plannedPaymentDraftStore.ts, src/components/budget/AddPaymentSheet.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useCategoryStore } from '@store/categoryStore';
import { useAccountStore } from '@store/accountStore';
import { usePlannedPaymentDraftStore } from '@store/plannedPaymentDraftStore';
import type { RecurringInterval } from '@store/plannedPaymentsStore';

export interface PlannedPaymentFormData {
  title: string;
  amount: number;
  dueDate: string;
  category: string;
  accountId: string;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
}

export function usePlannedPaymentForm(
  onSubmit: (data: PlannedPaymentFormData) => void,
  onClose:  () => void,
) {
  const allCategories = useCategoryStore((s) => s.categories);
  const accounts = useAccountStore((s) => s.accounts);

  // Draft store bindings
  const step = usePlannedPaymentDraftStore((s) => s.step);
  const setStep = usePlannedPaymentDraftStore((s) => s.setStep);
  const title = usePlannedPaymentDraftStore((s) => s.title);
  const setTitle = usePlannedPaymentDraftStore((s) => s.setTitle);
  const amount = usePlannedPaymentDraftStore((s) => s.amount);
  const setAmount = usePlannedPaymentDraftStore((s) => s.setAmount);
  const dueDate = usePlannedPaymentDraftStore((s) => s.dueDate);
  const setDueDate = usePlannedPaymentDraftStore((s) => s.setDueDate);
  const category = usePlannedPaymentDraftStore((s) => s.category);
  const setCategory = usePlannedPaymentDraftStore((s) => s.setCategory);
  const accountId = usePlannedPaymentDraftStore((s) => s.accountId);
  const setAccountId = usePlannedPaymentDraftStore((s) => s.setAccountId);
  const isRecurring = usePlannedPaymentDraftStore((s) => s.isRecurring);
  const setIsRecurring = usePlannedPaymentDraftStore((s) => s.setIsRecurring);
  const recurringInterval = usePlannedPaymentDraftStore((s) => s.recurringInterval);
  const setRecurringInterval = usePlannedPaymentDraftStore((s) => s.setRecurringInterval);
  const applyTemplate = usePlannedPaymentDraftStore((s) => s.applyTemplate);
  const resetDraft = usePlannedPaymentDraftStore((s) => s.resetDraft);

  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-select default account if none selected and accounts exist
  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defaultId = (accounts.find((a) => a.isDefault) ?? accounts[0])?.id ?? '';
      setAccountId(defaultId);
    }
  }, [accounts, accountId, setAccountId]);

  const reset = useCallback(() => {
    resetDraft();
    setError(null);
  }, [resetDraft]);

  const handleSubmit = useCallback(() => {
    if (isSaving) return;
    setError(null);
    const parsed = parseFloat(amount);
    if (!title.trim()) { setError('Title is required'); return; }
    if (!parsed || parsed <= 0) { setError('Enter a valid amount'); return; }
    if (!dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('Please select a due date'); return; }
    if (!accountId) { setError('Select an account'); return; }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    setTimeout(() => {
      onSubmit({
        title: title.trim(),
        amount: parsed,
        dueDate,
        category,
        accountId,
        isRecurring,
        recurringInterval: isRecurring ? recurringInterval : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      resetDraft();
      setIsSaving(false);
      onClose();
    }, 600);
  }, [isSaving, title, amount, dueDate, category, accountId, isRecurring, recurringInterval, onSubmit, onClose, resetDraft]);

  const cats = allCategories.filter(
    (c) => c.applicableTo === 'expense' || c.applicableTo === 'both'
  );

  return {
    step, setStep,
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
    resetDraft,
    error,
    setError,
    isSaving,
  };
}
