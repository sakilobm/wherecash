/**
 * @file profile.tsx
 * @architecture Presentation Layer — Lean View Shell
 * @description Profile screen. Pure declarative orchestrator: reads a single contract
 *   from useProfileScreen and renders extracted components. Zero business logic,
 *   zero raw useState, zero store imports.
 * @associatedFiles src/features/profile/hooks/useProfileScreen.ts,
 *   src/components/profile/ (all components)
 */

import React from 'react';
import { View, StyleSheet, Pressable, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue, useAnimatedStyle, withDelay, withTiming, withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView } from 'react-native';
import Constants from 'expo-constants';
import { useProfileScreen } from '@features/profile/hooks/useProfileScreen';
import { ProfileHero } from '@components/profile/ProfileHero';
import { SectionCard } from '@components/profile/SectionCard';
import { SettingRow } from '@components/profile/SettingRow';
import { ProfileBottomSheet } from '@components/profile/ProfileBottomSheet';
import { CurrencySheet } from '@components/profile/CurrencySheet';
import { NotifSheet } from '@components/profile/NotifSheet';
import { SecuritySheet } from '@components/profile/SecuritySheet';
import { ExportSheet } from '@components/profile/ExportSheet';
import { HelpSheet } from '@components/profile/HelpSheet';
import { HapticSettingsSheet } from '@components/profile/HapticSettingsSheet';
import { BackupSyncSheet } from '@components/profile/BackupSyncSheet';
import { ImportSheet } from '@components/profile/ImportSheet';
import { InteractiveGuidesSheet } from '@components/profile/InteractiveGuidesSheet';
import { formatBackupDate } from '@/utils/backupManager';
import { ConfirmModal } from '@components/ConfirmModal';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { toast } from '@store/toastStore';
import { CURRENCY_SYMBOLS } from '@store/types';
import { Spacing, Radius, Layout } from '@constants/index';

function useEntrance(delay: number) {
  const opacity = useSharedValue(0);
  const ty      = useSharedValue(18);
  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 360 }));
    ty.value      = withDelay(delay, withSpring(0, { damping: 22, stiffness: 200 }));
  }, [delay]);
  return useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: ty.value }] }));
}

export default function ProfileScreen() {
  const { colors, isDark, toggle } = useTheme();
  const screen = useProfileScreen();
  const { data, sheets, confirms, preferences, handlers } = screen;

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber = Constants.expoConfig?.android?.versionCode ?? 1;

  const activeNotifs = [
    preferences.notifications.transactions,
    preferences.notifications.budgetAlerts,
    preferences.notifications.plannedPay,
    preferences.notifications.weeklyReport,
  ].filter(Boolean).length;

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: colors.background.primary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: Layout.tabBarHeight + Spacing['8'] }]}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero
          avatarId={data.user?.avatarUrl ?? undefined}
          initials={data.initials}
          fullName={data.user?.fullName ?? 'Guest'}
          email={data.user?.email ?? ''}
          memberSince={data.memberSince}
          txCount={data.txCount}
          currency={data.user?.currency ?? 'USD'}
          onEditPress={handlers.editName}
        />

        <SectionCard title="Appearance" delay={80} accentColor={colors.brand.secondary}>
          <SettingRow
            icon={isDark ? 'moon' : 'sunny-outline'}
            iconColor={isDark ? colors.brand.secondary : colors.status.warning}
            label={isDark ? 'Dark Mode' : 'Light Mode'}
            subtitle={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            isLast
            right={
              <Switch
                value={isDark}
                onValueChange={() => { Haptics.selectionAsync(); toggle(); }}
                trackColor={{ false: colors.glass.backgroundMid, true: colors.brand.primary }}
                thumbColor={colors.white}
                ios_backgroundColor={colors.glass.backgroundMid}
              />
            }
          />
        </SectionCard>

        <SectionCard title="Account" delay={160} accentColor={colors.brand.primary}>
          <SettingRow animDelay={0}   icon="wallet-outline"           iconColor={colors.brand.primary} label="Manage Accounts"   subtitle="Add, edit, or delete accounts"                         onPress={() => router.push('/accounts')} />
          <SettingRow animDelay={40}  icon="grid-outline"             iconColor={colors.status.income} label="Manage Categories" subtitle="Create & customize spending categories"                 onPress={() => router.push('/categories')} />
          <SettingRow animDelay={80}  icon="notifications-outline"    iconColor={colors.brand.accentWarm} label="Notifications"     subtitle={`${activeNotifs} of 4 enabled`} onPress={sheets.notifications.open} />
          <SettingRow animDelay={100} icon="analytics-outline"         iconColor="#38BDF8" label="Analytics & Insights" subtitle="Charts, trends & growth metrics" onPress={() => router.push('/analytics')} />
          <SettingRow animDelay={120} icon="globe-outline"            iconColor={colors.status.info} label="Currency & Region" subtitle={`${data.user?.currency ?? 'USD'} · ${CURRENCY_SYMBOLS[data.user?.currency ?? 'USD']}`} onPress={sheets.currency.open} />
          <SettingRow animDelay={160} icon="shield-checkmark-outline" iconColor={colors.status.expense} label="Security & Privacy" subtitle={preferences.security.biometric ? 'Biometrics on' : 'PIN only'} onPress={sheets.security.open} />
          <SettingRow animDelay={200} icon="phone-portrait-outline"   iconColor={colors.brand.secondary} label="Vibration & Haptics" subtitle={preferences.haptics.level === 'off' ? 'Off' : `${preferences.haptics.level.charAt(0).toUpperCase() + preferences.haptics.level.slice(1)} strength`} onPress={sheets.haptics.open} isLast />
        </SectionCard>

        <SectionCard title="Data" delay={240} accentColor={colors.status.income}>
          <SettingRow
            animDelay={0}
            icon="cloud-done-outline"
            iconColor={colors.status.income}
            label="Backup & Sync"
            subtitle={
              preferences.backup.lastTime
                ? `Last: ${formatBackupDate(preferences.backup.lastTime)}`
                : 'No backups yet'
            }
            onPress={sheets.backup.open}
            right={
              <View
                style={[
                  s.badge,
                  {
                    backgroundColor: preferences.backup.autoEnabled
                      ? colors.status.income + '18'
                      : colors.glass.backgroundMid,
                  },
                ]}
              >
                <AppText
                  variant="caption"
                  style={{
                    color: preferences.backup.autoEnabled
                      ? colors.status.income
                      : colors.text.tertiary,
                    fontSize: 10,
                    fontWeight: '700',
                  }}
                >
                  {preferences.backup.autoEnabled ? 'ON' : 'OFF'}
                </AppText>
              </View>
            }
          />
          <SettingRow animDelay={40}  icon="download-outline" iconColor={colors.brand.secondary} label="Export Data"   subtitle={`${data.txCount} transactions ready`}      onPress={sheets.export.open} />
          <SettingRow animDelay={80}  icon="cloud-upload-outline" iconColor={colors.brand.primary} label="Import Data" subtitle="Import transactions from CSV or JSON" onPress={sheets.import.open} />
          <SettingRow animDelay={120} icon="sparkles-outline" iconColor={colors.brand.secondary} label="Load Play Store Demo" subtitle="Populate mock data for screenshots" onPress={confirms.seedData.show} />
          {screen.hasSnapshot && (
            <SettingRow animDelay={140} icon="refresh-outline" iconColor={colors.status.warning} label="Undo Play Store Demo" subtitle="Restore original data state" onPress={confirms.undoData.show} />
          )}
          <SettingRow animDelay={180} icon="trash-outline"    iconColor={colors.status.expense} label="Clear All Data" subtitle="Permanently erase all app data"             onPress={confirms.clearData.show} isLast />
        </SectionCard>

        <SectionCard title="Support" delay={320} accentColor={colors.brand.accent}>
          <SettingRow animDelay={0}   icon="help-circle-outline"        iconColor={colors.brand.accent}          label="Help & Support" subtitle="FAQs and contact"    onPress={sheets.help.open} />
          <SettingRow animDelay={40}  icon="compass-outline"            iconColor={colors.brand.primary}         label="Interactive Guides" subtitle="Replay screen walkthroughs" onPress={sheets.guides.open} />
          <SettingRow animDelay={80}  icon="star-outline"               iconColor={colors.status.warning}        label="Rate WhereCash" subtitle="Share your feedback"  onPress={confirms.rate.show} />
          <SettingRow animDelay={120} icon="information-circle-outline" iconColor={colors.text.tertiary} label="About"         subtitle={`v${appVersion} · Build ${buildNumber}`}  onPress={() => toast.info(`WhereCash v${appVersion} — Built with Expo & React Native`)} isLast />
        </SectionCard>

        <Animated.View style={useEntrance(400)}>
          <Pressable
            onPress={confirms.signOut.show}
            style={({ pressed }) => [
              s.signOutBtn,
              {
                backgroundColor: colors.status.expense + '15',
                borderColor:     colors.status.expense + '30',
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Ionicons name="log-out-outline" size={18} color={colors.status.expense} />
            <AppText variant="labelLG" style={{ color: colors.status.expense }}>Sign Out</AppText>
          </Pressable>
          <AppText variant="caption" color={colors.text.tertiary} align="center" style={{ marginTop: Spacing['3'] }}>
            WhereCash v{appVersion} · Made with ♥
          </AppText>
        </Animated.View>
      </ScrollView>

      {/* ── Bottom Sheets ── */}
      <ProfileBottomSheet visible={sheets.currency.isOpen}      onClose={sheets.currency.close}      title="Currency & Region">
        <CurrencySheet current={data.user?.currency ?? 'USD'} onSelect={handlers.selectCurrency} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.notifications.isOpen} onClose={sheets.notifications.close} title="Notifications">
        <NotifSheet prefs={preferences.notifications} onChange={preferences.updateNotification} onClose={sheets.notifications.close} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.security.isOpen}      onClose={sheets.security.close}      title="Security & Privacy">
        <SecuritySheet prefs={preferences.security} onChange={preferences.updateSecurity} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.haptics.isOpen}       onClose={sheets.haptics.close}      title="Vibration & Haptics">
        <HapticSettingsSheet />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.export.isOpen}        onClose={sheets.export.close}        title="Export Data">
        <ExportSheet onExport={handlers.exportData} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.help.isOpen}          onClose={sheets.help.close}          title="Help & Support">
        <HelpSheet />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.backup.isOpen}        onClose={sheets.backup.close}        title="Backup & Sync">
        <BackupSyncSheet onClose={sheets.backup.close} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.import.isOpen}        onClose={sheets.import.close}        title="Import Data">
        <ImportSheet onClose={sheets.import.close} />
      </ProfileBottomSheet>

      <ProfileBottomSheet visible={sheets.guides.isOpen}        onClose={sheets.guides.close}        title="Interactive Guides">
        <InteractiveGuidesSheet onClose={sheets.guides.close} />
      </ProfileBottomSheet>

      {/* ── Confirm Modals ── */}
      <ConfirmModal
        visible={confirms.signOut.isVisible}
        title="Sign Out"
        message="You'll need to sign in again to access your account."
        confirmLabel="Sign Out" cancelLabel="Stay" danger icon="log-out-outline"
        onConfirm={confirms.signOut.confirm}
        onCancel={confirms.signOut.dismiss}
      />
      <ConfirmModal
        visible={confirms.clearData.isVisible}
        title="Clear All Data?"
        message="This will permanently erase all transactions, accounts, budgets, ledger entries and planned payments. This cannot be undone."
        confirmLabel="Clear Everything" cancelLabel="Cancel" danger icon="trash-outline"
        onConfirm={confirms.clearData.confirm}
        onCancel={confirms.clearData.dismiss}
      />
      <ConfirmModal
        visible={confirms.seedData.isVisible}
        title="Load Screenshot Demo?"
        message="This will populate your accounts, transactions, budgets, planned payments, loans, and ledger entries with professional mock data for screenshots. Ideal for Play Store preparation."
        confirmLabel="Load Demo Data" cancelLabel="Cancel" icon="sparkles-outline"
        onConfirm={confirms.seedData.confirm}
        onCancel={confirms.seedData.dismiss}
      />
      <ConfirmModal
        visible={confirms.undoData.isVisible}
        title="Undo Demo Data?"
        message="This will restore all your previous logs, transactions, accounts, budgets, and settings to the exact state they were in before you clicked 'Load Play Store Demo'. This cannot be undone."
        confirmLabel="Undo & Restore" cancelLabel="Cancel" danger icon="refresh-outline"
        onConfirm={confirms.undoData.confirm}
        onCancel={confirms.undoData.dismiss}
      />
      <ConfirmModal
        visible={confirms.rate.isVisible}
        title="Rate WhereCash ⭐"
        message="Enjoying the app? Your review helps us reach more people."
        confirmLabel="Rate Now" cancelLabel="Later" icon="star"
        onConfirm={confirms.rate.confirm}
        onCancel={confirms.rate.dismiss}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea:   { flex: 1 },
  scroll:     { paddingHorizontal: Spacing['5'], paddingTop: Spacing['3'], gap: Spacing['4'] },
  badge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing['2'], paddingVertical: Spacing['4'],
    borderRadius: Radius.xl, borderWidth: 1,
  },
});
