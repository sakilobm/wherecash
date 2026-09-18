import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { zustandStorage } from './storage';
import type { Account, CurrencyCode } from './types';

interface AccountState {
  accounts: Account[];
  activeAccountId: string | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  setAccounts: (accounts: Account[]) => void;
  addAccount: (account: Account) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  batchUpdateCurrency: (currency: CurrencyCode) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      activeAccountId: null,
      isLoading: false,
      isError: false,
      error: null,

      setAccounts: (accounts) => {
        const defaultAccount = accounts.find((a) => a.isDefault) ?? accounts[0] ?? null;
        set({ accounts, activeAccountId: defaultAccount?.id ?? null, isLoading: false, isError: false, error: null });
      },

      addAccount: (account) =>
        set((state) => ({ accounts: [...state.accounts, account] })),

      updateAccount: (id, updates) =>
        set((state) => ({
          accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        })),

      batchUpdateCurrency: (currency) =>
        set((state) => ({
          accounts: state.accounts.map((a) => ({ ...a, currency })),
        })),

      deleteAccount: (id) =>
        set((state) => ({
          accounts: state.accounts.filter((a) => a.id !== id),
          activeAccountId: state.activeAccountId === id ? null : state.activeAccountId,
        })),

      setActiveAccount: (id) => set({ activeAccountId: id }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isError: error !== null, isLoading: false }),

      reset: () => set({ accounts: [], activeAccountId: null }),
    }),
    {
      name: 'wc-accounts',
      storage: zustandStorage,
      partialize: (s) => ({ accounts: s.accounts, activeAccountId: s.activeAccountId }),
    }
  )
);
