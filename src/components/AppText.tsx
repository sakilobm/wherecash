import React, { memo } from 'react';
import { Text, TextStyle, TextProps, Platform } from 'react-native';
import { Typography } from '@constants/index';
import { useTheme } from '@hooks/useTheme';

type TextVariant = keyof typeof Typography;

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: string;
  align?: TextStyle['textAlign'];
  children: React.ReactNode;
}

export const AppText = memo(function AppText({
  variant = 'bodyMD',
  color,
  align,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  return (
    <Text
      style={[
        Typography[variant],
        { color: color ?? colors.text.primary, textAlign: align },
        Platform.OS === 'android' ? { includeFontPadding: false } : null,
        style,
      ]}
      {...rest}
    >
      {children}
    </Text>
  );
});
