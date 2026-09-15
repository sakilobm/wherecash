/**
 * @file plannedPaymentDraftStore.ts
 * @architecture State Management Layer — Zustand Store
 * @description Centralized draft store for the Add Planned Payment wizard.
 *   Preserves filled bill details across screen transitions (e.g. when redirecting
 *   to /accounts to manage or create accounts, and returning with auto-selection).
 * @associatedFiles src/features/budget/hooks/usePlannedPaymentForm.ts,
 *   src/components/budget/AddPaymentSheet.tsx, src/features/accounts/hooks/useAccountsScreen.ts
 */

import { create } from 'zustand';
import type { RecurringInterval } from './plannedPaymentsStore';

export interface PlannedPaymentDraftState {
  step: 1 | 2;
  pendingNavigation: boolean;

  title: string;
  amount: string;
  dueDate: string;
  category: string;
  accountId: string;
  isRecurring: boolean;
  recurringInterval: RecurringInterval;

  // Setters
  setStep: (step: 1 | 2) => void;
  setPendingNavigation: (pending: boolean) => void;
  setTitle: (title: string) => void;
  setAmount: (amount: string) => void;
  setDueDate: (dueDate: string) => void;
  setCategory: (category: string) => void;
  setAccountId: (accountId: string) => void;
  setIsRecurring: (isRecurring: boolean) => void;
  setRecurringInterval: (recurringInterval: RecurringInterval) => void;
  applyTemplate: (tpl: { title: string; category: string; amount?: number }) => void;
  resetDraft: () => void;
}

const DEFAULT_DRAFT = {
  step: 1 as const,
  pendingNavigation: false,
  title: '',
  amount: '',
  dueDate: '',
  category: 'other',
  accountId: '',
  isRecurring: true,
  recurringInterval: 'monthly' as const,
};

export const usePlannedPaymentDraftStore = create<PlannedPaymentDraftState>((set) => ({
  ...DEFAULT_DRAFT,

  setStep: (step) => set({ step }),
  setPendingNavigation: (pendingNavigation) => set({ pendingNavigation }),

  setTitle: (title) => {
    // Smart auto-categorization based on title keywords
    const lower = title.toLowerCase().trim();
    let cat: string | null = null;
    if (/netflix|spotify|prime|youtube|hulu|disney|movie|game|steam/i.test(lower)) {
      cat = 'entertainment';
    } else if (/rent|apartment|room|hostel|lease/i.test(lower)) {
      cat = 'housing';
    } else if (/wifi|broadband|internet|fiber|airtel|jio|act/i.test(lower)) {
      cat = 'utilities';
    } else if (/electricity|power|bescom|tneb|eb /i.test(lower)) {
      cat = 'utilities';
    } else if (/insurance|lic|health|policy/i.test(lower)) {
      cat = 'health';
    } else if (/tuition|school|college|udemy|coursera|course/i.test(lower)) {
      cat = 'education';
    } else if (/gym|fitness|cult|yoga/i.test(lower)) {
      cat = 'health';
    } else if (/fuel|petrol|diesel|metro|fastag|uber|ola/i.test(lower)) {
      cat = 'transport';
    }

    set((state) => ({
      title,
      category: cat ? cat : state.category,
    }));
  },

  setAmount: (amount) => set({ amount }),
  setDueDate: (dueDate) => set({ dueDate }),
  setCategory: (category) => set({ category }),
  setAccountId: (accountId) => set({ accountId }),
  setIsRecurring: (isRecurring) => set({ isRecurring }),
  setRecurringInterval: (recurringInterval) => set({ recurringInterval }),

  applyTemplate: (tpl) => {
    const target = new Date();
    target.setDate(target.getDate() + 7);
    const defaultDate = target.toISOString().split('T')[0];

    set((state) => ({
      title: tpl.title,
      category: tpl.category,
      amount: tpl.amount ? String(tpl.amount) : state.amount,
      dueDate: state.dueDate || defaultDate,
    }));
  },

  resetDraft: () => set({ ...DEFAULT_DRAFT }),
}));
