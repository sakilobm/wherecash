/**
 * @file HomeQuickActions.tsx
 * @architecture Presentation Layer — Atomic Component
 * @description Highly visible, tactile quick action buttons for Home screen.
 *   Solves low affordance issues with bold icons, card elevation, soft colored drop shadows,
 *   and anti-clipping Android text labels.
 */

import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { Radius, Spacing } from '@constants/index';

export interface QuickActionItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  gradient: [string, string];
  action: () => void;
}

interface HomeQuickActionsProps {
  actions: QuickActionItem[];
}

export const HomeQuickActions = memo(function HomeQuickActions({ actions }: HomeQuickActionsProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={s.container}>
      {actions.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            item.action();
          }}
          style={({ pressed }) => [
            s.actionItem,
            {
              transform: [{ scale: pressed ? 0.93 : 1 }],
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          {/* Tactile Button Card */}
          <View
            style={[
              s.buttonCard,
              {
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.05)'
                  : '#FFFFFF',
                borderColor: isDark
                  ? item.color + '45'
                  : item.color + '35',
                shadowColor: item.color,
              },
            ]}
          >
            {/* Subtle gloss gradient overlay */}
            <LinearGradient
              colors={
                isDark
                  ? [item.color + '25', item.color + '0A']
                  : [item.color + '1F', item.color + '0A']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Icon Container */}
            <View style={[s.iconBox, { backgroundColor: item.color + '1C' }]}>
              <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
          </View>

          {/* Label with anti-clipping safety */}
          <AppText
            style={[
              s.label,
              {
                color: isDark ? colors.text.primary : '#1F2937',
              },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
});

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing['3'],
    paddingHorizontal: 2,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 7,
  },
  buttonCard: {
    width: 62,
    height: 62,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    paddingHorizontal: 2,
  },
});
