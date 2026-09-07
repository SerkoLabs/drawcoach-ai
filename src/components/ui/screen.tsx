import type { PropsWithChildren, ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing, typeScale } from '@/theme/tokens';

type ScreenProps = PropsWithChildren<{
  title?: string;
  description?: string;
  footer?: ReactNode;
}>;

export function Screen({ title, description, children, footer }: ScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {(title || description) && (
          <View style={styles.heading}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {description ? <Text style={styles.description}>{description}</Text> : null}
          </View>
        )}
        <View style={styles.body}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.lg },
  heading: { gap: spacing.sm },
  title: { color: colors.ink, fontSize: typeScale.title, lineHeight: 31, fontWeight: '800' },
  description: { color: colors.inkMuted, fontSize: typeScale.body, lineHeight: 22 },
  body: { flex: 1, gap: spacing.md },
  footer: { paddingTop: spacing.sm },
});
