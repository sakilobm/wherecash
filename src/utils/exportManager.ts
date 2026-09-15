/**
 * @file exportManager.ts
 * @architecture Utility / Infrastructure Layer — File & Data Export Engine
 * @description High-performance data serializer and native file exporter for WhereCash.
 *   Provides dual-mode export:
 *     1. Priority File Save: Writes real physical files (.csv / .json) directly to
 *        user storage (Downloads/Documents via StorageAccessFramework on Android,
 *        and documentDirectory + native document share on iOS).
 *     2. Text Share: Shares formatted raw text directly via the native share dialog.
 * @associatedFiles
 *   src/components/profile/ExportSheet.tsx,
 *   src/components/profile/BackupSyncSheet.tsx,
 *   src/features/profile/hooks/useProfile.ts
 */

import { Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { Transaction } from '@store/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExportFormat = 'CSV' | 'JSON';
export type ExportMethod = 'file' | 'text';

export interface SaveFileResult {
  success: boolean;
  canceled?: boolean;
  fileName?: string;
  error?: string;
}

// ─── Formatters ──────────────────────────────────────────────────────────────

/**
 * Escapes a field according to RFC-4180 rules:
 * Quotes the field if it contains commas, double-quotes, or newlines.
 */
function escapeCsvField(field: unknown): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC-4180 compliant CSV string from an array of transactions.
 */
export function generateTransactionsCSV(transactions: Transaction[]): string {
  const headers = ['Date', 'Type', 'Category', 'Amount', 'Currency', 'Description', 'Account ID'];
  const headerLine = headers.join(',');

  const rows = transactions.map((t) => [
    escapeCsvField(t.date),
    escapeCsvField(t.type),
    escapeCsvField(t.category),
    escapeCsvField(t.amount),
    escapeCsvField(t.currency),
    escapeCsvField(t.description),
    escapeCsvField(t.accountId ?? ''),
  ].join(','));

  return [headerLine, ...rows].join('\n');
}

/**
 * Generates formatted JSON data with 2-space indentation.
 */
export function generateJSONString(data: unknown): string {
  return JSON.stringify(data, null, 2);
}

// ─── Native File Operations ──────────────────────────────────────────────────

/**
 * Generates a timestamped default filename.
 */
export function getExportFileName(prefix: string, ext: 'csv' | 'json'): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(':', '');
  return `${prefix}_${dateStr}_${timeStr}.${ext}`;
}

/**
 * Saves a physical file directly to the user's device storage.
 * - On Android: Uses StorageAccessFramework so the user selects their preferred folder
 *   (e.g., Downloads, Documents) and the file is permanently saved there.
 * - On iOS: Writes to documentDirectory and invokes native Share with document URI so
 *   the user can "Save to Files", AirDrop, or open in apps.
 */
export async function saveFileToDevice(params: {
  fileName: string;
  extension: 'csv' | 'json';
  mimeType: string;
  content: string;
}): Promise<SaveFileResult> {
  const { fileName, extension, mimeType, content } = params;

  try {
    if (Platform.OS === 'android') {
      // 1. Request user to pick destination directory (e.g. Downloads, Documents)
      const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      
      if (!permissions.granted) {
        return { success: false, canceled: true };
      }

      // Base filename without extension (SAF handles extension via mimeType & filename)
      const baseName = fileName.replace(new RegExp(`\\.${extension}$`, 'i'), '');
      
      // 2. Create the file in the selected directory
      const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
        permissions.directoryUri,
        baseName,
        mimeType
      );

      // 3. Write data into the created SAF file
      await FileSystem.writeAsStringAsync(createdUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      return { success: true, fileName };
    }

    // iOS or other platforms:
    const targetDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
    const cleanFileName = fileName.endsWith(`.${extension}`) ? fileName : `${fileName}.${extension}`;
    const fileUri = `${targetDir}${cleanFileName}`;

    await FileSystem.writeAsStringAsync(fileUri, content, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // On iOS, Share with url prompts the native document share card with "Save to Files"
    await Share.share({
      url: fileUri,
      title: cleanFileName,
    });

    return { success: true, fileName: cleanFileName };
  } catch (error: any) {
    console.error('saveFileToDevice error:', error);
    return {
      success: false,
      error: error?.message ?? 'Failed to save file to device storage',
    };
  }
}

/**
 * Shares plain formatted text directly via the native OS share sheet.
 */
export async function shareTextContent(params: {
  title: string;
  content: string;
}): Promise<boolean> {
  try {
    await Share.share({
      title: params.title,
      message: params.content,
    });
    return true;
  } catch (error) {
    console.error('shareTextContent error:', error);
    return false;
  }
}
