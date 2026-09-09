import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { SkillBar } from '@/components/ui/SkillBar';
import { AppText } from '@/components/ui/Text';
import { getPath } from '@/content/paths';
import { Spacing } from '@/constants/theme';
import {
  lessonStatus,
  nextCheckpoint,
  nextFocus,
  pathStatus,
  skillProfile,
} from '@/domain/progress';
import { SKILL_LABELS, mediumSkillLabel } from '@/domain/types';
import { useSkillColors, useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

export default function Today() {
  const theme = useTheme();
  const skillColors = useSkillColors();
  const router = useRouter();
  const { profile, pathId, progress } = useApp();

  const path = getPath(pathId);
  if (!profile || !path) return null;

  const status = pathStatus(path, progress);
  const next = nextCheckpoint(path, progress);
  const focus = nextFocus(path, progress);
  const skills = skillProfile(path, progress);
  const hasData = skills.some((s) => s.score != null);

  const nextLessonStatus = next ? lessonStatus(next.lesson, progress) : null;

  return (
    <Screen>
      <AppText variant="overline" tone="muted">
        {greeting()}
      </AppText>
      <AppText variant="display" style={styles.name}>
        {profile.name}
      </AppText>

      <Card style={styles.pathCard}>
        <View style={styles.pathHeader}>
          <View style={styles.flex}>
            <AppText variant="heading">{path.title}</AppText>
            <AppText variant="caption" tone="secondary">
              {status.doneCheckpoints} of {status.totalCheckpoints} checkpoints ·{' '}
              {status.doneLessons}/{status.totalLessons} lessons
            </AppText>
          </View>
          <AppText variant="title" tone="primary">
            {status.percent}%
          </AppText>
        </View>
        <View style={styles.pathBar}>
          <ProgressBar percent={status.percent} />
        </View>
      </Card>

      {next ? (
        <Card style={styles.nextCard}>
          <Pill label={`Lesson ${next.lesson.number}`} tone="primary" />
          <AppText variant="overline" tone="muted" style={styles.nextKicker}>
            NEXT UP
          </AppText>
          <AppText variant="title">{next.checkpoint.title}</AppText>
          <AppText variant="body" tone="secondary">
            {next.lesson.title} · Checkpoint {next.index + 1} of {next.lesson.checkpoints.length}
          </AppText>
          <AppText variant="body" style={styles.nextInstruction}>
            {next.checkpoint.instruction}
          </AppText>
          <Button
            label={nextLessonStatus?.started ? 'Continue this checkpoint' : 'Start checkpoint'}
            icon="→"
            onPress={() =>
              router.push({
                pathname: '/checkpoint/[lessonId]',
                params: { lessonId: next.lesson.id, cp: next.checkpoint.id },
              })
            }
          />
        </Card>
      ) : (
        <Card style={[styles.nextCard, { backgroundColor: theme.successSoft, borderColor: theme.success }]}>
          <AppText variant="title" style={{ color: theme.success }}>
            ✦ Path complete!
          </AppText>
          <AppText variant="body" tone="secondary">
            You’ve finished every checkpoint in {path.title}. Revisit any lesson to keep sharpening,
            or resubmit work to push your scores higher.
          </AppText>
          <Button label="Review your path" variant="secondary" onPress={() => router.push('/path')} />
        </Card>
      )}

      {focus ? (
        <Card alt style={styles.focusCard}>
          <View style={styles.focusRow}>
            <View
              style={[styles.focusDot, { backgroundColor: skillColors[focus.dimension] }]}
            />
            <View style={styles.flex}>
              <AppText variant="overline" tone="muted">
                RECOMMENDED FOCUS
              </AppText>
              <AppText variant="heading">
                {focus.dimension === 'medium'
                  ? mediumSkillLabel(profile.medium)
                  : SKILL_LABELS[focus.dimension]}
              </AppText>
              <AppText variant="caption" tone="secondary">
                This is your lowest recent score ({focus.score}/100). Give it extra attention on your
                next submissions.
              </AppText>
            </View>
          </View>
        </Card>
      ) : null}

      <View style={styles.skillsHeader}>
        <AppText variant="heading">Skill profile</AppText>
        {!hasData ? (
          <AppText variant="caption" tone="muted">
            Complete checkpoints to build this
          </AppText>
        ) : null}
      </View>
      <Card style={styles.skillsCard}>
        {skills.map((s) => (
          <SkillBar key={s.dimension} dimension={s.dimension} score={s.score} medium={profile.medium} />
        ))}
      </Card>
    </Screen>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 18) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  name: { marginBottom: Spacing.lg },
  pathCard: { gap: Spacing.md, marginBottom: Spacing.lg },
  pathHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  pathBar: {},
  nextCard: { gap: Spacing.sm, marginBottom: Spacing.lg },
  nextKicker: { marginTop: Spacing.xs },
  nextInstruction: { marginTop: Spacing.xs, marginBottom: Spacing.sm },
  focusCard: { marginBottom: Spacing.lg },
  focusRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  focusDot: { width: 12, height: 12, borderRadius: 6, marginTop: 2 },
  skillsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: Spacing.sm,
  },
  skillsCard: { gap: Spacing.lg },
});
