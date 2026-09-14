import { useState, useCallback, useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { useCategoryStore } from '@store/categoryStore';
import { useAccountStore } from '@store/accountStore';

import type { RecurringInterval } from '@store/plannedPaymentsStore';

export interface PlannedPaymentFormData {
  title:    string;
  amount:   number;
  dueDate:  string;
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

  const [title,    setTitleState]    = useState('');
  const [amount,   setAmountState]   = useState('');
  const [dueDate,  setDueDateState]  = useState('');
  const [category, setCategoryState] = useState('other');
  const [accountId, setAccountIdState] = useState('');
  const [isRecurring, setIsRecurringState] = useState(true);
  const [recurringInterval, setRecurringIntervalState] = useState<RecurringInterval>('monthly');
  const [error,     setError]         = useState<string | null>(null);
  const [isSaving,  setIsSaving]      = useState(false);

  useEffect(() => {
    if (!accountId && accounts.length > 0) {
      const defaultId = (accounts.find((a) => a.isDefault) ?? accounts[0])?.id ?? '';
      setAccountIdState(defaultId);
    }
  }, [accounts, accountId]);

  const setTitle = useCallback((val: string) => {
    setTitleState(val);
    setError(null);

    // Smart auto-categorization based on title keywords
    const lower = val.toLowerCase().trim();
    if (/netflix|spotify|prime|youtube|hulu|disney|movie|game|steam/i.test(lower)) {
      setCategoryState('entertainment');
    } else if (/rent|apartment|room|hostel|lease/i.test(lower)) {
      setCategoryState('housing');
    } else if (/wifi|broadband|internet|fiber|airtel|jio|act/i.test(lower)) {
      setCategoryState('utilities');
    } else if (/electricity|power|bescom|tneb|eb /i.test(lower)) {
      setCategoryState('utilities');
    } else if (/insurance|lic|health|policy/i.test(lower)) {
      setCategoryState('health');
    } else if (/tuition|school|college|udemy|coursera|course/i.test(lower)) {
      setCategoryState('education');
    } else if (/gym|fitness|cult|yoga/i.test(lower)) {
      setCategoryState('health');
    } else if (/fuel|petrol|diesel|metro|fastag|uber|ola/i.test(lower)) {
      setCategoryState('transport');
    }
  }, []);

  const setAmount = useCallback((val: string) => { setAmountState(val); setError(null); }, []);
  const setDueDate = useCallback((val: string) => { setDueDateState(val); setError(null); }, []);
  const setCategory = useCallback((val: string) => { setCategoryState(val); setError(null); }, []);
  const setAccountId = useCallback((val: string) => { setAccountIdState(val); setError(null); }, []);
  const setIsRecurring = useCallback((val: boolean) => { setIsRecurringState(val); }, []);
  const setRecurringInterval = useCallback((val: RecurringInterval) => { setRecurringIntervalState(val); }, []);

  const applyTemplate = useCallback((tpl: { title: string; category: string; amount?: number }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTitleState(tpl.title);
    setCategoryState(tpl.category);
    if (tpl.amount) {
      setAmountState(String(tpl.amount));
    }
    // Set default due date to 5 days from now if empty
    if (!dueDate) {
      const target = new Date();
      target.setDate(target.getDate() + 7);
      setDueDateState(target.toISOString().split('T')[0]);
    }
    setError(null);
  }, [dueDate]);

  const reset = useCallback(() => {
    const accounts_ = useAccountStore.getState().accounts;
    const defaultId = (accounts_.find((a) => a.isDefault) ?? accounts_[0])?.id ?? '';
    setTitleState('');
    setAmountState('');
    setDueDateState('');
    setCategoryState('other');
    setAccountIdState(defaultId);
    setIsRecurringState(true);
    setRecurringIntervalState('monthly');
    setError(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (isSaving) return;
    setError(null);
    const parsed = parseFloat(amount);
    if (!title.trim())                       { setError('Title is required');       return; }
    if (!parsed || parsed <= 0)              { setError('Enter a valid amount');    return; }
    if (!dueDate.match(/^\d{4}-\d{2}-\d{2}$/)) { setError('Please select a due date');   return; }
    if (!accountId)                          { setError('Select an account');       return; }

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
      reset();
      setIsSaving(false);
      onClose();
    }, 600);
  }, [isSaving, title, amount, dueDate, category, accountId, isRecurring, recurringInterval, onSubmit, onClose, reset]);

  const cats = allCategories.filter(
    (c) => c.applicableTo === 'expense' || c.applicableTo === 'both'
  );

  return {
    title,    setTitle,
    amount,   setAmount,
    dueDate,  setDueDate,
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
  };
}
