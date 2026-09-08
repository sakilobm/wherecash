/**
 * @file AccountActionBar.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Sleek horizontal action ribbon for the selected account:
 *   Transfer, Edit, Set Primary / Default, and Delete.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';
import type { Account } from '@store/types';

interface AccountActionBarProps {
  account: Account;
  onTransfer: () => void;
  onEdit: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}

export const AccountActionBar = memo(function AccountActionBar({
  account,
  onTransfer,
  onEdit,
  onSetDefault,
  onDelete,
}: AccountActionBarProps) {
  const { colors, isDark } = useTheme();

  const handleAction = (cb: () => void, feedback = Haptics.ImpactFeedbackStyle.Light) => {
    Haptics.impactAsync(feedback);
    cb();
  };

  const btnBg = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.04)';
  const borderCol = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  return (
    <View style={s.container}>
      {/* Transfer Action */}
      <Pressable
        onPress={() => handleAction(onTransfer, Haptics.ImpactFeedbackStyle.Medium)}
        style={({ pressed }) => [
          s.actionBtn,
          {
            backgroundColor: account.color + '18',
            borderColor: account.color + '40',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="swap-horizontal" size={16} color={account.color} />
        <AppText style={[s.btnText, { color: account.color }]} numberOfLines={1} adjustsFontSizeToFit>Transfer</AppText>
      </Pressable>

      {/* Edit Action */}
      <Pressable
        onPress={() => handleAction(onEdit)}
        style={({ pressed }) => [
          s.actionBtn,
          {
            backgroundColor: btnBg,
            borderColor: borderCol,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="pencil-outline" size={15} color={colors.text.primary} />
        <AppText style={[s.btnText, { color: colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit>Edit</AppText>
      </Pressable>

      {/* Primary / Set Default Action */}
      <Pressable
        onPress={() => !account.isDefault && handleAction(onSetDefault, Haptics.ImpactFeedbackStyle.Medium)}
        style={({ pressed }) => [
          s.actionBtn,
          {
            backgroundColor: account.isDefault ? '#F59E0B18' : btnBg,
            borderColor: account.isDefault ? '#F59E0B50' : borderCol,
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons
          name={account.isDefault ? 'star' : 'star-outline'}
          size={15}
          color={account.isDefault ? '#F59E0B' : colors.text.secondary}
        />
        <AppText
          style={[
            s.btnText,
            { color: account.isDefault ? '#F59E0B' : colors.text.secondary },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Primary
        </AppText>
      </Pressable>

      {/* Delete Action */}
      <Pressable
        onPress={() => handleAction(onDelete, Haptics.ImpactFeedbackStyle.Heavy)}
        style={({ pressed }) => [
          s.actionBtn,
          {
            backgroundColor: colors.status.expense + '12',
            borderColor: colors.status.expense + '30',
            opacity: pressed ? 0.75 : 1,
          },
        ]}
      >
        <Ionicons name="trash-outline" size={15} color={colors.status.expense} />
        <AppText
          style={[s.btnText, { color: colors.status.expense }]}
          numberOfLines={1}
        >
          Delete
        </AppText>
      </Pressable>
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
    marginVertical: Spacing['3'],
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    paddingHorizontal: 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  btnText: {
    fontSize: 11,
    fontWeight: '700',
    includeFontPadding: false,
  },
});
