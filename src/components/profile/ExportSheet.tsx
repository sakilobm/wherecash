/**
 * @file ExportSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description Refined export modal providing dual-mode export:
 *   1. Priority Action: Save physical .csv / .json file directly to device storage.
 *   2. Secondary Action: Share formatted raw text via system share sheet.
 *   Features interactive format selector and live dataset counter.
 * @associatedFiles
 *   src/components/profile/ProfileBottomSheet.tsx,
 *   src/features/profile/hooks/useProfileScreen.ts,
 *   src/utils/exportManager.ts
 */

import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Spacing, Radius } from '@constants/index';
import { useTransactionStore } from '@store/transactionStore';
import type { ExportFormat, ExportMethod } from '@/utils/exportManager';

interface Props {
  onExport: (fmt: ExportFormat, method: ExportMethod) => void;
}

export function ExportSheet({ onExport }: Props) {
  const { colors, isDark } = useTheme();
  const [format, setFormat] = useState<ExportFormat>('CSV');
  const txCount = useTransactionStore((s) => s.transactions.length);

  const handleSelectFormat = (fmt: ExportFormat) => {
    Haptics.selectionAsync();
    setFormat(fmt);
  };

  const handleAction = (method: ExportMethod) => {
    Haptics.impactAsync(
      method === 'file'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    );
    onExport(format, method);
  };

  const cardBg = isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.02)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.root}>
      {/* Format Selector Pills */}
      <View style={[s.formatBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Pressable
          onPress={() => handleSelectFormat('CSV')}
          style={[
            s.formatTab,
            format === 'CSV' && { backgroundColor: colors.brand.primary },
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={16}
            color={format === 'CSV' ? colors.white : colors.text.tertiary}
          />
          <AppText
            variant="labelLG"
            color={format === 'CSV' ? colors.white : colors.text.tertiary}
            style={{ fontWeight: '700' }}
          >
            CSV (Spreadsheet)
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => handleSelectFormat('JSON')}
          style={[
            s.formatTab,
            format === 'JSON' && { backgroundColor: colors.brand.primary },
          ]}
        >
          <Ionicons
            name="code-slash-outline"
            size={16}
            color={format === 'JSON' ? colors.white : colors.text.tertiary}
          />
          <AppText
            variant="labelLG"
            color={format === 'JSON' ? colors.white : colors.text.tertiary}
            style={{ fontWeight: '700' }}
          >
            JSON (Raw Data)
          </AppText>
        </Pressable>
      </View>

      {/* Dataset Summary Banner */}
      <View style={[s.metaBanner, { backgroundColor: colors.brand.primary + '10', borderColor: colors.brand.primary + '25' }]}>
        <Ionicons name="information-circle-outline" size={16} color={colors.brand.primary} />
        <AppText variant="caption" color={colors.text.secondary} style={{ flex: 1, fontWeight: '500' }}>
          {txCount} transactions compiled · Ready to export as <AppText variant="caption" color={colors.brand.primary} style={{ fontWeight: '700' }}>.{format.toLowerCase()}</AppText>
        </AppText>
      </View>

      {/* ── PRIORITY ACTION 1: Save Physical File ── */}
      <Pressable
        onPress={() => handleAction('file')}
        style={({ pressed }) => [
          s.actionCard,
          s.priorityCard,
          {
            backgroundColor: cardBg,
            borderColor: colors.status.income + '40',
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <LinearGradient
          colors={['#10B981', '#06B6D4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.actionIcon}
        >
          <Ionicons name="download-outline" size={20} color="#FFF" />
        </LinearGradient>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '700' }}>
              Save as .{format.toLowerCase()} File
            </AppText>
            <View style={[s.priorityBadge, { backgroundColor: colors.status.income + '20' }]}>
              <AppText style={{ color: colors.status.income, fontSize: 9, fontWeight: '800' }}>
                PRIORITY
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color={colors.text.tertiary}>
            Pick folder and save physical file to device storage
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </Pressable>

      {/* ── SECONDARY ACTION 2: Share Plain Text ── */}
      <Pressable
        onPress={() => handleAction('text')}
        style={({ pressed }) => [
          s.actionCard,
          {
            backgroundColor: cardBg,
            borderColor: borderCol,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <View style={[s.actionIcon, { backgroundColor: colors.brand.primary + '18' }]}>
          <Ionicons name="share-social-outline" size={20} color={colors.brand.primary} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="labelLG" color={colors.text.primary} style={{ fontWeight: '600' }}>
            Share as Plain Text
          </AppText>
          <AppText variant="caption" color={colors.text.tertiary}>
            Copy or send formatted text directly to WhatsApp, Notes, etc.
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    marginTop: Spacing['3'],
    gap: Spacing['3'],
    paddingHorizontal: Spacing['5'],
    paddingBottom: Spacing['6'],
  },
  formatBar: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  formatTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['2'] + 2,
    borderRadius: Radius.md,
  },
  metaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing['3'] + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing['3'],
  },
  priorityCard: {
    borderWidth: 1.5,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
  },
});
