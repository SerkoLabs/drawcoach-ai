import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  /** Sticky footer (e.g. a primary action) pinned above the safe-area inset. */
  footer?: ReactNode;
  contentStyle?: ViewStyle;
  /** Respect the top safe-area inset. Off when a navigation header already does. */
  padTop?: boolean;
}

export function Screen({ children, scroll = true, footer, contentStyle, padTop = true }: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const inner = <View style={[styles.inner, contentStyle]}>{children}</View>;

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: padTop ? insets.top : 0 }]}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Spacing.xxl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.scrollContent]}>{inner}</View>
      )}

      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + Spacing.md,
            },
          ]}
        >
          <View style={styles.inner}>{footer}</View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
});
