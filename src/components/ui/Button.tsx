import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  /** Leading glyph (emoji or short text). */
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'lg',
  disabled,
  loading,
  icon,
  fullWidth = true,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const palette: Record<Variant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: theme.primary, fg: theme.onPrimary },
    secondary: { bg: theme.cardAlt, fg: theme.text, border: theme.borderStrong },
    ghost: { bg: 'transparent', fg: theme.primary },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.danger },
  };
  const p = palette[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: p.bg,
          borderColor: p.border ?? 'transparent',
          borderWidth: p.border ? 1 : 0,
          opacity: isDisabled ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Text style={[styles.icon, { color: p.fg }]}>{icon}</Text> : null}
          <Text style={[styles.label, size === 'lg' ? styles.labelLg : styles.labelMd, { color: p.fg }]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: { paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg, minHeight: 40 },
  lg: { paddingVertical: Spacing.md + 2, paddingHorizontal: Spacing.xl, minHeight: 52 },
  content: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  icon: { fontSize: 16 },
  label: { fontWeight: '700', letterSpacing: 0.2 },
  labelMd: { fontSize: 15 },
  labelLg: { fontSize: 16 },
});
