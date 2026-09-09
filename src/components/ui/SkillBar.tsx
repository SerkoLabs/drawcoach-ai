import { StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '@/components/ui/ProgressBar';
import { Spacing } from '@/constants/theme';
import { useSkillColors, useTheme } from '@/hooks/use-theme';
import { SKILL_LABELS, mediumSkillLabel, type Medium, type SkillDimension } from '@/domain/types';

interface SkillBarProps {
  dimension: SkillDimension;
  /** 0-100 or null when there is no data yet. */
  score: number | null;
  medium: Medium;
}

export function SkillBar({ dimension, score, medium }: SkillBarProps) {
  const theme = useTheme();
  const skillColors = useSkillColors();
  const label = dimension === 'medium' ? mediumSkillLabel(medium) : SKILL_LABELS[dimension];
  const color = skillColors[dimension];

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.value, { color: score == null ? theme.textMuted : color }]}>
          {score == null ? '—' : `${score}`}
        </Text>
      </View>
      <ProgressBar percent={score ?? 0} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 14, fontWeight: '600' },
  value: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
});
