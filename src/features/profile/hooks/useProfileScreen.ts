/**
 * @file useProfileScreen.ts
 * @architecture Business Logic Layer — Headless Screen Hook
 * @description Encapsulates ALL state for the Profile screen: bottom-sheet visibility,
 *   confirm-modal visibility, notification preferences, security preferences, and
 *   wraps business operations from useProfile with sheet-closing side-effects.
 *   The View layer receives a typed contract and owns zero raw setState calls.
 * @associatedFiles src/features/profile/hooks/useProfile.ts, src/app/(tabs)/profile.tsx
 */

import { useState, useCallback, useEffect } from 'react';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, router } from 'expo-router';
import { toast } from '@store/toastStore';
import { useProfile } from './useProfile';
import { usePreferencesStore } from '@store/preferencesStore';
import type { CurrencyCode } from '@store/types';

// ─── Sub-contracts ────────────────────────────────────────────────────────────

export interface SheetHandle {
  isOpen: boolean;
  open:   () => void;
  close:  () => void;
}

export interface ConfirmHandle {
  isVisible: boolean;
  show:      () => void;
  dismiss:   () => void;
  confirm:   () => void;
}

export interface NotifPrefs {
  transactions: boolean;
  budgetAlerts: boolean;
  plannedPay:   boolean;
  weeklyReport: boolean;
  quietHours:   boolean;
  minAlertAmount: number;
  channels: 'push' | 'email' | 'both';
  smartInsights: boolean;
}

export interface SecPrefs {
  biometric:   boolean;
  autoLock:    boolean;
  hideBalance: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProfileScreen() {
  const {
    user, txCount, memberSince, initials,
    handleEditName, handleCurrencySelect: currencySelect,
    handleExport: exportData, handleBackup,
    handleClearAllData: clearAllData, handleSeedDemoData, handleUndoDemoData, handleSignOut,
  } = useProfile();

  // ── Sheet visibility ──
  const [currencySheet, setCurrencySheet] = useState(false);
  const [notifSheet,    setNotifSheet]    = useState(false);
  const [securitySheet, setSecuritySheet] = useState(false);
  const [hapticsSheet,  setHapticsSheet]  = useState(false);
  const [exportSheet,   setExportSheet]   = useState(false);
  const [helpSheet,     setHelpSheet]     = useState(false);
  const [backupSheet,   setBackupSheet]   = useState(false);
  const [importSheet,   setImportSheet]   = useState(false);
  const [guidesSheet,   setGuidesSheet]   = useState(false);

  // ── Confirm dialogs ──
  const [signOutConfirm,   setSignOutConfirm]   = useState(false);
  const [clearDataConfirm, setClearDataConfirm] = useState(false);
  const [seedDataConfirm,  setSeedDataConfirm]  = useState(false);
  const [undoDataConfirm,  setUndoDataConfirm]  = useState(false);
  const [rateConfirm,      setRateConfirm]      = useState(false);

  const [hasSnapshot, setHasSnapshot] = useState(false);

  const [secPrefs, setSecPrefs] = useState<SecPrefs>({
    biometric: false, autoLock: true, hideBalance: false,
  });
  
  const hapticLevel = usePreferencesStore((s) => s.hapticLevel);
  const notifPrefs = usePreferencesStore((s) => s.notifPrefs);
  const setNotifPrefs = usePreferencesStore((s) => s.setNotifPrefs);
  const autoBackupEnabled = usePreferencesStore((s) => s.autoBackupEnabled);
  const lastBackupTime = usePreferencesStore((s) => s.lastBackupTime);

  // Check on mount if a demo snapshot is available to undo
  useEffect(() => {
    AsyncStorage.getItem('wc_demo_snapshot_data').then((val) => {
      setHasSnapshot(!!val);
    });
  }, []);

  const params = useLocalSearchParams<{ openGuides?: string }>();

  // Open interactive guides sheet automatically if redirecting back from tutorial
  useEffect(() => {
    if (params.openGuides === 'true') {
      setGuidesSheet(true);
      // Clean up the URL search params so it doesn't reopen on reload
      router.setParams({ openGuides: undefined });
    }
  }, [params.openGuides]);

  // ── Handlers that close sheets before delegating ──
  const handleSelectCurrency = useCallback((code: CurrencyCode) => {
    currencySelect(code);
    setCurrencySheet(false);
  }, [currencySelect]);

  const handleExport = useCallback(async (fmt: 'CSV' | 'JSON', method: 'file' | 'text' = 'file') => {
    setExportSheet(false);
    await exportData(fmt, method);
  }, [exportData]);

  const confirmSignOut = useCallback(() => {
    setSignOutConfirm(false);
    handleSignOut();
  }, [handleSignOut]);

  const confirmClearData = useCallback(async () => {
    setClearDataConfirm(false);
    await clearAllData();
    setHasSnapshot(false);
  }, [clearAllData]);

  const confirmSeedData = useCallback(async () => {
    setSeedDataConfirm(false);
    await handleSeedDemoData();
    setHasSnapshot(true);
  }, [handleSeedDemoData]);

  const confirmUndoData = useCallback(async () => {
    setUndoDataConfirm(false);
    await handleUndoDemoData();
    setHasSnapshot(false);
  }, [handleUndoDemoData]);

  const confirmRate = useCallback(() => {
    setRateConfirm(false);
    toast.success('Redirecting to Play Store... ⭐');
    const pkg = Constants.expoConfig?.android?.package ?? 'com.wherecash.app';
    const playStoreUrl = `https://play.google.com/store/apps/details?id=${pkg}`;
    Linking.canOpenURL(playStoreUrl)
      .then((supported) => {
        if (supported) Linking.openURL(playStoreUrl);
        else toast.info('Play Store link not available in dev mode');
      })
      .catch(() => toast.error('Could not open store link'));
  }, []);

  return {
    data: {
      user,
      txCount,
      memberSince,
      initials,
    },

    hasSnapshot,

    sheets: {
      currency: {
        isOpen: currencySheet,
        open:   () => { Haptics.selectionAsync(); setCurrencySheet(true); },
        close:  () => setCurrencySheet(false),
      } satisfies SheetHandle,
      notifications: {
        isOpen: notifSheet,
        open:   () => { Haptics.selectionAsync(); setNotifSheet(true); },
        close:  () => setNotifSheet(false),
      } satisfies SheetHandle,
      security: {
        isOpen: securitySheet,
        open:   () => { Haptics.selectionAsync(); setSecuritySheet(true); },
        close:  () => setSecuritySheet(false),
      } satisfies SheetHandle,
      haptics: {
        isOpen: hapticsSheet,
        open:   () => { Haptics.selectionAsync(); setHapticsSheet(true); },
        close:  () => setHapticsSheet(false),
      } satisfies SheetHandle,
      export: {
        isOpen: exportSheet,
        open:   () => { Haptics.selectionAsync(); setExportSheet(true); },
        close:  () => setExportSheet(false),
      } satisfies SheetHandle,
      help: {
        isOpen: helpSheet,
        open:   () => { Haptics.selectionAsync(); setHelpSheet(true); },
        close:  () => setHelpSheet(false),
      } satisfies SheetHandle,
      backup: {
        isOpen: backupSheet,
        open:   () => { Haptics.selectionAsync(); setBackupSheet(true); },
        close:  () => setBackupSheet(false),
      } satisfies SheetHandle,
      import: {
        isOpen: importSheet,
        open:   () => { Haptics.selectionAsync(); setImportSheet(true); },
        close:  () => setImportSheet(false),
      } satisfies SheetHandle,
      guides: {
        isOpen: guidesSheet,
        open:   () => { Haptics.selectionAsync(); setGuidesSheet(true); },
        close:  () => setGuidesSheet(false),
      } satisfies SheetHandle,
    },

    confirms: {
      signOut: {
        isVisible: signOutConfirm,
        show:    () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSignOutConfirm(true); },
        dismiss: () => setSignOutConfirm(false),
        confirm: confirmSignOut,
      } satisfies ConfirmHandle,
      clearData: {
        isVisible: clearDataConfirm,
        show:    () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); setClearDataConfirm(true); },
        dismiss: () => setClearDataConfirm(false),
        confirm: confirmClearData,
      } satisfies ConfirmHandle,
      seedData: {
        isVisible: seedDataConfirm,
        show:    () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setSeedDataConfirm(true); },
        dismiss: () => setSeedDataConfirm(false),
        confirm: confirmSeedData,
      } satisfies ConfirmHandle,
      undoData: {
        isVisible: undoDataConfirm,
        show:    () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setUndoDataConfirm(true); },
        dismiss: () => setUndoDataConfirm(false),
        confirm: confirmUndoData,
      } satisfies ConfirmHandle,
      rate: {
        isVisible: rateConfirm,
        show:    () => setRateConfirm(true),
        dismiss: () => setRateConfirm(false),
        confirm: confirmRate,
      } satisfies ConfirmHandle,
    },

    preferences: {
      notifications: notifPrefs,
      security:      secPrefs,
      haptics: {
        level: hapticLevel,
      },
      backup: {
        autoEnabled: autoBackupEnabled,
        lastTime: lastBackupTime,
      },
      updateNotification: <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
        Haptics.selectionAsync();
        setNotifPrefs({ [key]: value });
      },
      updateSecurity: (key: keyof SecPrefs, value: boolean) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSecPrefs((p) => ({ ...p, [key]: value }));
      },
    },

    handlers: {
      editName:       handleEditName,
      selectCurrency: handleSelectCurrency,
      exportData:     handleExport,
      backup:         handleBackup,
    },
  };
}
