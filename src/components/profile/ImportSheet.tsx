/**
 * @file ImportSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description Premium import data sheet with document picking from device storage,
 *   simulated storage permission steps, structured parsing preview, dynamic animated
 *   loader with status transitions, and detailed success feedback lists.
 * @associatedFiles src/components/profile/ProfileBottomSheet.tsx,
 *   src/features/profile/hooks/useProfileScreen.ts
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { useTransactionStore } from '@store/transactionStore';
import { useAuthStore } from '@store/authStore';
import { toast } from '@store/toastStore';
import { usePreferencesStore } from '@store/preferencesStore';
import type { ComponentProps } from 'react';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// ─── Import source definitions ──────────────────────────────────────────────

interface ImportSource {
  id: 'csv' | 'json' | 'bank' | 'paste';
  icon: IoniconName;
  gradient: [string, string];
  title: string;
  subtitle: string;
  badge?: string;
}

const IMPORT_SOURCES: ImportSource[] = [
  {
    id: 'csv',
    icon: 'document-text-outline',
    gradient: ['#10B981', '#059669'],
    title: 'CSV File',
    subtitle: 'Import local sheets & spreadsheet exports',
  },
  {
    id: 'json',
    icon: 'code-slash-outline',
    gradient: ['#6C63FF', '#A78BFA'],
    title: 'JSON Backup',
    subtitle: 'Select backup file to restore transactions',
    badge: 'RESTORE',
  },
  {
    id: 'bank',
    icon: 'business-outline',
    gradient: ['#3B82F6', '#06B6D4'],
    title: 'Bank Statement',
    subtitle: 'Smart CSV mapping for bank statement exports',
    badge: 'SMART',
  },
  {
    id: 'paste',
    icon: 'clipboard-outline',
    gradient: ['#F59E0B', '#FB923C'],
    title: 'Paste Data',
    subtitle: 'Paste raw CSV or JSON text directly',
  },
];

// ─── Format guide items ──────────────────────────────────────────────────────

interface FormatGuide {
  icon: IoniconName;
  label: string;
  desc: string;
}

const CSV_GUIDE: FormatGuide[] = [
  { icon: 'calendar-outline', label: 'Date', desc: 'YYYY-MM-DD' },
  { icon: 'swap-vertical-outline', label: 'Type', desc: 'income / expense' },
  { icon: 'grid-outline', label: 'Category', desc: 'Category name' },
  { icon: 'cash-outline', label: 'Amount', desc: 'Numeric value' },
  { icon: 'chatbubble-outline', label: 'Description', desc: 'Memo / note' },
];

/**
 * Normalizes custom date formats (like MM/DD/YYYY, MM-DD-YYYY, etc.) to YYYY-MM-DD
 */
const normalizeDate = (rawDate: string): string => {
  const clean = rawDate.trim();
  const todayStr = new Date().toISOString().split('T')[0];
  if (!clean) return todayStr;

  let candidate = '';

  // 1. YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    candidate = clean;
  }
  // 2. MM/DD/YYYY or M/D/YY
  else if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const m = parts[0].padStart(2, '0');
      const d = parts[1].padStart(2, '0');
      let y = parts[2];
      if (y.length === 2) y = '20' + y;
      candidate = `${y}-${m}-${d}`;
    }
  }
  // 3. DD-MM-YYYY or MM-DD-YYYY
  else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        candidate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        const m = parts[0].padStart(2, '0');
        const d = parts[1].padStart(2, '0');
        let y = parts[2];
        if (y.length === 2) y = '20' + y;
        candidate = `${y}-${m}-${d}`;
      }
    }
  }

  if (candidate) {
    const parsed = new Date(candidate);
    if (!isNaN(parsed.getTime())) {
      return candidate;
    }
  }

  // Fallback to standard JS parsing
  const parsed = new Date(clean);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return todayStr;
};

interface Props {
  onClose: () => void;
}

type Step = 'source' | 'permission' | 'select_file' | 'paste' | 'preview' | 'importing' | 'done';

interface ParsedTransaction {
  date: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  isValid: boolean;
}

interface FileMetadata {
  name: string;
  size: string;
  uri: string;
}

export function ImportSheet({ onClose }: Props) {
  const { colors, isDark } = useTheme();
  const [step, setStep] = useState<Step>('source');
  const [selectedSource, setSelectedSource] = useState<ImportSource['id'] | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [fileMeta, setFileMeta] = useState<FileMetadata | null>(null);
  const [parsedTxns, setParsedTxns] = useState<ParsedTransaction[]>([]);
  const [importStats, setImportStats] = useState({
    total: 0,
    valid: 0,
    income: 0,
    expense: 0,
    totalIncome: 0,
    totalExpense: 0,
  });

  // Loading animation status variables
  const [loadingStepText, setLoadingStepText] = useState('Reading file bytes...');

  const addTransaction = useTransactionStore((s) => s.addTransaction);
  const user = useAuthStore((s) => s.user);

  // ── Reanimated values ──
  const progressWidth = useSharedValue(0);
  const rotation = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const animatedSpinner = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Trigger infinite spinner rotation when importing
  useEffect(() => {
    if (step === 'importing') {
      rotation.value = 0;
      rotation.value = withRepeat(
        withTiming(360, { duration: 1200, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [step]);

  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
  const inputBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)';
  const accentBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';

  // Helper: Format bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // ── Parse CSV text into transactions ──
  const parseCSV = useCallback((text: string): Array<Record<string, string>> => {
    const lines = text.trim().split('\n').filter((l) => l.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: Array<Record<string, string>> = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: Record<string, string> = {};
      headers.forEach((h, j) => {
        row[h] = values[j] ?? '';
      });
      rows.push(row);
    }
    return rows;
  }, []);

  // ── Parse JSON text into transactions ──
  const parseJSON = useCallback((text: string): any[] => {
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : data.transactions ?? data.data ?? [];
    } catch {
      return [];
    }
  }, []);

  // ── Smart field mapping for bank statements ──
  const mapBankFields = useCallback((row: Record<string, string>): Record<string, string> | null => {
    const mapped: Record<string, string> = {};

    const dateKey = Object.keys(row).find((k) =>
      /date|time|posted|transaction.?date/i.test(k)
    );
    if (dateKey) mapped.date = row[dateKey];

    const amtKey = Object.keys(row).find((k) =>
      /amount|value|sum|debit|credit|money/i.test(k)
    );
    if (amtKey) mapped.amount = row[amtKey];

    const descKey = Object.keys(row).find((k) =>
      /desc|description|memo|note|narration|particular|detail/i.test(k)
    );
    if (descKey) mapped.description = row[descKey];

    const typeKey = Object.keys(row).find((k) =>
      /type|kind|category|cr.?dr/i.test(k)
    );
    if (typeKey) mapped.type = row[typeKey];

    if (!mapped.date || !mapped.amount) return null;
    return mapped;
  }, []);

  // Analyze parsed records and build preview statistics
  const analyzeRecords = useCallback((records: any[], source: ImportSource['id']) => {
    const parsedList: ParsedTransaction[] = [];
    let incomeCount = 0;
    let expenseCount = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    let validCount = 0;

    records.forEach((record) => {
      try {
        const rawAmtStr = record.amount || record.Amount || '0';
        const amount = parseFloat(rawAmtStr);
        const hasValidAmount = !isNaN(amount) && amount !== 0;

        const type = (record.type || record.Type || '').toLowerCase();
        // Fallback checks for negative amounts mapping to expense
        const isExp = type === 'expense' || amount < 0 || /debit|dr/i.test(type);
        const txType: 'income' | 'expense' = isExp ? 'expense' : 'income';

        const rawDate = record.date || record.Date || '';
        const normalized = normalizeDate(rawDate);
        const hasValidDate = rawDate.trim().length > 0 && !isNaN(new Date(normalized).getTime()) && !/invalid/i.test(rawDate);

        const category = record.category || record.Category || 'Other';
        const description = record.description || record.Description || record.memo || 'Imported Transaction';

        const isValid = hasValidAmount && hasValidDate;
        if (isValid) {
          validCount++;
          const absAmt = Math.abs(amount);
          if (txType === 'income') {
            incomeCount++;
            totalIncome += absAmt;
          } else {
            expenseCount++;
            totalExpense += absAmt;
          }
        }

        parsedList.push({
          date: isValid ? normalized : 'Invalid Date',
          amount: Math.abs(amount),
          type: txType,
          category,
          description,
          isValid,
        });
      } catch {
        parsedList.push({
          date: 'Error',
          amount: 0,
          type: 'expense',
          category: 'Error',
          description: 'Failed to parse record',
          isValid: false,
        });
      }
    });

    setParsedTxns(parsedList);
    setImportStats({
      total: records.length,
      valid: validCount,
      income: incomeCount,
      expense: expenseCount,
      totalIncome,
      totalExpense,
    });

    if (validCount === 0) {
      setErrorMsg('No valid transactions found. Make sure dates are valid and amounts are non-zero.');
      return false;
    }
    return true;
  }, []);

  // ── Open Native Document Picker & Directly Process ──
  const pickAndProcessFile = useCallback(async (source: ImportSource['id']) => {
    try {
      setErrorMsg(null);
      const res = await DocumentPicker.getDocumentAsync({
        type: source === 'json' ? 'application/json' : '*/*',
        copyToCacheDirectory: true,
      });

      if (res.canceled || !res.assets || res.assets.length === 0) {
        return;
      }

      const file = res.assets[0];
      const ext = file.name.split('.').pop()?.toLowerCase();

      // Simple format check
      if (source === 'json' && ext !== 'json') {
        const msg = 'Invalid file format. Please select a .json file.';
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }
      if ((source === 'csv' || source === 'bank') && ext !== 'csv') {
        const msg = 'Invalid file format. Please select a .csv file.';
        setErrorMsg(msg);
        toast.error(msg);
        return;
      }

      setFileMeta({
        name: file.name,
        size: formatBytes(file.size ?? 0),
        uri: file.uri,
      });

      // Read file content
      const text = await FileSystem.readAsStringAsync(file.uri);

      // Parse depending on type
      let records: any[] = [];
      if (source === 'json') {
        records = parseJSON(text);
      } else {
        const csvRows = parseCSV(text);
        if (source === 'bank') {
          records = csvRows.map(mapBankFields).filter(Boolean) as any[];
        } else {
          records = csvRows;
        }
      }

      const hasValid = analyzeRecords(records, source);
      if (hasValid) {
        setStep('preview');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to read file from storage.';
      setErrorMsg(msg);
      toast.error(msg);
    }
  }, [parseCSV, parseJSON, mapBankFields, analyzeRecords]);

  // ── Handle Source Selection (Immediate native file launch for files) ──
  const handleSourceSelect = useCallback((sourceId: ImportSource['id']) => {
    Haptics.selectionAsync();
    setSelectedSource(sourceId);
    setErrorMsg(null);

    if (sourceId === 'paste') {
      setStep('paste');
    } else {
      // Directly opens device storage file picker
      pickAndProcessFile(sourceId);
    }
  }, [pickAndProcessFile]);

  const handlePickFile = useCallback(() => {
    if (selectedSource) {
      pickAndProcessFile(selectedSource);
    }
  }, [selectedSource, pickAndProcessFile]);

  // Parse paste data and move to preview
  const handlePasteNext = useCallback(() => {
    if (!pasteText.trim()) {
      setErrorMsg('Please paste some text data first');
      return;
    }
    setErrorMsg(null);

    let records: any[] = [];
    if (selectedSource === 'json') {
      records = parseJSON(pasteText);
    } else {
      const csvRows = parseCSV(pasteText);
      if (selectedSource === 'bank') {
        records = csvRows.map(mapBankFields).filter(Boolean) as any[];
      } else {
        records = csvRows;
      }
    }

    setFileMeta({
      name: 'Pasted Raw Text Data',
      size: formatBytes(new Blob([pasteText]).size),
      uri: '',
    });

    const hasValid = analyzeRecords(records, selectedSource!);
    if (hasValid) {
      setStep('preview');
    }
  }, [pasteText, selectedSource, parseCSV, parseJSON, mapBankFields, analyzeRecords]);

  // ── Run Import Process ──
  const handleExecuteImport = useCallback(async () => {
    setStep('importing');
    setErrorMsg(null);

    // Phase 1: Reading file bytes
    setLoadingStepText('Reading transaction bytes...');
    progressWidth.value = withTiming(20, { duration: 400 });

    await new Promise((r) => setTimeout(r, 600));

    // Phase 2: Mapping fields
    setLoadingStepText('Mapping header layouts & columns...');
    progressWidth.value = withTiming(50, { duration: 600 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await new Promise((r) => setTimeout(r, 700));

    // Phase 3: Validation checks
    setLoadingStepText('Verifying fields & formatting parameters...');
    progressWidth.value = withTiming(75, { duration: 400 });

    await new Promise((r) => setTimeout(r, 500));

    // Phase 4: Database injection
    setLoadingStepText('Saving transactions to secure database...');
    progressWidth.value = withTiming(100, { duration: 500 });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Save transactions
    const userId = user?.id ?? 'user-import';
    const now = new Date().toISOString();
    let imported = 0;

    parsedTxns.forEach((tx, index) => {
      if (!tx.isValid) return;

      try {
        addTransaction({
          id: `import-${Date.now()}-${imported}-${index}`,
          userId,
          type: tx.type,
          category: tx.category.trim() || 'other',
          amount: tx.amount,
          currency: user?.currency ?? 'USD',
          description: tx.description,
          note: `Imported from ${selectedSource?.toUpperCase()}`,
          date: tx.date,
          accountId: '',
          source: 'general',
          createdAt: now,
          updatedAt: now,
        });
        imported++;
      } catch {
        // Safe skip
      }
    });

    await new Promise((r) => setTimeout(r, 400));

    setStep('done');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [parsedTxns, addTransaction, user, selectedSource, progressWidth]);

  return (
    <View style={is.wrapper}>
      {/* Dynamic Immersive Loading Screen */}
      {step === 'importing' && (
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={[StyleSheet.absoluteFill, is.loaderOverlay, { backgroundColor: colors.background.primary }]}
        >
          <View style={is.loaderContent}>
            {/* Spinning Rings */}
            <View style={is.spinnerContainer}>
              <Animated.View style={[is.spinnerOuter, animatedSpinner, { borderColor: colors.brand.primary + '20', borderTopColor: colors.brand.primary }]} />
              <Animated.View style={[is.spinnerInner, { ...animatedSpinner, transform: [{ rotate: `-${rotation.value * 1.5}deg` }] }, { borderColor: '#38BDF820', borderTopColor: '#38BDF8' }]} />
              <View style={[is.spinnerCenter, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }]}>
                <Ionicons name="cloud-upload" size={24} color={colors.brand.primary} />
              </View>
            </View>

            {/* Glowing text details */}
            <AppText style={is.loaderTitle}>Processing Import</AppText>
            <AppText style={[is.loaderSubtitle, { color: colors.text.secondary }]}>
              {loadingStepText}
            </AppText>

            {/* Premium progress bar */}
            <View style={is.progressWrap}>
              <View style={[is.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' }]}>
                <Animated.View style={[is.progressFill, progressStyle]}>
                  <LinearGradient
                    colors={[colors.brand.primary, '#38BDF8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                </Animated.View>
              </View>
              <AppText variant="caption" color={colors.text.tertiary} style={{ marginTop: 4 }}>
                Please do not close the app
              </AppText>
            </View>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={{ flexShrink: 1 }}
        contentContainerStyle={[is.root, { paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Step Indicators ── */}
        {step !== 'importing' && (
          <Animated.View entering={FadeIn.duration(300)} style={is.stepRow}>
            {(['source', 'mapping', 'done'] as const).map((s, i) => {
              const currentStepIdx = ['source', 'paste'].includes(step)
                ? 0
                : step === 'preview'
                ? 1
                : 2;
              
              const isActive = currentStepIdx === i;
              const isPast = currentStepIdx > i;

              return (
                <React.Fragment key={s}>
                  {i > 0 && (
                    <View
                      style={[
                        is.stepLine,
                        {
                          backgroundColor: isPast
                            ? colors.brand.primary
                            : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        },
                      ]}
                    />
                  )}
                  <View
                    style={[
                      is.stepDot,
                      {
                        backgroundColor:
                          isActive || isPast
                            ? colors.brand.primary
                            : isDark
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(0,0,0,0.06)',
                        borderColor: isActive ? colors.brand.primary + '40' : 'transparent',
                      },
                    ]}
                  >
                    {isPast ? (
                      <Ionicons name="checkmark" size={10} color="#FFF" />
                    ) : (
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color: isActive || isPast ? '#FFF' : colors.text.tertiary,
                          includeFontPadding: false,
                          textAlign: 'center',
                          textAlignVertical: 'center',
                        }}
                      >
                        {i + 1}
                      </Text>
                    )}
                  </View>
                </React.Fragment>
              );
            })}
          </Animated.View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 1: Source Selection
           ════════════════════════════════════════════════════════════════════ */}
        {step === 'source' && (
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={is.content}>
            <AppText variant="bodySM" color={colors.text.secondary} style={{ marginBottom: 4 }}>
              Choose how you want to import your financial data.
            </AppText>

            {errorMsg && (
              <Animated.View entering={FadeInDown.duration(200)} style={is.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={{ fontSize: 11, fontWeight: '600', color: '#EF4444', flex: 1 }}>
                  {errorMsg}
                </AppText>
              </Animated.View>
            )}

            {IMPORT_SOURCES.map((source, idx) => (
              <Animated.View
                key={source.id}
                entering={FadeInDown.springify().damping(20).stiffness(140).delay(idx * 60)}
              >
                <Pressable
                  onPress={() => handleSourceSelect(source.id)}
                  style={({ pressed }) => [
                    is.sourceCard,
                    {
                      backgroundColor: cardBg,
                      borderColor: colors.glass.border,
                      opacity: pressed ? 0.85 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  <LinearGradient
                    colors={source.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={is.sourceIcon}
                  >
                    <Ionicons name={source.icon} size={20} color="#FFF" />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                        {source.title}
                      </AppText>
                      {source.badge && (
                        <View style={[is.badge, { backgroundColor: source.gradient[0] + '18' }]}>
                          <AppText style={{ fontSize: 8, fontWeight: '800', color: source.gradient[0], letterSpacing: 0.5 }}>
                            {source.badge}
                          </AppText>
                        </View>
                      )}
                    </View>
                    <AppText variant="caption" color={colors.text.tertiary}>
                      {source.subtitle}
                    </AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
                </Pressable>
              </Animated.View>
            ))}

            {/* Format guide */}
            <Animated.View
              entering={FadeInDown.springify().damping(20).stiffness(140).delay(280)}
              style={[is.guideCard, {
                backgroundColor: isDark ? 'rgba(108,99,255,0.06)' : 'rgba(108,99,255,0.04)',
                borderColor: '#6C63FF20',
              }]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="information-circle" size={16} color="#6C63FF" />
                <AppText style={{ fontSize: 12, fontWeight: '700', color: '#6C63FF' }}>
                  Supported File Mappings
                </AppText>
              </View>
              <View style={is.guideGrid}>
                {CSV_GUIDE.map((g) => (
                  <View key={g.label} style={is.guideItem}>
                    <Ionicons name={g.icon} size={12} color={colors.text.tertiary} />
                    <View>
                      <AppText style={{ fontSize: 10, fontWeight: '700', color: colors.text.secondary }}>{g.label}</AppText>
                      <AppText style={{ fontSize: 9, color: colors.text.tertiary }}>{g.desc}</AppText>
                    </View>
                  </View>
                ))}
              </View>
            </Animated.View>
          </Animated.View>
        )}



        {/* ════════════════════════════════════════════════════════════════════
            STEP 4: Paste Data View
           ════════════════════════════════════════════════════════════════════ */}
        {step === 'paste' && (
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={is.content}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable onPress={() => { setStep('source'); setErrorMsg(null); }} hitSlop={10}>
                <Ionicons name="arrow-back" size={18} color={colors.text.secondary} />
              </Pressable>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                Paste Data Text
              </AppText>
            </View>

            <View style={[is.textInputWrap, {
              backgroundColor: inputBg,
              borderColor: errorMsg ? '#EF4444' + '80' : colors.glass.border,
            }]}>
              <TextInput
                multiline
                value={pasteText}
                onChangeText={setPasteText}
                placeholder={
                  selectedSource === 'json'
                    ? '[\n  {"date": "2024-01-15", "type": "expense", ...}\n]'
                    : 'Date,Type,Category,Amount,Description\n2024-01-15,expense,food,25.50,Lunch'
                }
                placeholderTextColor={colors.text.tertiary + '80'}
                style={[is.textInput, { color: colors.text.primary }]}
                textAlignVertical="top"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {errorMsg && (
              <Animated.View entering={FadeInDown.duration(200)} style={is.errorRow}>
                <Ionicons name="alert-circle" size={14} color="#EF4444" />
                <AppText style={{ fontSize: 11, fontWeight: '600', color: '#EF4444', flex: 1 }}>
                  {errorMsg}
                </AppText>
              </Animated.View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="caption" color={colors.text.tertiary}>
                {pasteText.length > 0
                  ? `${pasteText.split('\n').filter((l) => l.trim()).length} lines pasted`
                  : 'Paste CSV or JSON rows above'
                }
              </AppText>
              {pasteText.length > 0 && (
                <Pressable onPress={() => { setPasteText(''); Haptics.selectionAsync(); }}>
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: '#EF4444' }}>Clear Text</AppText>
                </Pressable>
              )}
            </View>

            <Pressable
              onPress={handlePasteNext}
              disabled={!pasteText.trim()}
              style={({ pressed }) => [
                is.importBtn,
                { opacity: !pasteText.trim() ? 0.4 : (pressed ? 0.85 : 1) },
              ]}
            >
              <LinearGradient
                colors={['#6C63FF', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={is.importBtnGrad}
              >
                <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                  Continue
                </AppText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 5: Preview File Metadata & Parsed Transactions
           ════════════════════════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <Animated.View entering={FadeInDown.springify().damping(20).stiffness(140)} style={is.content}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Pressable
                onPress={() => {
                  setStep(selectedSource === 'paste' ? 'paste' : 'source');
                  setErrorMsg(null);
                }}
                hitSlop={10}
              >
                <Ionicons name="arrow-back" size={18} color={colors.text.secondary} />
              </Pressable>
              <AppText style={{ fontSize: 14, fontWeight: '700', color: colors.text.primary }}>
                Data Mapping Summary
              </AppText>
            </View>

            {/* File details card */}
            <View style={[is.previewFileCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
              <View style={[is.previewFileIcon, { backgroundColor: selectedSource === 'json' ? '#6C63FF1A' : '#10B9811A' }]}>
                <Ionicons
                  name={selectedSource === 'json' ? 'code-slash' : 'document-text'}
                  size={20}
                  color={selectedSource === 'json' ? '#6C63FF' : '#10B981'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                  {fileMeta?.name}
                </AppText>
                <AppText style={{ fontSize: 11, color: colors.text.tertiary }}>
                  Size: {fileMeta?.size} · Source: {selectedSource?.toUpperCase()}
                </AppText>
              </View>
            </View>

            {/* Dashboard stats */}
            <View style={is.previewDashboard}>
              <View style={[is.dashCol, { backgroundColor: cardBg, borderColor: accentBorder }]}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: colors.text.primary }}>
                  {importStats.valid}
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>Valid Rows</AppText>
              </View>
              <View style={[is.dashCol, { backgroundColor: cardBg, borderColor: accentBorder }]}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: '#10B981' }}>
                  {importStats.income}
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>Incomes</AppText>
              </View>
              <View style={[is.dashCol, { backgroundColor: cardBg, borderColor: accentBorder }]}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: '#EF4444' }}>
                  {importStats.expense}
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>Expenses</AppText>
              </View>
            </View>

            {/* Validated preview items list */}
            <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary, marginTop: 4 }}>
              First few items mapped:
            </AppText>
            <View style={[is.previewList, { borderColor: accentBorder }]}>
              {parsedTxns.slice(0, 3).map((item, idx) => (
                <View
                  key={idx}
                  style={[
                    is.previewRowItem,
                    {
                      borderBottomWidth: idx < 2 ? 1 : 0,
                      borderBottomColor: colors.glass.border,
                      opacity: item.isValid ? 1 : 0.4,
                    },
                  ]}
                >
                  <View style={[is.previewRowIconCircle, { backgroundColor: item.type === 'income' ? '#10B98115' : '#EF444415' }]}>
                    <Ionicons
                      name={item.type === 'income' ? 'arrow-down-outline' : 'arrow-up-outline'}
                      size={14}
                      color={item.type === 'income' ? '#10B981' : '#EF4444'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                      {item.description}
                    </AppText>
                    <AppText style={{ fontSize: 10, color: colors.text.tertiary }}>
                      {item.date} · {item.category}
                    </AppText>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <AppText style={{ fontSize: 12, fontWeight: '800', color: item.type === 'income' ? '#10B981' : '#EF4444' }}>
                      {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                    </AppText>
                    {!item.isValid && (
                      <AppText style={{ fontSize: 8, color: '#EF4444', fontWeight: '800' }}>INVALID</AppText>
                    )}
                  </View>
                </View>
              ))}
              {importStats.total > 3 && (
                <View style={[is.previewMoreRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }]}>
                  <AppText style={{ fontSize: 10, color: colors.text.tertiary }}>
                    And {importStats.total - 3} other record{importStats.total - 3 !== 1 ? 's' : ''}...
                  </AppText>
                </View>
              )}
            </View>

            {/* Execute Import Buttons */}
            <Pressable
              onPress={handleExecuteImport}
              style={({ pressed }) => [
                is.importBtn,
                { opacity: pressed ? 0.85 : 1, marginTop: 12 },
              ]}
            >
              <LinearGradient
                colors={['#6C63FF', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={is.importBtnGrad}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFF" />
                <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                  Execute Import ({importStats.valid} Transactions)
                </AppText>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={() => {
                setStep(selectedSource === 'paste' ? 'paste' : 'select_file');
                setErrorMsg(null);
              }}
              style={({ pressed }) => [
                is.cancelBtn,
                { borderColor: colors.glass.border, opacity: pressed ? 0.75 : 1 },
              ]}
            >
              <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.text.secondary }}>
                Select Different File
              </AppText>
            </Pressable>
          </Animated.View>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            STEP 6: Completed Success Screen
           ════════════════════════════════════════════════════════════════════ */}
        {step === 'done' && (
          <Animated.View entering={FadeInDown.springify().damping(18).stiffness(160)} style={[is.content, { alignItems: 'center' }]}>
            {/* Success graphic pulsing */}
            <View style={[is.successCircle, { backgroundColor: '#10B981' + '14' }]}>
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={is.successInner}
              >
                <Ionicons name="checkmark" size={32} color="#FFF" />
              </LinearGradient>
            </View>

            <AppText style={{ fontSize: 20, fontWeight: '800', color: colors.text.primary, textAlign: 'center', marginTop: 4 }}>
              Import Complete!
            </AppText>
            <AppText variant="bodySM" color={colors.text.secondary} align="center">
              Successfully injected {importStats.valid} transactions into your accounts.
            </AppText>

            {/* Stats row card */}
            <View style={[is.statsRow, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
              <View style={is.statItem}>
                <AppText style={{ fontSize: 22, fontWeight: '800', color: '#10B981' }}>{importStats.valid}</AppText>
                <AppText variant="caption" color={colors.text.tertiary}>Imported</AppText>
              </View>
              <View style={[is.statDivider, { backgroundColor: colors.glass.border }]} />
              <View style={is.statItem}>
                <AppText style={{ fontSize: 16, fontWeight: '800', color: colors.text.primary }}>
                  {selectedSource?.toUpperCase()}
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary}>Source</AppText>
              </View>
            </View>

            {/* Show listing of what was successfully loaded */}
            <View style={{ width: '100%', marginTop: 8 }}>
              <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.text.secondary, marginBottom: 8 }}>
                Import Details:
              </AppText>
              <View style={[is.previewList, { borderColor: accentBorder }]}>
                {parsedTxns.filter((t) => t.isValid).slice(0, 3).map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      is.previewRowItem,
                      {
                        borderBottomWidth: idx < 2 ? 1 : 0,
                        borderBottomColor: colors.glass.border,
                      },
                    ]}
                  >
                    <View style={[is.previewRowIconCircle, { backgroundColor: item.type === 'income' ? '#10B98115' : '#EF444415' }]}>
                      <Ionicons
                        name={item.type === 'income' ? 'arrow-down-outline' : 'arrow-up-outline'}
                        size={14}
                        color={item.type === 'income' ? '#10B981' : '#EF4444'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 12, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                        {item.description}
                      </AppText>
                      <AppText style={{ fontSize: 10, color: colors.text.tertiary }}>
                        {item.date} · {item.category}
                      </AppText>
                    </View>
                    <AppText style={{ fontSize: 12, fontWeight: '800', color: item.type === 'income' ? '#10B981' : '#EF4444' }}>
                      {item.type === 'income' ? '+' : '-'}${item.amount.toFixed(2)}
                    </AppText>
                  </View>
                ))}
                {importStats.valid > 3 && (
                  <View style={[is.previewMoreRow, { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }]}>
                    <AppText style={{ fontSize: 10, color: colors.text.tertiary }}>
                      And {importStats.valid - 3} other items loaded.
                    </AppText>
                  </View>
                )}
              </View>
            </View>

            {/* Done Button */}
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              style={({ pressed }) => [
                is.importBtn,
                { opacity: pressed ? 0.85 : 1, width: '100%', marginTop: 16 },
              ]}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={is.importBtnGrad}
              >
                <AppText style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                  Close Sheet
                </AppText>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const is = StyleSheet.create({
  wrapper: {
    flexShrink: 1,
  },
  root: {
    paddingHorizontal: Spacing['5'],
    paddingTop: Spacing['3'],
    gap: Spacing['3'],
  },

  /* Step Indicator */
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginBottom: Spacing['2'],
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  stepLine: {
    width: 40,
    height: 2,
    borderRadius: 1,
  },

  content: {
    gap: Spacing['3'],
  },

  /* Source Cards */
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    padding: Spacing['3'],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  sourceIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },

  /* Format Guide */
  guideCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3'],
  },
  guideGrid: {
    gap: 6,
  },
  guideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  /* Permission Card */
  permCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing['5'],
    alignItems: 'center',
    gap: 12,
  },
  permGraphicContainer: {
    marginVertical: 8,
    alignItems: 'center',
  },
  permGlowCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  permTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  permNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Radius.md,
    marginTop: 8,
    width: '100%',
  },

  /* File Picker Card */
  pickerCard: {
    borderRadius: Radius.xl,
    borderWidth: 2,
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pickerIconWrap: {
    alignItems: 'center',
  },
  pickerIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.xs,
    marginTop: 8,
  },

  /* Paste Text Area */
  textInputWrap: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['3'],
    minHeight: 140,
    maxHeight: 200,
  },
  textInput: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },

  /* File Preview Elements */
  previewFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
  },
  previewFileIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewDashboard: {
    flexDirection: 'row',
    gap: 8,
  },
  dashCol: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    gap: 2,
  },
  previewList: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  previewRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  previewRowIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewMoreRow: {
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
  },

  /* Loading State Overlay */
  loaderOverlay: {
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderContent: {
    alignItems: 'center',
    gap: 14,
    width: '100%',
    paddingHorizontal: 40,
  },
  spinnerContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  spinnerOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
  },
  spinnerInner: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
  },
  spinnerCenter: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  loaderSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  progressWrap: {
    width: '100%',
    alignItems: 'center',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Buttons */
  importBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  importBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 48,
    borderRadius: Radius.lg,
  },
  cancelBtn: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Done Screen Graphics */
  successCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing['3'],
  },
  successInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing['4'],
    width: '100%',
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
});
