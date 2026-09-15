/**
 * @file BackupSyncSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description State-of-the-art Backup & Sync bottom-sheet for WhereCash.
 *   - Real local-first database backup engine with sandboxed file snapshots
 *   - Persistent auto-backup switch and frequency selectors (Daily, Weekly, On Change)
 *   - Live local snapshots repository displaying retained backups with size, timestamp & records
 *   - 1-tap Snapshot Restore, Native File Picker Restore (.json), and Manual Paste fallback
 *   - 1-tap Snapshot Share / Export to external storage
 *   - Real persistent notification tracking
 * @associatedFiles
 *   src/utils/backupManager.ts,
 *   src/store/preferencesStore.ts,
 *   src/app/(tabs)/profile.tsx
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { toast } from '@store/toastStore';

// Stores
import { useAccountStore } from '@store/accountStore';
import { useTransactionStore } from '@store/transactionStore';
import { useCategoryStore } from '@store/categoryStore';
import { useBudgetStore } from '@store/budgetStore';
import { useLoansStore } from '@store/loansStore';
import { useLedgerStore } from '@store/ledgerStore';
import { usePreferencesStore } from '@store/preferencesStore';

// Backup & Export Engine
import {
  createLocalBackup,
  listLocalBackups,
  deleteLocalBackup,
  restoreFromFileUri,
  restoreFromDocumentPicker,
  restoreFromParsedPayload,
  shareOrExportSnapshot,
  formatBackupDate,
  MAX_RETAINED_SNAPSHOTS,
  type BackupSnapshot,
} from '@/utils/backupManager';
import { saveFileToDevice, shareTextContent, getExportFileName } from '@/utils/exportManager';

interface Props {
  onClose: () => void;
}

type SyncStep = 'idle' | 'reading' | 'saving' | 'done';

const SYNC_STEPS: Record<SyncStep, { label: string; pct: number }> = {
  idle:    { label: 'Ready to Backup',                pct: 0 },
  reading: { label: 'Reading database records...',    pct: 35 },
  saving:  { label: 'Writing local snapshot file...', pct: 80 },
  done:    { label: 'Backup Secured!',                pct: 100 },
};

const STAT_COLORS = ['#6C63FF', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#38BDF8'];

const FREQUENCIES: { id: 'daily' | 'weekly' | 'on_change'; label: string }[] = [
  { id: 'daily',     label: 'Daily' },
  { id: 'weekly',    label: 'Weekly' },
  { id: 'on_change', label: 'On Change' },
];

export function BackupSyncSheet({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  // ── Persistent Preferences Store ──────────────────────────────────────────────
  const autoBackupEnabled    = usePreferencesStore((s) => s.autoBackupEnabled);
  const setAutoBackupEnabled = usePreferencesStore((s) => s.setAutoBackupEnabled);
  const autoBackupFrequency  = usePreferencesStore((s) => s.autoBackupFrequency);
  const setAutoBackupFrequency = usePreferencesStore((s) => s.setAutoBackupFrequency);
  const lastBackupTime       = usePreferencesStore((s) => s.lastBackupTime);

  // ── Local State ───────────────────────────────────────────────────────────────
  const [syncState, setSyncState] = useState<SyncStep>('idle');
  const [snapshots, setSnapshots] = useState<BackupSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [showRestoreArea, setShowRestoreArea] = useState(false);
  const [restorePayload, setRestorePayload] = useState('');
  const [activeActionFile, setActiveActionFile] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    type: 'restore' | 'delete';
    snapshot: BackupSnapshot;
  } | null>(null);
  const [isActionExecuting, setIsActionExecuting] = useState(false);

  // ── Animated Values ───────────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // ── Store record counts ───────────────────────────────────────────────────────
  const accountsCount = useAccountStore((s) => s.accounts.length);
  const txsCount      = useTransactionStore((s) => s.transactions.length);
  const catsCount     = useCategoryStore((s) => s.categories.length);
  const budgetsCount  = useBudgetStore((s) => s.budgets.length);
  const loansCount    = useLoansStore((s) => s.loans.length);
  const ledgerCount   = useLedgerStore((s) => s.entries.length);
  const totalRecords  = txsCount + accountsCount + catsCount + budgetsCount + loansCount + ledgerCount;

  const STATS = [
    { label: 'Transactions', count: txsCount,      icon: 'swap-horizontal-outline' as const },
    { label: 'Accounts',     count: accountsCount,  icon: 'wallet-outline' as const },
    { label: 'Categories',   count: catsCount,      icon: 'grid-outline' as const },
    { label: 'Budgets',      count: budgetsCount,    icon: 'pie-chart-outline' as const },
    { label: 'Loans',        count: loansCount,      icon: 'cash-outline' as const },
    { label: 'Ledgers',      count: ledgerCount,     icon: 'book-outline' as const },
  ];

  // ── Load Physical Snapshots From Storage ─────────────────────────────────────
  const refreshSnapshots = useCallback(async () => {
    setLoadingSnapshots(true);
    try {
      const list = await listLocalBackups();
      setSnapshots(list);
    } catch (err) {
      console.warn('Failed to load snapshots:', err);
    } finally {
      setLoadingSnapshots(false);
    }
  }, []);

  useEffect(() => {
    refreshSnapshots();
  }, [refreshSnapshots]);

  // ── Pulse animation on status dot ─────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  // ── Real Backup Execution ─────────────────────────────────────────────────────
  const handleBackupNow = async () => {
    if (syncState !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setSyncState('reading');
    Animated.timing(progressAnim, { toValue: 0.35, duration: 300, useNativeDriver: false }).start();

    try {
      await new Promise((r) => setTimeout(r, 450));
      setSyncState('saving');
      Animated.timing(progressAnim, { toValue: 0.8, duration: 350, useNativeDriver: false }).start();

      // Physical atomic file creation
      const snapshot = await createLocalBackup({ notify: true });

      setSyncState('done');
      Animated.timing(progressAnim, { toValue: 1, duration: 250, useNativeDriver: false }).start();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Backup created: ${snapshot.recordCount} records saved!`);

      // Refresh snapshot list
      await refreshSnapshots();

      setTimeout(() => {
        setSyncState('idle');
        progressAnim.setValue(0);
      }, 1000);
    } catch (err: any) {
      setSyncState('idle');
      progressAnim.setValue(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      toast.error(`Backup failed: ${err.message || 'Storage error'}`);
    }
  };

  // ── 1-Tap Snapshot Restore (Opens Modern Stylish Dialog) ───────────────────────
  const handleRestoreSnapshot = (snapshot: BackupSnapshot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmModal({ type: 'restore', snapshot });
  };

  // ── 1-Tap Snapshot Share / Save to External Storage ───────────────────────────
  const handleShareSnapshot = async (snapshot: BackupSnapshot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveActionFile(snapshot.fileName);
    try {
      const ok = await shareOrExportSnapshot(snapshot);
      if (ok) {
        toast.success('Backup file exported successfully!');
      }
    } catch (err: any) {
      toast.error('Failed to export snapshot');
    } finally {
      setActiveActionFile(null);
    }
  };

  // ── 1-Tap Snapshot Delete (Opens Modern Stylish Dialog) ────────────────────────
  const handleDeleteSnapshot = (snapshot: BackupSnapshot) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmModal({ type: 'delete', snapshot });
  };

  // ── Execute Confirmed Action (Modern Dialog Callback) ─────────────────────────
  const handleExecuteConfirm = async () => {
    if (!confirmModal || isActionExecuting) return;
    const { type, snapshot } = confirmModal;

    setIsActionExecuting(true);
    setActiveActionFile(snapshot.fileName);

    try {
      if (type === 'restore') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        const res = await restoreFromFileUri(snapshot.uri);
        if (res.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          toast.success(`Restored ${res.restoredRecords} records from snapshot!`);
          setConfirmModal(null);
          onClose();
        } else {
          toast.error(res.error || 'Failed to restore snapshot');
        }
      } else if (type === 'delete') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        await deleteLocalBackup(snapshot.fileName);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.info('Snapshot deleted');
        setConfirmModal(null);
        refreshSnapshots();
      }
    } catch (err: any) {
      toast.error(`Action error: ${err.message || 'unknown'}`);
    } finally {
      setIsActionExecuting(false);
      setActiveActionFile(null);
    }
  };

  // ── Pick .json File From Native Device Storage ────────────────────────────────
  const handlePickAndRestoreFile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await restoreFromDocumentPicker();
      if (res.canceled) return;

      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`Successfully restored ${res.restoredRecords} records!`);
        refreshSnapshots();
        onClose();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        toast.error(res.error || 'Failed to restore selected file.');
      }
    } catch (err: any) {
      toast.error(`Picker error: ${err.message || 'unknown'}`);
    }
  };

  // ── Restore From Pasted JSON String Fallback ──────────────────────────────────
  const handleRestoreFromText = () => {
    if (!restorePayload.trim()) {
      toast.error('Please paste a backup JSON payload first');
      return;
    }

    try {
      let clean = restorePayload.trim();
      const prefix = 'WHEREKASH_BACKUP_DATA:\n';
      if (clean.startsWith(prefix)) {
        clean = clean.slice(prefix.length);
      }
      const parsed = JSON.parse(clean);

      const res = restoreFromParsedPayload(parsed);
      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`Restored ${res.restoredRecords} records from text!`);
        setRestorePayload('');
        setShowRestoreArea(false);
        onClose();
      } else {
        toast.error(res.error || 'Invalid backup structure.');
      }
    } catch {
      toast.error('JSON parsing failed. Ensure backup text is complete.');
    }
  };

  // ── Export Full JSON To Downloads via SAF ─────────────────────────────────────
  const handleSaveToDeviceFolder = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const snapshot = await createLocalBackup({ notify: false });
      const ok = await shareOrExportSnapshot(snapshot);
      if (ok) {
        toast.success('Backup file saved to storage!');
        refreshSnapshots();
      }
    } catch {
      toast.error('Failed to export backup file.');
    }
  };

  // ── Computed Layout Colors ────────────────────────────────────────────────────
  const cardBg    = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const heroBg    = isDark ? 'rgba(108, 99, 255, 0.06)'  : 'rgba(108, 99, 255, 0.04)';
  const isSyncing = syncState !== 'idle';
  const statusDot = isSyncing ? '#F59E0B' : '#10B981';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO: SYNC & BACKUP STATUS CARD
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={[s.heroCard, { backgroundColor: heroBg, borderColor: colors.brand.primary + '22' }]}>
        <LinearGradient
          colors={['#6C63FF', '#38BDF8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={s.heroAccent}
        />

        {/* Top row: status + badge */}
        <View style={s.heroTop}>
          <View style={s.heroStatusRow}>
            <Animated.View
              style={[
                s.statusDot,
                { backgroundColor: statusDot, transform: [{ scale: isSyncing ? pulseAnim : 1 }] },
              ]}
            />
            <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
              {isSyncing ? 'Backing Up…' : 'Database Protected'}
            </AppText>
          </View>
          <View style={[s.heroBadge, { backgroundColor: statusDot + '18' }]}>
            <Ionicons name="shield-checkmark" size={10} color={statusDot} />
            <AppText style={{ color: statusDot, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>
              {isSyncing ? 'IN PROGRESS' : 'LOCAL STORAGE'}
            </AppText>
          </View>
        </View>

        {/* Metadata row */}
        <View style={s.heroMeta}>
          <View style={s.heroMetaItem}>
            <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
            <AppText variant="caption" color={colors.text.tertiary}>
              Last: {lastBackupTime ? formatBackupDate(lastBackupTime) : 'Never'}
            </AppText>
          </View>
          <View style={s.heroMetaItem}>
            <Ionicons name="server-outline" size={12} color={colors.text.tertiary} />
            <AppText variant="caption" color={colors.text.tertiary}>
              {totalRecords} Active Records
            </AppText>
          </View>
        </View>

        {/* Progress bar */}
        {isSyncing && (
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]}>
              <LinearGradient
                colors={['#6C63FF', '#38BDF8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
            <AppText style={s.progressLabel} color={colors.text.tertiary}>
              {SYNC_STEPS[syncState].label}
            </AppText>
          </View>
        )}

        {/* Primary CTA */}
        <Pressable
          onPress={handleBackupNow}
          disabled={isSyncing}
          style={({ pressed }) => [
            s.syncBtn,
            {
              backgroundColor: isSyncing ? colors.glass.backgroundMid : colors.brand.primary,
              opacity: pressed ? 0.85 : isSyncing ? 0.6 : 1,
            },
          ]}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color={colors.brand.primary} />
          ) : (
            <Ionicons name="save-outline" size={16} color={colors.white} />
          )}
          <AppText style={[s.syncBtnText, { color: isSyncing ? colors.text.secondary : colors.white }]}>
            {isSyncing ? SYNC_STEPS[syncState].label : 'Backup Database Now'}
          </AppText>
        </Pressable>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: AUTO-BACKUP TOGGLE & FREQUENCY
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={[s.toggleCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] }}>
          <View style={[s.toggleIcon, { backgroundColor: colors.brand.primary + '14' }]}>
            <Ionicons name="sync-outline" size={18} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="labelLG" color={colors.text.primary}>Automatic Backup</AppText>
              <View style={[s.activePill, { backgroundColor: autoBackupEnabled ? colors.status.income + '18' : colors.glass.backgroundMid }]}>
                <AppText style={{ fontSize: 9, fontWeight: '800', color: autoBackupEnabled ? colors.status.income : colors.text.tertiary }}>
                  {autoBackupEnabled ? 'ACTIVE' : 'PAUSED'}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={colors.text.tertiary}>
              Saves database snapshots automatically
            </AppText>
          </View>
          <Switch
            value={autoBackupEnabled}
            onValueChange={(v) => {
              Haptics.selectionAsync();
              setAutoBackupEnabled(v);
              toast.info(v ? 'Auto-backup enabled' : 'Auto-backup disabled');
            }}
            trackColor={{ false: colors.glass.backgroundMid, true: colors.brand.primary }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.glass.backgroundMid}
          />
        </View>

        {/* Frequency pills when auto-backup is active */}
        {autoBackupEnabled && (
          <View style={s.freqContainer}>
            <AppText variant="caption" color={colors.text.tertiary} style={{ marginBottom: 4 }}>
              Schedule:
            </AppText>
            <View style={s.freqRow}>
              {FREQUENCIES.map((freq) => {
                const isSelected = autoBackupFrequency === freq.id;
                return (
                  <Pressable
                    key={freq.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAutoBackupFrequency(freq.id);
                    }}
                    style={[
                      s.freqPill,
                      {
                        backgroundColor: isSelected ? colors.brand.primary : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                        borderColor: isSelected ? colors.brand.primary : colors.glass.border,
                      },
                    ]}
                  >
                    <AppText
                      style={{
                        fontSize: 11,
                        fontWeight: isSelected ? '700' : '500',
                        color: isSelected ? colors.white : colors.text.secondary,
                      }}
                    >
                      {freq.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: SAVED LOCAL SNAPSHOTS (USER FAVORITE FEATURE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 4 }}>
          <AppText variant="labelSM" color={colors.text.tertiary} style={s.sectionTitle}>
            LOCAL SNAPSHOTS (TOP {MAX_RETAINED_SNAPSHOTS})
          </AppText>
          <Pressable onPress={refreshSnapshots} hitSlop={10}>
            <Ionicons name="refresh-outline" size={13} color={colors.text.tertiary} />
          </Pressable>
        </View>

        {snapshots.length === 0 ? (
          <View style={[s.emptySnapshotsCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
            <Ionicons name="file-tray-outline" size={24} color={colors.text.tertiary} />
            <AppText variant="bodySM" color={colors.text.secondary} align="center">
              No saved snapshots found yet
            </AppText>
            <AppText variant="caption" color={colors.text.tertiary} align="center">
              Tap "Backup Database Now" above to generate your first physical snapshot.
            </AppText>
          </View>
        ) : (
          snapshots.map((snap, idx) => (
            <View
              key={snap.fileName}
              style={[
                s.snapshotCard,
                {
                  backgroundColor: cardBg,
                  borderColor: idx === 0 ? colors.brand.primary + '30' : colors.glass.border,
                },
              ]}
            >
              <View style={s.snapshotTop}>
                <View style={[s.snapIconCircle, { backgroundColor: colors.brand.primary + '15' }]}>
                  <Ionicons name="document-text-outline" size={16} color={colors.brand.primary} />
                </View>
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.text.primary }} numberOfLines={1}>
                      {snap.formattedDate}
                    </AppText>
                    {idx === 0 && (
                      <View style={[s.latestBadge, { backgroundColor: colors.status.income + '18' }]}>
                        <AppText style={{ fontSize: 8, fontWeight: '800', color: colors.status.income }}>LATEST</AppText>
                      </View>
                    )}
                  </View>
                  <AppText variant="caption" color={colors.text.tertiary}>
                    {snap.recordCount} records · {snap.sizeFormatted} · v{snap.version}
                  </AppText>
                </View>
              </View>

              {/* Quick Action Buttons */}
              <View style={[s.snapshotActionsRow, { borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Pressable
                  onPress={() => handleRestoreSnapshot(snap)}
                  disabled={activeActionFile === snap.fileName}
                  style={({ pressed }) => [s.snapBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="refresh-circle-outline" size={14} color={colors.status.income} />
                  <AppText style={{ fontSize: 11, fontWeight: '700', color: colors.status.income }}>
                    Restore
                  </AppText>
                </Pressable>

                <View style={[s.snapActionDivider, { backgroundColor: colors.glass.border }]} />

                <Pressable
                  onPress={() => handleShareSnapshot(snap)}
                  disabled={activeActionFile === snap.fileName}
                  style={({ pressed }) => [s.snapBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="share-outline" size={13} color={colors.brand.primary} />
                  <AppText style={{ fontSize: 11, fontWeight: '600', color: colors.brand.primary }}>
                    Share / Save
                  </AppText>
                </Pressable>

                <View style={[s.snapActionDivider, { backgroundColor: colors.glass.border }]} />

                <Pressable
                  onPress={() => handleDeleteSnapshot(snap)}
                  disabled={activeActionFile === snap.fileName}
                  style={({ pressed }) => [s.snapBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Ionicons name="trash-outline" size={13} color={colors.status.expense} />
                  <AppText style={{ fontSize: 11, fontWeight: '600', color: colors.status.expense }}>
                    Delete
                  </AppText>
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: DATABASE STATS GRID
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <AppText variant="labelSM" color={colors.text.tertiary} style={s.sectionTitle}>
          ACTIVE DATABASE TOTALS
        </AppText>
        <View style={s.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
              <View style={[s.statAccent, { backgroundColor: STAT_COLORS[i] }]} />
              <View style={s.statContent}>
                <View style={[s.statIconWrap, { backgroundColor: STAT_COLORS[i] + '14' }]}>
                  <Ionicons name={stat.icon} size={14} color={STAT_COLORS[i]} />
                </View>
                <AppText variant="headingMD" color={colors.text.primary} style={{ fontWeight: '800', fontSize: 17 }}>
                  {stat.count}
                </AppText>
                <AppText variant="caption" color={colors.text.tertiary} style={{ fontSize: 10 }}>
                  {stat.label}
                </AppText>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: RESTORE & EXTERNAL EXPORT
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <AppText variant="labelSM" color={colors.text.tertiary} style={s.sectionTitle}>
          EXTERNAL BACKUP & RESTORE
        </AppText>

        {/* 1. Direct File Picker Restore */}
        <Pressable
          onPress={handlePickAndRestoreFile}
          style={({ pressed }) => [
            s.actionCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.status.income + '40',
              borderWidth: 1.5,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={['#10B981', '#06B6D4']}
            style={s.actionIconCircle}
          >
            <Ionicons name="folder-open-outline" size={16} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
                Restore from .json File
              </AppText>
              <View style={[s.priorityBadge, { backgroundColor: colors.status.income + '20' }]}>
                <AppText style={{ color: colors.status.income, fontSize: 9, fontWeight: '800' }}>
                  1-TAP PICK
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={colors.text.tertiary}>
              Browse phone storage & restore any WhereCash backup
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </Pressable>

        {/* 2. Export Backup to Device Storage */}
        <Pressable
          onPress={handleSaveToDeviceFolder}
          style={({ pressed }) => [
            s.actionCard,
            {
              backgroundColor: cardBg,
              borderColor: colors.glass.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <View style={[s.actionIconCircle, { backgroundColor: colors.brand.primary + '18' }]}>
            <Ionicons name="download-outline" size={16} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="labelLG" color={colors.text.primary}>Save Copy to Downloads</AppText>
            <AppText variant="caption" color={colors.text.tertiary}>
              Save standalone copy to phone Downloads/Drive
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </Pressable>

        {/* 3. Fallback: Paste Backup Text */}
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowRestoreArea(!showRestoreArea);
          }}
          style={({ pressed }) => [
            s.actionCard,
            {
              backgroundColor: cardBg,
              borderColor: showRestoreArea ? colors.status.warning + '40' : colors.glass.border,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={['#F59E0B', '#FB923C']}
            style={s.actionIconCircle}
          >
            <Ionicons name="code-slash-outline" size={16} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="labelLG" color={colors.text.primary}>Paste Backup Text</AppText>
            <AppText variant="caption" color={colors.text.tertiary}>
              Manual JSON text paste fallback
            </AppText>
          </View>
          <Ionicons
            name={showRestoreArea ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.text.tertiary}
          />
        </Pressable>

        {/* Restore Expansion Panel */}
        {showRestoreArea && (
          <View style={[s.restorePanel, { borderColor: colors.status.warning + '30', backgroundColor: colors.status.warning + '04' }]}>
            <View style={[s.warningBanner, { backgroundColor: colors.status.warning + '12' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.status.warning} />
              <AppText style={{ fontSize: 10.5, fontWeight: '700', color: colors.status.warning, letterSpacing: 0.3, flex: 1 }}>
                THIS WILL OVERWRITE CURRENT LOCAL DATABASE
              </AppText>
            </View>

            <AppText variant="caption" color={colors.text.secondary} style={{ lineHeight: 16 }}>
              Paste your raw JSON text below. All accounts, categories, budgets and transactions will be overwritten.
            </AppText>

            <TextInput
              multiline
              numberOfLines={6}
              value={restorePayload}
              onChangeText={setRestorePayload}
              placeholder={'{\n  "version": "1.1.0",\n  "accounts": [...],\n  ...\n}'}
              placeholderTextColor={colors.text.tertiary + '60'}
              style={[
                s.restoreInput,
                {
                  color: colors.text.primary,
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)',
                  borderColor: colors.glass.border,
                },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Pressable
              onPress={handleRestoreFromText}
              style={({ pressed }) => [
                s.restoreBtn,
                {
                  backgroundColor: colors.status.warning,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="shield-checkmark" size={14} color="#FFF" />
              <AppText style={s.restoreBtnText}>Verify & Overwrite Data</AppText>
            </Pressable>
          </View>
        )}
      </View>

      {/* Bottom spacer */}
      <View style={{ height: Spacing['6'] }} />
    </ScrollView>

    {/* ═══════════════════════════════════════════════════════════════════════
        MODERN STYLISH CONFIRMATION DIALOG (RESTORE / DELETE)
       ═══════════════════════════════════════════════════════════════════════ */}
    <Modal
      visible={!!confirmModal}
      transparent
      statusBarTranslucent
      animationType="fade"
      onRequestClose={() => {
        if (!isActionExecuting) setConfirmModal(null);
      }}
    >
      <View style={s.modalOverlay}>
        {/* Dimmed Backdrop */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => {
            if (!isActionExecuting) setConfirmModal(null);
          }}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.heavy }]} />
        </Pressable>

        {/* Elevated Glass Dialog Card */}
        {confirmModal && (
          <View
            style={[
              s.modalCard,
              {
                backgroundColor: isDark ? colors.surface.sheet : colors.white,
                borderColor: confirmModal.type === 'restore'
                  ? colors.status.income + '45'
                  : colors.status.expense + '45',
                shadowColor: colors.black,
              },
            ]}
          >
            {/* Glow Halo & Icon */}
            <View
              style={[
                s.modalIconHalo,
                {
                  backgroundColor: confirmModal.type === 'restore'
                    ? colors.status.income + '18'
                    : colors.status.expense + '18',
                },
              ]}
            >
              <View
                style={[
                  s.modalIconCircle,
                  {
                    backgroundColor: confirmModal.type === 'restore'
                      ? colors.status.income + '28'
                      : colors.status.expense + '28',
                  },
                ]}
              >
                <Ionicons
                  name={confirmModal.type === 'restore' ? 'refresh' : 'trash-outline'}
                  size={26}
                  color={confirmModal.type === 'restore' ? colors.status.income : colors.status.expense}
                />
              </View>
            </View>

            {/* Title & Subtitle */}
            <AppText variant="headingSM" color={colors.text.primary} align="center" style={s.modalTitle}>
              {confirmModal.type === 'restore' ? 'Restore Local Snapshot?' : 'Delete Snapshot?'}
            </AppText>

            <AppText variant="bodySM" color={colors.text.secondary} align="center" style={s.modalSubtitle}>
              {confirmModal.type === 'restore'
                ? 'Your database will be restored to the state preserved in this snapshot file.'
                : 'Are you sure you want to permanently delete this snapshot file from local device storage?'}
            </AppText>

            {/* Snapshot Metadata Box */}
            <View
              style={[
                s.modalSnapshotInfo,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                  borderColor: colors.glass.border,
                },
              ]}
            >
              <View style={s.modalInfoRow}>
                <View style={s.modalInfoCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="calendar-outline" size={11} color={colors.text.tertiary} />
                    <AppText variant="caption" color={colors.text.tertiary}>DATE</AppText>
                  </View>
                  <AppText style={[s.modalInfoValue, { color: colors.text.primary }]} numberOfLines={1}>
                    {confirmModal.snapshot.formattedDate}
                  </AppText>
                </View>

                <View style={[s.modalInfoDivider, { backgroundColor: colors.glass.border }]} />

                <View style={s.modalInfoCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="layers-outline" size={11} color={colors.text.tertiary} />
                    <AppText variant="caption" color={colors.text.tertiary}>RECORDS</AppText>
                  </View>
                  <AppText style={[s.modalInfoValue, { color: colors.text.primary }]}>
                    {confirmModal.snapshot.recordCount} items
                  </AppText>
                </View>

                <View style={[s.modalInfoDivider, { backgroundColor: colors.glass.border }]} />

                <View style={s.modalInfoCol}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Ionicons name="server-outline" size={11} color={colors.text.tertiary} />
                    <AppText variant="caption" color={colors.text.tertiary}>SIZE</AppText>
                  </View>
                  <AppText style={[s.modalInfoValue, { color: colors.text.primary }]}>
                    {confirmModal.snapshot.sizeFormatted}
                  </AppText>
                </View>
              </View>
            </View>

            {/* Warning Banner for Restore */}
            {confirmModal.type === 'restore' && (
              <View style={[s.modalWarningBox, { backgroundColor: colors.status.warning + '14', borderColor: colors.status.warning + '32' }]}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.status.warning} />
                <AppText style={[s.modalWarningText, { color: colors.status.warning }]}>
                  Active entries created after this backup will be replaced.
                </AppText>
              </View>
            )}

            {/* Modal Buttons */}
            <View style={s.modalButtonRow}>
              <Pressable
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setConfirmModal(null);
                }}
                disabled={isActionExecuting}
                style={({ pressed }) => [
                  s.modalBtn,
                  s.modalCancelBtn,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    borderColor: colors.glass.border,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <AppText style={[s.modalBtnText, { color: colors.text.secondary }]}>
                  Cancel
                </AppText>
              </Pressable>

              <Pressable
                onPress={handleExecuteConfirm}
                disabled={isActionExecuting}
                style={({ pressed }) => [
                  s.modalBtn,
                  {
                    backgroundColor: confirmModal.type === 'restore' ? colors.status.income : colors.status.expense,
                    opacity: pressed || isActionExecuting ? 0.8 : 1,
                  },
                ]}
              >
                {isActionExecuting ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name={confirmModal.type === 'restore' ? 'refresh' : 'trash'}
                      size={15}
                      color="#FFF"
                    />
                    <AppText style={[s.modalBtnText, { color: '#FFF', fontWeight: '800' }]}>
                      {confirmModal.type === 'restore' ? 'Restore Data' : 'Delete'}
                    </AppText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  </>
);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flexShrink: 1,
    marginTop: Spacing['1'],
  },
  content: {
    paddingHorizontal: Spacing['5'],
    paddingBottom: Spacing['8'],
    gap: Spacing['4'],
  },

  /* ── Hero Card ─────────────────────────────────────────────────────────────── */
  heroCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing['4'],
    gap: Spacing['3'],
  },
  heroAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.xs,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['4'],
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  /* ── Progress Bar ──────────────────────────────────────────────────────────── */
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressLabel: {
    position: 'absolute',
    right: 0,
    top: 10,
    fontSize: 9,
  },

  /* ── Sync CTA ──────────────────────────────────────────────────────────────── */
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingVertical: Spacing['3'],
    borderRadius: Radius.lg,
    gap: Spacing['2'],
  },
  syncBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },

  /* ── Toggle Card ───────────────────────────────────────────────────────────── */
  toggleCard: {
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing['3'],
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
  },
  freqContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.12)',
    paddingTop: Spacing['3'],
  },
  freqRow: {
    flexDirection: 'row',
    gap: Spacing['2'],
  },
  freqPill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },

  /* ── Section Header ────────────────────────────────────────────────────────── */
  section: {
    gap: Spacing['2'],
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 1,
    paddingLeft: 4,
  },

  /* ── Local Snapshots ───────────────────────────────────────────────────────── */
  emptySnapshotsCard: {
    padding: Spacing['5'],
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  snapshotCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: Spacing['2'],
  },
  snapshotTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['3'],
    gap: Spacing['3'],
  },
  snapIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  latestBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
  },
  snapshotActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: Spacing['2'],
  },
  snapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  snapActionDivider: {
    width: 1,
    height: 14,
  },

  /* ── Stats Grid ────────────────────────────────────────────────────────────── */
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing['2'],
  },
  statCard: {
    width: '31%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statAccent: {
    height: 2.5,
    width: '100%',
  },
  statContent: {
    paddingVertical: Spacing['2'] + 2,
    paddingHorizontal: Spacing['2'] + 2,
    alignItems: 'center',
    gap: 3,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  /* ── Action Cards ──────────────────────────────────────────────────────────── */
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['3'] + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing['3'],
  },
  actionIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Restore Panel ─────────────────────────────────────────────────────────── */
  restorePanel: {
    padding: Spacing['4'],
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing['3'],
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.sm,
  },
  restoreInput: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    lineHeight: 16,
    height: 110,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing['3'],
    textAlignVertical: 'top',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3'],
    borderRadius: Radius.lg,
    gap: Spacing['2'],
  },
  restoreBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFF',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },

  /* ── Modern Stylish Confirmation Modal ─────────────────────────────────────── */
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['5'],
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius['2xl'],
    borderWidth: 1.5,
    padding: Spacing['6'],
    alignItems: 'center',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 20,
    gap: Spacing['3'],
  },
  modalIconHalo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['1'],
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    lineHeight: 18,
    paddingHorizontal: Spacing['2'],
    marginBottom: Spacing['1'],
  },
  modalSnapshotInfo: {
    width: '100%',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['3'],
    marginVertical: Spacing['1'],
  },
  modalInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  modalInfoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  modalInfoValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalInfoDivider: {
    width: 1,
    height: 24,
  },
  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    borderRadius: Radius.md,
    borderWidth: 1,
    width: '100%',
  },
  modalWarningText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    width: '100%',
    marginTop: Spacing['2'],
  },
  modalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3'],
    borderRadius: Radius.lg,
    gap: Spacing['2'],
  },
  modalCancelBtn: {
    borderWidth: 1,
  },
  modalBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
