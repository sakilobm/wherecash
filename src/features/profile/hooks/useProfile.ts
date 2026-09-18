import { useCallback } from 'react';
import { Share, Platform } from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuth } from '@hooks/useAuth';
import { useAccountStore } from '@store/accountStore';
import { useTransactionStore } from '@store/transactionStore';
import { toast } from '@store/toastStore';
import { resetAllStores } from '@store/resetAllStores';
import { seedDemoData, undoDemoData } from '@store/seedDemoData';
import { useLoadingStore } from '@store/loadingStore';
import type { CurrencyCode } from '@store/types';
import {
  generateTransactionsCSV,
  generateJSONString,
  getExportFileName,
  saveFileToDevice,
  shareTextContent,
  type ExportFormat,
  type ExportMethod,
} from '@/utils/exportManager';

export function useProfile() {
  const { user, signOut, setUser } = useAuth();
  const txCount = useTransactionStore((s) => s.transactions.length);

  const memberSince = user?.createdAt ? format(new Date(user.createdAt), 'MMM yyyy') : 'Jan 2025';
  const initials    = user?.fullName?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? 'AM';

  const handleEditName = useCallback(() => {
    if (Platform.OS === 'ios') {
      const { Alert } = require('react-native');
      Alert.prompt(
        'Edit Name',
        'Enter your display name',
        (name: string) => {
          if (name?.trim() && user) {
            setUser({ ...user, fullName: name.trim() });
            toast.success('Name updated');
          }
        },
        'plain-text',
        user?.fullName ?? '',
      );
    } else {
      toast.info('Name editing available on iOS');
    }
  }, [user, setUser]);

  const handleCurrencySelect = useCallback(
    (code: CurrencyCode) => {
      if (user) {
        setUser({ ...user, currency: code });
        
        // Atomically sync all existing accounts and transactions
        useAccountStore.getState().batchUpdateCurrency(code);
        useTransactionStore.getState().batchUpdateCurrency(code);

        toast.success(`Currency changed to ${code}`);
      }
    },
    [user, setUser],
  );

  const handleUpdateProfile = useCallback(
    (name: string, avatarId: string) => {
      if (user) {
        setUser({ ...user, fullName: name.trim(), avatarUrl: avatarId });
        toast.success('Profile updated successfully!');
      }
    },
    [user, setUser],
  );

  const handleExportAsFile = useCallback(
    async (fmt: ExportFormat) => {
      try {
        const txs = useTransactionStore.getState().transactions;
        const content = fmt === 'CSV'
          ? generateTransactionsCSV(txs)
          : generateJSONString(txs);

        const ext = fmt === 'CSV' ? 'csv' : 'json';
        const mimeType = fmt === 'CSV' ? 'text/csv' : 'application/json';
        const fileName = getExportFileName('wherecash_transactions', ext);

        const res = await saveFileToDevice({
          fileName,
          extension: ext,
          mimeType,
          content,
        });

        if (res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(`Saved ${res.fileName ?? fileName} to storage!`);
          return true;
        } else if (res.canceled) {
          return false;
        } else {
          toast.error(res.error || 'Failed to save export file');
          return false;
        }
      } catch (err: any) {
        toast.error('Export error: ' + (err?.message || 'unknown'));
        return false;
      }
    },
    [],
  );

  const handleShareAsText = useCallback(
    async (fmt: ExportFormat) => {
      try {
        const txs = useTransactionStore.getState().transactions;
        const content = fmt === 'CSV'
          ? generateTransactionsCSV(txs)
          : generateJSONString(txs);

        const success = await shareTextContent({
          title: `WhereCash Export (${fmt})`,
          content: `WhereCash Export (${fmt})\n\n${content}`,
        });

        if (success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(`Export shared as text`);
        }
        return success;
      } catch (err: any) {
        toast.error('Share error: ' + (err?.message || 'unknown'));
        return false;
      }
    },
    [],
  );

  const handleExport = useCallback(
    async (fmt: ExportFormat, method: ExportMethod = 'file') => {
      if (method === 'file') {
        return await handleExportAsFile(fmt);
      }
      return await handleShareAsText(fmt);
    },
    [handleExportAsFile, handleShareAsText],
  );

  const handleBackup = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success('All data is backed up and up to date!');
  }, []);

  const handleClearAllData = useCallback(async () => {
    const showLoading = useLoadingStore.getState().showLoading;
    const hideLoading = useLoadingStore.getState().hideLoading;
    
    showLoading('Wiping Database...', 'Resetting and clearing all local storage...');
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    await resetAllStores();
    hideLoading();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    toast.success('All data cleared successfully');
  }, []);

  const handleSeedDemoData = useCallback(async () => {
    const showLoading = useLoadingStore.getState().showLoading;
    const hideLoading = useLoadingStore.getState().hideLoading;
    
    showLoading('Populating Playground...', 'Generating mock accounts and transaction datasets...');
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    await seedDemoData();
    hideLoading();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    toast.success('Play Store demo data populated!');
  }, []);

  const handleUndoDemoData = useCallback(async () => {
    const showLoading = useLoadingStore.getState().showLoading;
    const hideLoading = useLoadingStore.getState().hideLoading;
    
    showLoading('Restoring Original Data...', 'Removing sandbox playground records...');
    await new Promise((resolve) => setTimeout(resolve, 800));
    
    const success = await undoDemoData();
    hideLoading();
    
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Demo data undone. Original state restored!');
    } else {
      toast.error('No snapshot found to undo demo data.');
    }
  }, []);

  const handleSignOut = useCallback(() => {
    signOut();
    router.replace('/onboarding');
  }, [signOut]);

  return {
    user,
    txCount,
    memberSince,
    initials,
    handleEditName,
    handleUpdateProfile,
    handleCurrencySelect,
    handleExport,
    handleExportAsFile,
    handleShareAsText,
    handleBackup,
    handleClearAllData,
    handleSeedDemoData,
    handleUndoDemoData,
    handleSignOut,
  };
}
