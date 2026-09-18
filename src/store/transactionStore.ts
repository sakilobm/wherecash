import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from './storage';
import type { Transaction, NewTransaction, TransactionType, TransactionCategory, CurrencyCode } from './types';
import { CURRENCY_SYMBOLS } from './types';
import { usePreferencesStore } from './preferencesStore';
import { useBudgetStore } from './budgetStore';

export interface TransactionFilters {
  type: TransactionType | 'all' | 'loan';
  category: TransactionCategory | 'all';
  month: string | null;      // 'YYYY-MM'
  accountId: string | null;
  searchQuery: string;
}

interface TransactionState {
  transactions: Transaction[];
  filters: TransactionFilters;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  setTransactions: (transactions: Transaction[]) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<NewTransaction>) => void;
  batchUpdateCurrency: (currency: CurrencyCode) => void;
  deleteTransaction: (id: string) => void;
  setFilters: (filters: Partial<TransactionFilters>) => void;
  resetFilters: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const DEFAULT_FILTERS: TransactionFilters = {
  type: 'all',
  category: 'all',
  month: null,
  accountId: null,
  searchQuery: '',
};

export const useTransactionStore = create<TransactionState>()(
  persist(
    (set) => ({
      transactions: [],
      filters: DEFAULT_FILTERS,
      isLoading: false,
      isError: false,
      error: null,

      setTransactions: (transactions) =>
        set({ transactions, isLoading: false, isError: false, error: null }),

      addTransaction: (transaction) => {
        set((state) => ({ transactions: [transaction, ...state.transactions] }));

        // Handle local notifications asynchronously in the background
        setTimeout(async () => {
          try {
            const prefs = usePreferencesStore.getState().notifPrefs;
            const currencySymbol = CURRENCY_SYMBOLS[transaction.currency] || transaction.currency;

            // 1. Transaction Alert
            if (prefs.transactions && transaction.amount >= prefs.minAlertAmount) {
              let bypassQuietHours = false;
              if (prefs.quietHours) {
                const hr = new Date().getHours();
                if (hr >= 22 || hr < 7) {
                  bypassQuietHours = true; // silent during quiet hours
                }
              }

              if (!bypassQuietHours) {
                const amountStr = `${currencySymbol}${transaction.amount.toFixed(2)}`;
                let title = 'Transaction Recorded';
                let body = '';

                if (transaction.type === 'expense') {
                  title = 'New Expense 💸';
                  body = `Spent ${amountStr} on ${transaction.category}${transaction.description ? ` (${transaction.description})` : ''}`;
                } else if (transaction.type === 'income') {
                  title = 'Income Received 💰';
                  body = `Received ${amountStr} from ${transaction.category}${transaction.description ? ` (${transaction.description})` : ''}`;
                } else {
                  title = 'Funds Transferred 🔄';
                  body = `Transferred ${amountStr}${transaction.description ? ` (${transaction.description})` : ''}`;
                }

                const { sendImmediateNotification } = await import('@features/notifications/services/notificationService');
                await sendImmediateNotification(title, body);
              }
            }

            // 2. Budget Alert (Only for Expenses)
            if (prefs.budgetAlerts && transaction.type === 'expense') {
              const budgets = useBudgetStore.getState().budgets;
              const budget = budgets.find((b) => b.category === transaction.category);

              if (budget) {
                const limit = budget.limit;
                const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
                
                // Get all transactions for current category and month
                const currentMonthTxs = useTransactionStore.getState().transactions.filter(
                  (t) => t.type === 'expense' && t.category === transaction.category && t.date.startsWith(currentMonth)
                );
                
                const newSpent = currentMonthTxs.reduce((sum, t) => sum + t.amount, 0);
                const oldSpent = newSpent - transaction.amount;

                let bypassQuietHours = false;
                if (prefs.quietHours) {
                  const hr = new Date().getHours();
                  if (hr >= 22 || hr < 7) {
                    bypassQuietHours = true;
                  }
                }

                if (!bypassQuietHours) {
                  const { sendImmediateNotification } = await import('@features/notifications/services/notificationService');
                  
                  if (newSpent > limit && oldSpent <= limit) {
                    await sendImmediateNotification(
                      'Budget Exceeded! ⚠️',
                      `You've spent ${currencySymbol}${newSpent.toFixed(2)} of your ${currencySymbol}${limit.toFixed(2)} budget for ${transaction.category}.`
                    );
                  } else if (newSpent >= limit * 0.85 && oldSpent < limit * 0.85 && newSpent <= limit) {
                    await sendImmediateNotification(
                      'Budget Warning! ⚠️',
                      `You have reached 85% (${currencySymbol}${newSpent.toFixed(2)}) of your ${currencySymbol}${limit.toFixed(2)} budget for ${transaction.category}.`
                    );
                  }
                }
              }
            }
          } catch (err) {
            console.error('[NotificationService] Failed to dispatch local transaction/budget alerts:', err);
          }
        }, 150);
      },

      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
        })),

      batchUpdateCurrency: (currency) =>
        set((state) => ({
          transactions: state.transactions.map((t) => ({ ...t, currency })),
        })),

      deleteTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),

      setFilters: (filters) =>
        set((state) => ({ filters: { ...state.filters, ...filters } })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isError: error !== null, isLoading: false }),

      reset: () => set({ transactions: [], filters: DEFAULT_FILTERS }),
    }),
    {
      name: 'wc-transactions',
      storage: zustandStorage,
      partialize: (s) => ({ transactions: s.transactions }),
    }
  )
);
