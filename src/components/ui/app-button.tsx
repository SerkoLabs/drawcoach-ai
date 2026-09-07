import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, radius, spacing, typeScale } from '@/theme/tokens';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityHint?: string;
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  accessibilityHint,
  icon,
  variant = 'primary',
}: AppButtonProps) {
  const secondary = variant === 'secondary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        secondary ? styles.secondary : styles.primary,
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      {icon}
      <Text style={[styles.label, secondary ? styles.secondaryLabel : null]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.45 },
  label: { color: colors.white, fontSize: typeScale.body, fontWeight: '800' },
  secondaryLabel: { color: colors.ink },
});
