import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Radius, Spacing } from '@/constants/theme';
import { useSkillColors, useTheme } from '@/hooks/use-theme';
import { SKILL_LABELS, mediumSkillLabel, type Feedback, type Medium } from '@/domain/types';

function Block({
  icon,
  title,
  body,
  color,
  tint,
}: {
  icon: string;
  title: string;
  body: string;
  color: string;
  tint: string;
}) {
  const theme = useTheme();
  if (!body) return null;
  return (
    <View style={[styles.block, { backgroundColor: tint, borderLeftColor: color }]}>
      <Text style={[styles.blockTitle, { color }]}>
        {icon} {title}
      </Text>
      <Text style={[styles.blockBody, { color: theme.text }]}>{body}</Text>
    </View>
  );
}

export function FeedbackView({ feedback, medium }: { feedback: Feedback; medium: Medium }) {
  const theme = useTheme();
  const skillColors = useSkillColors();

  return (
    <View style={styles.container}>
      <View style={styles.metRow}>
        {feedback.checkpointMet ? (
          <Pill label="Checkpoint met" tone="success" icon="✓" />
        ) : (
          <Pill label="Keep refining" tone="warning" icon="↻" />
        )}
      </View>

      <Block
        icon="✦"
        title="Strength"
        body={feedback.strength}
        color={theme.success}
        tint={theme.successSoft}
      />
      <Block
        icon="◎"
        title="Focus on this"
        body={feedback.priorityIssue}
        color={theme.warning}
        tint={theme.warningSoft}
      />
      {feedback.why ? (
        <Text style={[styles.why, { color: theme.textSecondary }]}>Why it matters: {feedback.why}</Text>
      ) : null}
      <Block
        icon="→"
        title="Try this"
        body={feedback.correction}
        color={theme.primary}
        tint={theme.primarySoft}
      />
      {feedback.microExercise ? (
        <Block
          icon="✎"
          title="Micro-exercise"
          body={feedback.microExercise}
          color={theme.text}
          tint={theme.cardAlt}
        />
      ) : null}

      {feedback.rubricScores.length > 0 ? (
        <Card alt style={styles.rubric}>
          <Text style={[styles.rubricTitle, { color: theme.textSecondary }]}>SKILL CHECK</Text>
          {feedback.rubricScores.map((rs) => {
            const label = rs.dimension === 'medium' ? mediumSkillLabel(medium) : SKILL_LABELS[rs.dimension];
            const color = skillColors[rs.dimension];
            return (
              <View key={rs.dimension} style={styles.scoreRow}>
                <View style={styles.scoreHeader}>
                  <Text style={[styles.scoreLabel, { color: theme.text }]}>{label}</Text>
                  <Text style={[styles.scoreValue, { color }]}>{rs.score}/5</Text>
                </View>
                <ProgressBar percent={(rs.score / 5) * 100} color={color} height={6} />
                {rs.note ? <Text style={[styles.scoreNote, { color: theme.textSecondary }]}>{rs.note}</Text> : null}
              </View>
            );
          })}
        </Card>
      ) : null}

      {feedback.encouragement ? (
        <Text style={[styles.encouragement, { color: theme.textSecondary }]}>{feedback.encouragement}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.md },
  metRow: { flexDirection: 'row' },
  block: {
    borderLeftWidth: 3,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: 4,
  },
  blockTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 0.3 },
  blockBody: { fontSize: 15, lineHeight: 21 },
  why: { fontSize: 13, lineHeight: 19, fontStyle: 'italic', paddingHorizontal: Spacing.xs },
  rubric: { gap: Spacing.md, marginTop: Spacing.xs },
  rubricTitle: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  scoreRow: { gap: 6 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  scoreLabel: { fontSize: 14, fontWeight: '600' },
  scoreValue: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  scoreNote: { fontSize: 12, lineHeight: 17 },
  encouragement: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: Spacing.xs },
});
