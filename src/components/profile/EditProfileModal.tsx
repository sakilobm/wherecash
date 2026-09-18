/**
 * @file EditProfileModal.tsx
 * @architecture Presentation Layer — UI Component
 * @description Modern, stylish cross-platform modal for editing display name and avatar preset.
 *   Works identically on Android and iOS with full keyboard handling, avatar selector grid,
 *   glassmorphic design system alignment, and tactile haptic feedback.
 * @associatedFiles src/constants/avatars.ts, src/app/(tabs)/profile.tsx
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { AppText } from '@components/AppText';
import { useTheme } from '@hooks/useTheme';
import { AVATAR_PRESETS, getAvatar } from '@constants/avatars';
import { Spacing, Radius } from '@constants/index';
import { toast } from '@store/toastStore';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatarId?: string;
  onSave: (name: string, avatarId: string) => void;
}

export const EditProfileModal = React.memo(function EditProfileModal({
  visible,
  onClose,
  currentName,
  currentAvatarId,
  onSave,
}: Props) {
  const { colors, isDark } = useTheme();
  const [name, setName] = useState(currentName);
  const [selectedAvatarId, setSelectedAvatarId] = useState(currentAvatarId ?? 'fox');

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setSelectedAvatarId(currentAvatarId ?? 'fox');
    }
  }, [visible, currentName, currentAvatarId]);

  const activeAvatar = getAvatar(selectedAvatarId);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      toast.error('Name cannot be empty');
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmed, selectedAvatarId);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      statusBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay.heavy }]} />
        </Pressable>

        <View
          style={[
            s.card,
            {
              backgroundColor: isDark ? colors.surface.sheet : colors.white,
              borderColor: colors.glass.borderStrong,
              shadowColor: colors.black,
            },
          ]}
        >
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.headerTitleWrap}>
              <AppText variant="headingSM" color={colors.text.primary} style={s.title}>
                Edit Profile
              </AppText>
              <AppText variant="caption" color={colors.text.tertiary}>
                Customize your name & avatar
              </AppText>
            </View>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              hitSlop={12}
              style={[s.closeBtn, { backgroundColor: colors.glass.backgroundMid }]}
            >
              <Ionicons name="close" size={16} color={colors.text.secondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
            {/* Live Avatar Preview */}
            <View style={s.previewContainer}>
              <LinearGradient
                colors={activeAvatar.gradient}
                style={s.avatarHalo}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <AppText style={s.avatarEmoji}>{activeAvatar.emoji}</AppText>
              </LinearGradient>
              <AppText variant="labelSM" color={colors.text.secondary} style={{ marginTop: 6 }}>
                Tap an avatar below to switch
              </AppText>
            </View>

            {/* Avatar Preset Grid */}
            <View style={s.grid}>
              {AVATAR_PRESETS.map((item) => {
                const isSelected = item.id === selectedAvatarId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setSelectedAvatarId(item.id);
                    }}
                    style={({ pressed }) => [
                      s.gridItem,
                      {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: isSelected ? colors.brand.primary : 'transparent',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={item.gradient}
                      style={s.gridGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <AppText style={s.gridEmoji}>{item.emoji}</AppText>
                    </LinearGradient>
                    {isSelected && (
                      <View style={[s.selectedBadge, { backgroundColor: colors.brand.primary }]}>
                        <Ionicons name="checkmark" size={10} color="#FFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Display Name Input */}
            <View style={s.inputSection}>
              <AppText variant="labelSM" color={colors.text.secondary} style={{ marginBottom: 6, fontWeight: '700' }}>
                DISPLAY NAME
              </AppText>
              <View
                style={[
                  s.inputBox,
                  {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                    borderColor: colors.glass.border,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={colors.text.tertiary} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.text.tertiary}
                  maxLength={30}
                  style={[s.input, { color: colors.text.primary }]}
                  returnKeyType="done"
                  onSubmitEditing={handleSave}
                />
                {name.length > 0 && (
                  <Pressable onPress={() => setName('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={16} color={colors.text.tertiary} />
                  </Pressable>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={s.actionRow}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                s.btn,
                s.cancelBtn,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                  borderColor: colors.glass.border,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}
            >
              <AppText style={[s.btnText, { color: colors.text.secondary }]}>
                Cancel
              </AppText>
            </Pressable>

            <Pressable
              onPress={handleSave}
              style={({ pressed }) => [
                s.btn,
                {
                  backgroundColor: colors.brand.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons name="checkmark-circle-outline" size={16} color="#FFF" />
              <AppText style={[s.btnText, { color: '#FFF', fontWeight: '700' }]}>
                Save Profile
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing['5'],
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '86%',
    borderRadius: Radius['2xl'],
    borderWidth: 1.5,
    padding: Spacing['5'],
    elevation: 20,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing['3'],
  },
  headerTitleWrap: {
    gap: 2,
  },
  title: {
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    gap: Spacing['4'],
    paddingBottom: Spacing['2'],
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing['1'],
  },
  avatarHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarEmoji: {
    fontSize: 38,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  gridItem: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  gridGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridEmoji: {
    fontSize: 22,
  },
  selectedBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    marginTop: Spacing['1'],
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing['3'] + 2,
    height: 48,
    gap: Spacing['2'],
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing['3'],
    marginTop: Spacing['4'],
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing['3'],
    borderRadius: Radius.lg,
    gap: Spacing['2'],
  },
  cancelBtn: {
    borderWidth: 1,
  },
  btnText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
