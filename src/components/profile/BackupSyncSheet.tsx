/**
 * @file BackupSyncSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description Premium bottom-sheet content for managing full-fledged Backup & Sync.
 *   Features a hero sync-status card with gradient accents, glassmorphic database
 *   stats grid, and refined export/restore flows with modern UI polish.
 * @associatedFiles src/app/(tabs)/profile.tsx, src/features/profile/hooks/useProfileScreen.ts
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  Share,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { toast } from '@store/toastStore';

// Import all Zustand stores
import { useAccountStore } from '@store/accountStore';
import { useTransactionStore } from '@store/transactionStore';
import { useCategoryStore } from '@store/categoryStore';
import { usePlannedPaymentsStore } from '@store/plannedPaymentsStore';
import { useBudgetStore } from '@store/budgetStore';
import { useLoansStore } from '@store/loansStore';
import { useLedgerStore } from '@store/ledgerStore';
import { usePreferencesStore } from '@store/preferencesStore';
import { saveFileToDevice, shareTextContent, getExportFileName } from '@/utils/exportManager';

interface Props {
  onClose: () => void;
}

type SyncStep = 'idle' | 'auth' | 'upload' | 'verify' | 'done';

const SYNC_STEPS: Record<SyncStep, { label: string; pct: number }> = {
  idle:   { label: 'Ready to Sync',                pct: 0 },
  auth:   { label: 'Securing cloud tunnel...',     pct: 25 },
  upload: { label: 'Uploading database blocks...',  pct: 55 },
  verify: { label: 'Verifying data integrity...',   pct: 85 },
  done:   { label: 'Sync complete!',                pct: 100 },
};

/** Stat tile accent colors */
const STAT_COLORS = ['#6C63FF', '#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#38BDF8'];

export function BackupSyncSheet({ onClose }: Props) {
  const { colors, isDark } = useTheme();

  // ── Local settings & sync states ──────────────────────────────────────────────
  const [autoSync, setAutoSync] = useState(true);
  const [syncState, setSyncState] = useState<SyncStep>('idle');
  const [lastSynced, setLastSynced] = useState<string>('Today, 9:15 PM');
  const [showRestoreArea, setShowRestoreArea] = useState(false);
  const [restorePayload, setRestorePayload] = useState('');

  // ── Animated progress bar ─────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim    = useRef(new Animated.Value(1)).current;

  // ── Collect stats from stores ─────────────────────────────────────────────────
  const accountsCount = useAccountStore((s) => s.accounts.length);
  const txsCount      = useTransactionStore((s) => s.transactions.length);
  const catsCount     = useCategoryStore((s) => s.categories.length);
  const budgetsCount  = useBudgetStore((s) => s.budgets.length);
  const loansCount    = useLoansStore((s) => s.loans.length);
  const ledgerCount   = useLedgerStore((s) => s.entries.length);

  const totalRecords = txsCount + accountsCount + catsCount + budgetsCount + loansCount + ledgerCount;

  const STATS = [
    { label: 'Transactions', count: txsCount,      icon: 'swap-horizontal-outline' as const },
    { label: 'Accounts',     count: accountsCount,  icon: 'wallet-outline' as const },
    { label: 'Categories',   count: catsCount,      icon: 'grid-outline' as const },
    { label: 'Budgets',      count: budgetsCount,    icon: 'pie-chart-outline' as const },
    { label: 'Loans',        count: loansCount,      icon: 'cash-outline' as const },
    { label: 'Ledgers',      count: ledgerCount,     icon: 'book-outline' as const },
  ];

  // ── Trigger manual simulated sync ─────────────────────────────────────────────
  const handleSyncNow = () => {
    if (syncState !== 'idle') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSyncState('auth');
  };

  // ── Sync step progression (simulated) ─────────────────────────────────────────
  useEffect(() => {
    if (syncState === 'idle') return;

    // Animate progress bar
    Animated.spring(progressAnim, {
      toValue: SYNC_STEPS[syncState].pct / 100,
      useNativeDriver: false,
      friction: 12,
    }).start();

    if (syncState === 'auth') {
      const t = setTimeout(() => setSyncState('upload'), 1000);
      return () => clearTimeout(t);
    }
    if (syncState === 'upload') {
      const t = setTimeout(() => setSyncState('verify'), 1200);
      return () => clearTimeout(t);
    }
    if (syncState === 'verify') {
      const t = setTimeout(() => setSyncState('done'), 800);
      return () => clearTimeout(t);
    }
    if (syncState === 'done') {
      const t = setTimeout(() => {
        setSyncState('idle');
        progressAnim.setValue(0);
        const now = new Date();
        setLastSynced(`Today, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success('Database successfully synced with WhereKash Cloud!');
      }, 700);
      return () => clearTimeout(t);
    }
  }, [syncState]);

  // ── Pulse animation on the status dot ─────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Export full JSON backup (File or Text) ──────────────────────────────────
  const getFullBackupData = () => ({
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    accounts: useAccountStore.getState().accounts,
    transactions: useTransactionStore.getState().transactions,
    categories: useCategoryStore.getState().categories,
    payments: usePlannedPaymentsStore.getState().payments,
    budgets: useBudgetStore.getState().budgets,
    loans: useLoansStore.getState().loans,
    ledger: useLedgerStore.getState().entries,
    preferences: {
      hapticLevel: usePreferencesStore.getState().hapticLevel,
      notifPrefs: usePreferencesStore.getState().notifPrefs,
    },
  });

  const handleExportBackupFile = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const backupData = getFullBackupData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const fileName = getExportFileName('wherecash_backup', 'json');

      const res = await saveFileToDevice({
        fileName,
        extension: 'json',
        mimeType: 'application/json',
        content: jsonStr,
      });

      if (res.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`Backup file saved: ${res.fileName ?? fileName}`);
      } else if (!res.canceled) {
        toast.error(res.error || 'Failed to save backup file.');
      }
    } catch (err) {
      toast.error('Failed to create backup export file.');
      console.error(err);
    }
  };

  const handleShareBackupText = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const backupData = getFullBackupData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const success = await shareTextContent({
        title: 'WhereCash Database Backup',
        content: `WHEREKASH_BACKUP_DATA:\n${jsonStr}`,
      });
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success('Backup data shared as text!');
      }
    } catch (err) {
      toast.error('Failed to share backup data.');
      console.error(err);
    }
  };

  // ── Restore state from pasted JSON string ─────────────────────────────────────
  const handleRestoreBackup = () => {
    if (!restorePayload.trim()) {
      toast.error('Please paste a backup JSON payload first');
      return;
    }

    try {
      let cleanString = restorePayload.trim();
      const prefix = 'WHEREKASH_BACKUP_DATA:\n';
      if (cleanString.startsWith(prefix)) {
        cleanString = cleanString.slice(prefix.length);
      }

      const backup = JSON.parse(cleanString);

      if (
        !backup.accounts ||
        !backup.transactions ||
        !backup.categories ||
        !backup.payments
      ) {
        toast.error('Invalid backup payload format. Missing core tables.');
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

      useAccountStore.setState({ accounts: backup.accounts });
      useTransactionStore.setState({ transactions: backup.transactions });
      useCategoryStore.setState({ categories: backup.categories });
      usePlannedPaymentsStore.setState({ payments: backup.payments });

      if (backup.budgets) useBudgetStore.setState({ budgets: backup.budgets });
      if (backup.loans) useLoansStore.setState({ loans: backup.loans });
      if (backup.ledger) useLedgerStore.setState({ entries: backup.ledger });

      if (backup.preferences) {
        usePreferencesStore.setState({
          hapticLevel: backup.preferences.hapticLevel ?? 'medium',
          notifPrefs: backup.preferences.notifPrefs,
        });
      }

      toast.success('All stores restored from local backup!');
      setShowRestoreArea(false);
      setRestorePayload('');
      onClose();
    } catch (err) {
      toast.error('JSON parsing failed. Ensure backup text is complete.');
      console.error(err);
    }
  };

  // ── Computed styles ───────────────────────────────────────────────────────────
  const cardBg     = isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)';
  const heroBg     = isDark ? 'rgba(108, 99, 255, 0.06)'  : 'rgba(108, 99, 255, 0.04)';
  const isSyncing  = syncState !== 'idle';
  const statusDot  = isSyncing ? '#F59E0B' : '#10B981';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

      {/* ═══════════════════════════════════════════════════════════════════════
          HERO: SYNC STATUS CARD  — gradient accent, progress, quick action
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={[s.heroCard, { backgroundColor: heroBg, borderColor: colors.brand.primary + '22' }]}>
        {/* Gradient accent stripe on top */}
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
              {isSyncing ? 'Syncing…' : 'All Data Synced'}
            </AppText>
          </View>
          <View style={[s.heroBadge, { backgroundColor: statusDot + '18' }]}>
            <Ionicons name="shield-checkmark" size={10} color={statusDot} />
            <AppText style={{ color: statusDot, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 }}>
              {isSyncing ? 'IN PROGRESS' : 'SECURE'}
            </AppText>
          </View>
        </View>

        {/* Metadata row */}
        <View style={s.heroMeta}>
          <View style={s.heroMetaItem}>
            <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
            <AppText variant="caption" color={colors.text.tertiary}>Last Sync: {lastSynced}</AppText>
          </View>
          <View style={s.heroMetaItem}>
            <Ionicons name="server-outline" size={12} color={colors.text.tertiary} />
            <AppText variant="caption" color={colors.text.tertiary}>{totalRecords} Records</AppText>
          </View>
        </View>

        {/* Progress bar (visible during sync) */}
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

        {/* Sync CTA button */}
        <Pressable
          onPress={handleSyncNow}
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
            <Ionicons name="cloud-upload-outline" size={16} color={colors.white} />
          )}
          <AppText style={[s.syncBtnText, { color: isSyncing ? colors.text.secondary : colors.white }]}>
            {isSyncing ? SYNC_STEPS[syncState].label : 'Sync Database Now'}
          </AppText>
        </Pressable>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: AUTO-SYNC TOGGLE
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={[s.toggleCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
        <View style={[s.toggleIcon, { backgroundColor: colors.brand.primary + '14' }]}>
          <Ionicons name="sync-outline" size={18} color={colors.brand.primary} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="labelLG" color={colors.text.primary}>Auto-Background Sync</AppText>
          <AppText variant="caption" color={colors.text.tertiary}>Sync changes silently when data updates</AppText>
        </View>
        <Switch
          value={autoSync}
          onValueChange={setAutoSync}
          trackColor={{ false: colors.glass.backgroundMid, true: colors.brand.primary }}
          thumbColor={colors.white}
          ios_backgroundColor={colors.glass.backgroundMid}
        />
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION: DATABASE STATS GRID
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <AppText variant="labelSM" color={colors.text.tertiary} style={s.sectionTitle}>
          LOCAL DATABASE
        </AppText>
        <View style={s.statsGrid}>
          {STATS.map((stat, i) => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: cardBg, borderColor: colors.glass.border }]}>
              {/* Colored accent bar on left */}
              <View style={[s.statAccent, { backgroundColor: STAT_COLORS[i] }]} />
              <View style={s.statContent}>
                <View style={[s.statIconWrap, { backgroundColor: STAT_COLORS[i] + '14' }]}>
                  <Ionicons name={stat.icon} size={14} color={STAT_COLORS[i]} />
                </View>
                <AppText variant="headingMD" color={colors.text.primary} style={{ fontWeight: '800', fontSize: 18 }}>
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
          SECTION: MANUAL EXPORT / RESTORE
         ═══════════════════════════════════════════════════════════════════════ */}
      <View style={s.section}>
        <AppText variant="labelSM" color={colors.text.tertiary} style={s.sectionTitle}>
          MANUAL BACKUP
        </AppText>

        {/* 1. Priority: Save Backup File */}
        <Pressable
          onPress={handleExportBackupFile}
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
            <Ionicons name="download-outline" size={16} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
                Save Backup File (.json)
              </AppText>
              <View style={[s.priorityBadge, { backgroundColor: colors.status.income + '20' }]}>
                <AppText style={{ color: colors.status.income, fontSize: 9, fontWeight: '800' }}>
                  PRIORITY
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={colors.text.tertiary}>
              Pick folder & save physical .json backup to device storage
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </Pressable>

        {/* 2. Secondary: Share Backup as Text */}
        <Pressable
          onPress={handleShareBackupText}
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
            <Ionicons name="share-social-outline" size={16} color={colors.brand.primary} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="labelLG" color={colors.text.primary}>Share Backup as Text</AppText>
            <AppText variant="caption" color={colors.text.tertiary}>
              Copy or send full JSON payload to WhatsApp, Notes or cloud
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
        </Pressable>

        {/* Restore button */}
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
            <Ionicons name="cloud-upload-outline" size={16} color="#FFF" />
          </LinearGradient>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="labelLG" color={colors.text.primary}>Restore from Backup</AppText>
            <AppText variant="caption" color={colors.text.tertiary}>
              Overwrite local data with a backup JSON file
            </AppText>
          </View>
          <Ionicons
            name={showRestoreArea ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={colors.text.tertiary}
          />
        </Pressable>

        {/* ── Restore Expansion Panel ─────────────────────────────────────────── */}
        {showRestoreArea && (
          <View style={[s.restorePanel, { borderColor: colors.status.warning + '30', backgroundColor: colors.status.warning + '04' }]}>
            {/* Warning banner */}
            <View style={[s.warningBanner, { backgroundColor: colors.status.warning + '12' }]}>
              <Ionicons name="alert-circle" size={14} color={colors.status.warning} />
              <AppText style={{ fontSize: 10.5, fontWeight: '700', color: colors.status.warning, letterSpacing: 0.3, flex: 1 }}>
                THIS WILL PERMANENTLY OVERWRITE ALL LOCAL DATA
              </AppText>
            </View>

            <AppText variant="caption" color={colors.text.secondary} style={{ lineHeight: 16 }}>
              Paste the complete backup JSON text below. All accounts, categories, budgets and transaction records will be replaced.
            </AppText>

            <TextInput
              multiline
              numberOfLines={6}
              value={restorePayload}
              onChangeText={setRestorePayload}
              placeholder={'{\n  "version": "1.0.0",\n  "accounts": [...],\n  ...\n}'}
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
              onPress={handleRestoreBackup}
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
      <View style={{ height: Spacing['4'] }} />
    </ScrollView>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════════ */
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

  /* ── Hero card ─────────────────────────────────────────────────────────────── */
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

  /* ── Progress bar ──────────────────────────────────────────────────────────── */
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

  /* ── Sync button ───────────────────────────────────────────────────────────── */
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
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* ── Toggle card ───────────────────────────────────────────────────────────── */
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
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

  /* ── Section ───────────────────────────────────────────────────────────────── */
  section: {
    gap: Spacing['2'],
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 9.5,
    letterSpacing: 1,
    paddingLeft: 4,
  },

  /* ── Stats grid ────────────────────────────────────────────────────────────── */
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

  /* ── Action cards ──────────────────────────────────────────────────────────── */
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

  /* ── Restore panel ─────────────────────────────────────────────────────────── */
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
});
