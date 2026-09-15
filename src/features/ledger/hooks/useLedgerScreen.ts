/**
 * @file useLedgerScreen.ts
 * @architecture Business Logic Layer — Headless Screen Hook
 * @description Manages all state machines, sheet toggles, derived data, and event handlers
 *   for the Ledger screen. Composes useLedger + useLoans into a single typed contract that
 *   the LedgerScreen view shell consumes via destructuring. Contains zero JSX.
 * @associatedFiles
 *   src/app/(tabs)/ledger.tsx,
 *   src/features/ledger/hooks/useLedger.ts,
 *   src/features/ledger/hooks/useLoans.ts
 */

import { useState, useCallback, useMemo } from 'react';
import { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useLedger } from './useLedger';
import { useLoans }  from './useLoans';
import type { LedgerEntry, LedgerDirection } from '@store/ledgerStore';
import type { LedgerTab } from '../types';
import type { Loan } from '@store/loansStore';

// ─── Internal types ───────────────────────────────────────────────────────────

export type SheetMode = 'add' | 'partial';

export interface LedgerSection {
  title: string;
  data:  LedgerEntry[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLedgerScreen() {

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<LedgerTab>('owed_to_me');

  // ── Entry / partial-return sheet ───────────────────────────────────────────
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetMode,    setSheetMode]    = useState<SheetMode>('add');
  const [sheetEntry,   setSheetEntry]   = useState<LedgerEntry | undefined>();

  // ── Detail info sheet ──────────────────────────────────────────────────────
  const [infoEntry, setInfoEntry] = useState<LedgerEntry | undefined>();

  // ── Loan detail/edit sheets ────────────────────────────────────────────────
  const [loanSheetVisible, setLoanSheetVisible] = useState(false);
  const [infoLoanId, setInfoLoanId]             = useState<string | null>(null);
  const [editLoan, setEditLoan]                 = useState<Loan | undefined>();

  // ── Scroll Animation for Directional FAB Auto-Hide/Show (100% Native UI Thread) ──
  const isFabVisible = useSharedValue(true);
  const lastScrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      'worklet';
      const currentY = event.contentOffset.y;
      const diff = currentY - lastScrollY.value;

      // Scroll Down (browsing entries/loans): hide FAB so it never blocks card details / actions
      if (diff > 6 && currentY > 35) {
        isFabVisible.value = false;
      }
      // Scroll Up or near top: immediately reveal FAB
      else if (diff < -6 || currentY <= 20) {
        isFabVisible.value = true;
      }

      lastScrollY.value = currentY;
    },
  });

  // ── Data layers ────────────────────────────────────────────────────────────
  const {
    entries: allEntries,
    totalOwedToMe,
    totalIOwe,
    addEntry,
    addPartialReturn,
    settleEntry,
    deleteEntry,
  } = useLedger();

  const {
    loans,
    recordPayment,
    undoPayment,
    addLoan,
    deleteLoan,
    updateLoan,
    toggleLoanReminder,
  } = useLoans();

  const infoLoan = useMemo(() => {
    return loans.find((l) => l.id === infoLoanId);
  }, [loans, infoLoanId]);

  // ── Derived data (memoised — no filtering logic in the view shell) ─────────

  const directionEntries = useMemo<LedgerEntry[]>(() => {
    if (activeTab === 'owed_to_me') return allEntries.filter((e) => e.direction === 'OWED_TO_ME');
    if (activeTab === 'i_owe')      return allEntries.filter((e) => e.direction === 'I_OWE');
    return [];
  }, [allEntries, activeTab]);

  const activeEntries  = useMemo(() => directionEntries.filter((e) => e.status !== 'SETTLED'), [directionEntries]);
  const settledEntries = useMemo(() => directionEntries.filter((e) => e.status === 'SETTLED'),  [directionEntries]);

  const sections = useMemo<LedgerSection[]>(() => [
    ...(activeEntries.length  > 0 ? [{ title: 'Active',  data: activeEntries  }] : []),
    ...(settledEntries.length > 0 ? [{ title: 'Settled', data: settledEntries }] : []),
  ], [activeEntries, settledEntries]);

  // ── Sheet toggles ──────────────────────────────────────────────────────────

  const openAddSheet = useCallback(() => {
    setSheetMode('add');
    setSheetEntry(undefined);
    setSheetVisible(true);
  }, []);

  const openPartialSheet = useCallback((entry: LedgerEntry) => {
    setSheetMode('partial');
    setSheetEntry(entry);
    setSheetVisible(true);
  }, []);

  const closeSheet     = useCallback(() => setSheetVisible(false), []);
  const openInfoSheet  = useCallback((entry: LedgerEntry) => setInfoEntry(entry), []);
  const closeInfoSheet = useCallback(() => setInfoEntry(undefined), []);

  const openLoanSheet = useCallback(() => {
    setEditLoan(undefined);
    setLoanSheetVisible(true);
  }, []);

  const closeLoanSheet = useCallback(() => {
    setLoanSheetVisible(false);
    setEditLoan(undefined);
  }, []);

  const openLoanInfoSheet = useCallback((loan: Loan) => {
    setInfoLoanId(loan.id);
  }, []);

  const closeLoanInfoSheet = useCallback(() => {
    setInfoLoanId(null);
  }, []);

  const openEditLoanSheet = useCallback((loan: Loan) => {
    setEditLoan(loan);
    setLoanSheetVisible(true);
  }, []);

  const handleAddLoan = useCallback((loanDraft: any, postPrincipal?: boolean) => {
    addLoan(loanDraft, postPrincipal);
  }, [addLoan]);

  const handleEditLoan = useCallback((loanId: string, updates: Partial<Loan>) => {
    updateLoan(loanId, updates);
  }, [updateLoan]);

  const handleToggleReminder = useCallback(async (loanId: string, enabled: boolean, time: string) => {
    await toggleLoanReminder(loanId, enabled, time);
  }, [toggleLoanReminder]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /**
   * Called when the LedgerEntrySheet submits a new entry.
   * Attaches today's date and delegates to the store; the store computes
   * personInitials and personColor from the name automatically.
   */
  const handleAddEntry = useCallback((data: {
    personName:  string;
    direction:   LedgerDirection;
    totalAmount: number;
    currency:    string;
    note?:       string;
    dueDate?:    string;
    accountId:   string;
  }) => {
    addEntry({
      ...data,
      personInitials: '',
      personColor:    '',
      date: new Date().toISOString().slice(0, 10),
    });
  }, [addEntry]);

  /** Marks an entry settled and dismisses the info sheet atomically. */
  const handleSettle = useCallback((id: string) => {
    settleEntry(id);
    setInfoEntry(undefined);
  }, [settleEntry]);

  // ── Public contract ────────────────────────────────────────────────────────

  return {
    // State
    activeTab,
    sheetVisible,
    sheetMode,
    sheetEntry,
    infoEntry,
    loanSheetVisible,
    infoLoan,
    editLoan,
    isFabVisible,
    onScroll,
    // Data
    totalOwedToMe,
    totalIOwe,
    loans,
    sections,
    activeEntries,
    // Handlers & toggles
    setActiveTab,
    openAddSheet,
    openPartialSheet,
    closeSheet,
    openInfoSheet,
    closeInfoSheet,
    openLoanSheet,
    closeLoanSheet,
    openLoanInfoSheet,
    closeLoanInfoSheet,
    openEditLoanSheet,
    handleAddEntry,
    handleSettle,
    deleteEntry,
    addPartialReturn,
    recordPayment,
    undoPayment,
    handleAddLoan,
    handleEditLoan,
    deleteLoan,
    handleToggleReminder,
  } as const;
}
