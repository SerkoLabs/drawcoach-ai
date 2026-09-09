import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type Variant = 'display' | 'title' | 'heading' | 'body' | 'bodyStrong' | 'caption' | 'overline';
type Tone = 'default' | 'secondary' | 'muted' | 'primary';

interface AppTextProps extends TextProps {
  variant?: Variant;
  tone?: Tone;
  style?: TextStyle | TextStyle[];
}

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  const toneColor: Record<Tone, string> = {
    default: theme.text,
    secondary: theme.textSecondary,
    muted: theme.textMuted,
    primary: theme.primary,
  };
  return <Text style={[styles[variant], { color: toneColor[tone] }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  display: { fontSize: 30, fontWeight: '800', lineHeight: 36, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30, letterSpacing: -0.3 },
  heading: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  overline: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
});
