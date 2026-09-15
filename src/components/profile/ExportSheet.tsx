/**
 * @file ExportSheet.tsx
 * @architecture Presentation Layer — UI Component
 * @description Premium export sheet providing dual-mode export:
 *   1. Priority Action: Save physical .csv / .json file directly to device storage.
 *   2. Secondary Action: Share formatted raw text via system share sheet.
 *   Features compact segmented format pills and clean typography.
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
      {/* ── Compact Segmented Format Selector ── */}
      <View style={[s.formatBar, { backgroundColor: cardBg, borderColor: borderCol }]}>
        <Pressable
          onPress={() => handleSelectFormat('CSV')}
          style={[
            s.formatTab,
            format === 'CSV' && [
              s.formatTabActive,
              {
                backgroundColor: isDark ? colors.brand.primary + '28' : colors.brand.primary,
                borderColor: isDark ? colors.brand.primary + '55' : 'transparent',
              },
            ],
          ]}
        >
          <Ionicons
            name="document-text-outline"
            size={14}
            color={format === 'CSV' ? (isDark ? colors.brand.secondary : colors.white) : colors.text.tertiary}
          />
          <AppText
            style={[
              s.formatLabel,
              {
                color: format === 'CSV' ? (isDark ? colors.brand.secondary : colors.white) : colors.text.tertiary,
                fontWeight: format === 'CSV' ? '700' : '500',
              },
            ]}
          >
            CSV <AppText style={[s.formatSubLabel, { color: format === 'CSV' ? (isDark ? colors.brand.secondary : colors.white + 'CC') : colors.text.tertiary }]}>· Spreadsheet</AppText>
          </AppText>
        </Pressable>

        <Pressable
          onPress={() => handleSelectFormat('JSON')}
          style={[
            s.formatTab,
            format === 'JSON' && [
              s.formatTabActive,
              {
                backgroundColor: isDark ? colors.brand.primary + '28' : colors.brand.primary,
                borderColor: isDark ? colors.brand.primary + '55' : 'transparent',
              },
            ],
          ]}
        >
          <Ionicons
            name="code-slash-outline"
            size={14}
            color={format === 'JSON' ? (isDark ? colors.brand.secondary : colors.white) : colors.text.tertiary}
          />
          <AppText
            style={[
              s.formatLabel,
              {
                color: format === 'JSON' ? (isDark ? colors.brand.secondary : colors.white) : colors.text.tertiary,
                fontWeight: format === 'JSON' ? '700' : '500',
              },
            ]}
          >
            JSON <AppText style={[s.formatSubLabel, { color: format === 'JSON' ? (isDark ? colors.brand.secondary : colors.white + 'CC') : colors.text.tertiary }]}>· Database</AppText>
          </AppText>
        </Pressable>
      </View>

      {/* ── Minimalist Metadata Chip ── */}
      <View style={[s.metaBanner, { backgroundColor: colors.brand.primary + '0C', borderColor: colors.brand.primary + '20' }]}>
        <View style={[s.metaDot, { backgroundColor: colors.brand.primary }]} />
        <AppText variant="caption" color={colors.text.secondary} style={s.metaText}>
          {txCount} records compiled · Ready as <AppText variant="caption" color={colors.brand.primary} style={{ fontWeight: '700' }}>.{format.toLowerCase()}</AppText> ({format === 'CSV' ? 'Excel & Sheets compatible' : 'Complete JSON backup'})
        </AppText>
      </View>

      {/* ── PRIORITY ACTION: Save Physical File ── */}
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
          <Ionicons name="download-outline" size={18} color="#FFF" />
        </LinearGradient>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.cardTitleRow}>
            <AppText variant="bodySM" color={colors.text.primary} style={s.cardTitle}>
              Save as .{format.toLowerCase()} File
            </AppText>
            <View style={[s.priorityBadge, { backgroundColor: colors.status.income + '18' }]}>
              <AppText style={{ color: colors.status.income, fontSize: 8.5, fontWeight: '800', letterSpacing: 0.4 }}>
                PRIORITY
              </AppText>
            </View>
          </View>
          <AppText variant="caption" color={colors.text.tertiary} style={s.cardSubtitle}>
            Select folder & save real file directly to Downloads
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.text.tertiary} />
      </Pressable>

      {/* ── SECONDARY ACTION: Share Plain Text ── */}
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
        <View style={[s.actionIcon, { backgroundColor: colors.brand.primary + '14' }]}>
          <Ionicons name="share-social-outline" size={18} color={colors.brand.primary} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodySM" color={colors.text.primary} style={[s.cardTitle, { fontWeight: '600' }]}>
            Share as Plain Text
          </AppText>
          <AppText variant="caption" color={colors.text.tertiary} style={s.cardSubtitle}>
            Copy or send formatted text directly to WhatsApp, Notes, etc.
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.text.tertiary} />
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
    height: 42,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: 3,
    gap: 3,
  },
  formatTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  formatTabActive: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  formatLabel: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  formatSubLabel: {
    fontSize: 10.5,
    fontWeight: '400',
  },
  metaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing['3'],
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  metaText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['3'] + 2,
    borderRadius: Radius.xl,
    borderWidth: 1,
    gap: Spacing['3'],
  },
  priorityCard: {
    borderWidth: 1.5,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: Radius.xs,
  },
});
