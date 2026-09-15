/**
 * @file backupManager.ts
 * @architecture Utility / Infrastructure Layer — Backup & Sync Engine
 * @description Robust, local-first backup management system for WhereCash.
 *   - Auto-creates and manages sandboxed backup storage (`backups/`)
 *   - Creates complete atomic database snapshots of all 7 core stores
 *   - Auto-rotates to retain the latest 5 snapshots to conserve device storage
 *   - Triggers persistent notifications in NotificationStore and instant device alerts
 *   - Provides 1-tap JSON file restore (via DocumentPicker) and local snapshot restoration
 *   - Supports sharing and exporting backups externally
 * @associatedFiles
 *   src/components/profile/BackupSyncSheet.tsx,
 *   src/store/preferencesStore.ts,
 *   src/store/notificationStore.ts
 */

import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { useAccountStore } from '@store/accountStore';
import { useTransactionStore } from '@store/transactionStore';
import { useCategoryStore } from '@store/categoryStore';
import { usePlannedPaymentsStore } from '@store/plannedPaymentsStore';
import { useBudgetStore } from '@store/budgetStore';
import { useLoansStore } from '@store/loansStore';
import { useLedgerStore } from '@store/ledgerStore';
import { usePreferencesStore } from '@store/preferencesStore';
import { useNotificationStore } from '@store/notificationStore';
import { sendInstantNotification } from '@/features/notifications/services/notificationService';
import { saveFileToDevice, getExportFileName } from '@/utils/exportManager';

// ─── Constants & Types ────────────────────────────────────────────────────────

const BACKUP_DIR_NAME = 'backups';
export const MAX_RETAINED_SNAPSHOTS = 5;

export interface BackupSnapshot {
  fileName: string;
  uri: string;
  sizeBytes: number;
  sizeFormatted: string;
  timestamp: string;
  formattedDate: string;
  recordCount: number;
  version: string;
}

export interface BackupDataPayload {
  version: string;
  app: string;
  timestamp: string;
  stats: {
    accounts: number;
    transactions: number;
    categories: number;
    budgets: number;
    loans: number;
    ledger: number;
    totalRecords: number;
  };
  accounts: any[];
  transactions: any[];
  categories: any[];
  payments: any[];
  budgets?: any[];
  loans?: any[];
  ledger?: any[];
  preferences?: Record<string, any>;
}

export interface RestoreResult {
  success: boolean;
  restoredRecords: number;
  timestamp?: string;
  error?: string;
  canceled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBackupDirectory(): string {
  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? '';
  return `${baseDir}${BACKUP_DIR_NAME}/`;
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatBackupDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'Unknown date';
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) return `Today, ${timeStr}`;

    const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  } catch {
    return 'Unknown date';
  }
}

// ─── File System Operations ───────────────────────────────────────────────────

/**
 * Ensures the internal sandboxed `backups/` directory exists.
 */
export async function ensureBackupDirectory(): Promise<string> {
  const dir = getBackupDirectory();
  try {
    const info = await FileSystem.getInfoAsync(dir);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  } catch (err) {
    console.warn('[backupManager] Failed to create backup directory:', err);
  }
  return dir;
}

/**
 * Builds the complete database payload from all 7 Zustand stores.
 */
export function generateFullBackupData(): BackupDataPayload {
  const accounts = useAccountStore.getState().accounts;
  const transactions = useTransactionStore.getState().transactions;
  const categories = useCategoryStore.getState().categories;
  const payments = usePlannedPaymentsStore.getState().payments;
  const budgets = useBudgetStore.getState().budgets;
  const loans = useLoansStore.getState().loans;
  const ledger = useLedgerStore.getState().entries;
  const prefs = usePreferencesStore.getState();

  const totalRecords =
    accounts.length +
    transactions.length +
    categories.length +
    payments.length +
    budgets.length +
    loans.length +
    ledger.length;

  return {
    version: '1.1.0',
    app: 'WhereCash',
    timestamp: new Date().toISOString(),
    stats: {
      accounts: accounts.length,
      transactions: transactions.length,
      categories: categories.length,
      budgets: budgets.length,
      loans: loans.length,
      ledger: ledger.length,
      totalRecords,
    },
    accounts,
    transactions,
    categories,
    payments,
    budgets,
    loans,
    ledger,
    preferences: {
      hapticLevel: prefs.hapticLevel,
      notifPrefs: prefs.notifPrefs,
      hideBalance: prefs.hideBalance,
      autoBackupEnabled: prefs.autoBackupEnabled,
      autoBackupFrequency: prefs.autoBackupFrequency,
    },
  };
}

/**
 * Creates a physical JSON backup snapshot file inside the app's backup directory.
 * Auto-rotates older backups and notifies the user.
 */
export async function createLocalBackup(options: {
  notify?: boolean;
  reason?: string;
} = {}): Promise<BackupSnapshot> {
  const { notify = true, reason } = options;
  const dir = await ensureBackupDirectory();

  const data = generateFullBackupData();
  const jsonStr = JSON.stringify(data, null, 2);

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  const fileName = `wherecash_backup_${dateStr}_${timeStr}.json`;
  const fileUri = `${dir}${fileName}`;

  // Write physical file to app's sandboxed storage
  await FileSystem.writeAsStringAsync(fileUri, jsonStr, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Fetch created file metadata
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  const sizeBytes = fileInfo.exists && typeof (fileInfo as any).size === 'number' ? (fileInfo as any).size : jsonStr.length;

  // Update last backup timestamp in persistent preferences
  const isoNow = now.toISOString();
  usePreferencesStore.getState().setLastBackupTime(isoNow);

  // Prune older snapshots if more than MAX_RETAINED_SNAPSHOTS
  await pruneOldSnapshots();

  // Send notifications if requested
  if (notify) {
    const formattedSize = formatBytes(sizeBytes);
    const notifBody = `Database secured (${data.stats.totalRecords} records, ${formattedSize}). Saved to local backup.`;

    // 1. In-app persistent notification history
    try {
      useNotificationStore.getState().addNotification({
        type: 'system',
        title: 'Database Backup Completed',
        body: notifBody,
      });
    } catch {
      // Safe skip
    }

    // 2. Immediate device notification / sound
    try {
      await sendInstantNotification('WhereCash Backup Secured', notifBody);
    } catch {
      // Safe skip
    }
  }

  return {
    fileName,
    uri: fileUri,
    sizeBytes,
    sizeFormatted: formatBytes(sizeBytes),
    timestamp: isoNow,
    formattedDate: formatBackupDate(isoNow),
    recordCount: data.stats.totalRecords,
    version: data.version,
  };
}

/**
 * Lists all existing physical backup snapshot files in the internal backup directory,
 * sorted newest to oldest.
 */
export async function listLocalBackups(): Promise<BackupSnapshot[]> {
  const dir = await ensureBackupDirectory();

  try {
    const files = await FileSystem.readDirectoryAsync(dir);
    const jsonFiles = files.filter((f) => f.startsWith('wherecash_backup') && f.endsWith('.json'));

    const snapshots: BackupSnapshot[] = [];

    for (const fileName of jsonFiles) {
      const uri = `${dir}${fileName}`;
      try {
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists) continue;

        const sizeBytes = typeof (info as any).size === 'number' ? (info as any).size : 0;
        const modTime = typeof (info as any).modificationTime === 'number'
          ? new Date((info as any).modificationTime * 1000).toISOString()
          : new Date().toISOString();

        // Peek file header for record count without loading massive memory
        let recordCount = 0;
        let version = '1.0.0';
        let timestamp = modTime;

        try {
          const content = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.UTF8,
            length: 800, // Read only first 800 bytes for metadata
          });
          const matchRecords = content.match(/"totalRecords"\s*:\s*(\d+)/);
          if (matchRecords) recordCount = parseInt(matchRecords[1], 10);

          const matchTime = content.match(/"timestamp"\s*:\s*"([^"]+)"/);
          if (matchTime) timestamp = matchTime[1];

          const matchVer = content.match(/"version"\s*:\s*"([^"]+)"/);
          if (matchVer) version = matchVer[1];
        } catch {
          // Fallback to defaults
        }

        snapshots.push({
          fileName,
          uri,
          sizeBytes,
          sizeFormatted: formatBytes(sizeBytes),
          timestamp,
          formattedDate: formatBackupDate(timestamp),
          recordCount,
          version,
        });
      } catch {
        // Skip corrupted entry
      }
    }

    // Sort newest first
    snapshots.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return snapshots;
  } catch (err) {
    console.warn('[backupManager] Error listing backups:', err);
    return [];
  }
}

/**
 * Removes snapshots older than MAX_RETAINED_SNAPSHOTS.
 */
async function pruneOldSnapshots(): Promise<void> {
  try {
    const snapshots = await listLocalBackups();
    if (snapshots.length <= MAX_RETAINED_SNAPSHOTS) return;

    const toDelete = snapshots.slice(MAX_RETAINED_SNAPSHOTS);
    for (const s of toDelete) {
      await FileSystem.deleteAsync(s.uri, { idempotent: true });
    }
  } catch (err) {
    console.warn('[backupManager] Error pruning snapshots:', err);
  }
}

/**
 * Deletes a specific snapshot file from internal backup storage.
 */
export async function deleteLocalBackup(fileName: string): Promise<boolean> {
  const dir = await ensureBackupDirectory();
  const uri = `${dir}${fileName}`;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
    return true;
  } catch (err) {
    console.error('[backupManager] Failed to delete backup file:', err);
    return false;
  }
}

// ─── Restore Operations ───────────────────────────────────────────────────────

/**
 * Validates and restores data into all stores from a parsed backup object.
 */
export function restoreFromParsedPayload(payload: any): RestoreResult {
  if (!payload || typeof payload !== 'object') {
    return { success: false, restoredRecords: 0, error: 'Invalid payload: not a valid JSON object.' };
  }

  // Mandatory tables
  if (!payload.accounts || !payload.transactions || !payload.categories || !payload.payments) {
    return {
      success: false,
      restoredRecords: 0,
      error: 'Incomplete backup structure: missing accounts, transactions, or categories.',
    };
  }

  try {
    useAccountStore.setState({ accounts: payload.accounts });
    useTransactionStore.setState({ transactions: payload.transactions });
    useCategoryStore.setState({ categories: payload.categories });
    usePlannedPaymentsStore.setState({ payments: payload.payments });

    if (Array.isArray(payload.budgets)) {
      useBudgetStore.setState({ budgets: payload.budgets });
    }
    if (Array.isArray(payload.loans)) {
      useLoansStore.setState({ loans: payload.loans });
    }
    if (Array.isArray(payload.ledger)) {
      useLedgerStore.setState({ entries: payload.ledger });
    }

    if (payload.preferences && typeof payload.preferences === 'object') {
      const p = payload.preferences;
      const currentPrefs = usePreferencesStore.getState();
      usePreferencesStore.setState({
        hapticLevel: p.hapticLevel ?? currentPrefs.hapticLevel,
        notifPrefs: p.notifPrefs ?? currentPrefs.notifPrefs,
        hideBalance: p.hideBalance ?? currentPrefs.hideBalance,
        autoBackupEnabled: p.autoBackupEnabled ?? currentPrefs.autoBackupEnabled,
        autoBackupFrequency: p.autoBackupFrequency ?? currentPrefs.autoBackupFrequency,
      });
    }

    const totalRecords =
      payload.accounts.length +
      payload.transactions.length +
      payload.categories.length +
      payload.payments.length +
      (payload.budgets?.length ?? 0) +
      (payload.loans?.length ?? 0) +
      (payload.ledger?.length ?? 0);

    return {
      success: true,
      restoredRecords: totalRecords,
      timestamp: payload.timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      restoredRecords: 0,
      error: `Restore failed: ${err.message || 'database injection error'}`,
    };
  }
}

/**
 * Restores the database directly from a physical file URI.
 */
export async function restoreFromFileUri(fileUri: string): Promise<RestoreResult> {
  try {
    const content = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const parsed = JSON.parse(content);
    return restoreFromParsedPayload(parsed);
  } catch (err: any) {
    return {
      success: false,
      restoredRecords: 0,
      error: `Failed to parse backup file: ${err.message || 'invalid JSON format'}`,
    };
  }
}

/**
 * Opens native document picker for .json backup files and restores immediately.
 */
export async function restoreFromDocumentPicker(): Promise<RestoreResult> {
  try {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (res.canceled || !res.assets || res.assets.length === 0) {
      return { success: false, restoredRecords: 0, canceled: true };
    }

    const file = res.assets[0];
    return await restoreFromFileUri(file.uri);
  } catch (err: any) {
    return {
      success: false,
      restoredRecords: 0,
      error: `Picker error: ${err.message || 'could not open file'}`,
    };
  }
}

/**
 * Shares or saves an internal snapshot to external device storage.
 */
export async function shareOrExportSnapshot(snapshot: BackupSnapshot): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const content = await FileSystem.readAsStringAsync(snapshot.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const res = await saveFileToDevice({
        fileName: snapshot.fileName,
        extension: 'json',
        mimeType: 'application/json',
        content,
      });
      return res.success;
    }

    // iOS share dialog
    await Share.share({
      url: snapshot.uri,
      title: snapshot.fileName,
    });
    return true;
  } catch (err) {
    console.error('[backupManager] Failed to share backup snapshot:', err);
    return false;
  }
}
