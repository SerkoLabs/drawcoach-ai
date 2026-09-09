import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Slightly recessed alternate surface. */
  alt?: boolean;
  padded?: boolean;
}

export function Card({ children, onPress, style, alt, padded = true }: CardProps) {
  const theme = useTheme();
  const base: ViewStyle = {
    backgroundColor: alt ? theme.cardAlt : theme.card,
    borderColor: theme.border,
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, base, padded && styles.padded, { opacity: pressed ? 0.9 : 1 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, base, padded && styles.padded, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  padded: { padding: Spacing.lg },
});
