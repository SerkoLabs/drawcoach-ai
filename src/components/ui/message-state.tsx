import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typeScale } from '@/theme/tokens';

type MessageStateProps = {
  title: string;
  body: string;
  tone?: 'neutral' | 'warning' | 'danger';
};

export function MessageState({ title, body, tone = 'neutral' }: MessageStateProps) {
  const toneStyle = tone === 'danger' ? styles.danger : tone === 'warning' ? styles.warning : styles.neutral;
  const textStyle = tone === 'danger' ? styles.dangerText : tone === 'warning' ? styles.warningText : styles.neutralText;

  return (
    <View accessibilityRole="alert" style={[styles.base, toneStyle]}>
      <Text style={[styles.title, textStyle]}>{title}</Text>
      <Text style={[styles.body, textStyle]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  neutral: { backgroundColor: colors.surfaceMuted },
  warning: { backgroundColor: colors.warningSurface },
  danger: { backgroundColor: colors.dangerSurface },
  title: { fontSize: typeScale.body, fontWeight: '800' },
  body: { fontSize: typeScale.body, lineHeight: 21 },
  neutralText: { color: colors.ink },
  warningText: { color: colors.warningInk },
  dangerText: { color: colors.dangerInk },
});
