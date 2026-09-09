import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { findLessonById } from '@/content/paths';
import { Radius, Spacing } from '@/constants/theme';
import { checkpointProgress, latestAttempt, lessonStatus } from '@/domain/progress';
import { SKILL_LABELS, mediumSkillLabel } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

export default function LessonDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, progress } = useApp();

  const found = findLessonById(id);
  if (!found || !profile) {
    return (
      <Screen>
        <AppText variant="title">Lesson not found</AppText>
      </Screen>
    );
  }
  const { lesson } = found;
  const status = lessonStatus(lesson, progress);

  const firstIncomplete = lesson.checkpoints.find(
    (cp) => !checkpointProgress(progress, lesson.id, cp.id)?.completed,
  );
  const target = firstIncomplete ?? lesson.checkpoints[0];

  function openCheckpoint(checkpointId: string) {
    router.push({
      pathname: '/checkpoint/[lessonId]',
      params: { lessonId: lesson.id, cp: checkpointId },
    });
  }

  return (
    <>
      <Stack.Screen options={{ title: `Lesson ${lesson.number}` }} />
      <Screen
        footer={
          <Button
            label={
              status.completed
                ? 'Revisit lesson'
                : status.started
                  ? 'Continue lesson'
                  : 'Start lesson'
            }
            icon="→"
            onPress={() => openCheckpoint(target.id)}
          />
        }
      >
        <AppText variant="overline" tone="primary">
          LESSON {lesson.number}
        </AppText>
        <AppText variant="display">{lesson.title}</AppText>
        <AppText variant="body" tone="secondary" style={styles.objective}>
          {lesson.objective}
        </AppText>

        <View style={styles.pills}>
          <Pill label={`${lesson.estMinutes} min`} />
          <Pill label={`${status.done}/${status.total} checkpoints`} tone={status.completed ? 'success' : 'neutral'} />
          {lesson.primarySkills.map((d) => (
            <Pill key={d} label={d === 'medium' ? mediumSkillLabel(profile.medium) : SKILL_LABELS[d]} tone="primary" />
          ))}
        </View>

        <Card alt style={styles.overviewCard}>
          <AppText variant="body">{lesson.overview}</AppText>
        </Card>

        <AppText variant="heading" style={styles.cpHeader}>
          Checkpoints
        </AppText>
        <View style={styles.checkpoints}>
          {lesson.checkpoints.map((cp, i) => {
            const p = checkpointProgress(progress, lesson.id, cp.id);
            const done = !!p?.completed;
            const last = latestAttempt(p);
            const started = !!last;
            return (
              <Card key={cp.id} onPress={() => openCheckpoint(cp.id)} style={styles.cpCard}>
                <View style={styles.cpRow}>
                  <View
                    style={[
                      styles.cpNum,
                      { backgroundColor: done ? theme.success : started ? theme.primary : theme.backgroundAlt },
                    ]}
                  >
                    <AppText style={[styles.cpNumText, { color: done || started ? theme.onPrimary : theme.textSecondary }]}>
                      {done ? '✓' : i + 1}
                    </AppText>
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="bodyStrong">{cp.title}</AppText>
                    <AppText variant="caption" tone="secondary" numberOfLines={2}>
                      {cp.instruction}
                    </AppText>
                    {started && last?.feedback ? (
                      <View style={styles.cpStatus}>
                        {done ? (
                          <Pill label="Met" tone="success" icon="✓" />
                        ) : (
                          <Pill label={`${last.feedback.rubricScores.length ? 'Feedback ready' : 'In progress'}`} tone="warning" />
                        )}
                      </View>
                    ) : null}
                  </View>
                  <AppText variant="heading" tone="muted">
                    ›
                  </AppText>
                </View>
              </Card>
            );
          })}
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  objective: { marginTop: Spacing.xs },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.md },
  overviewCard: { marginTop: Spacing.lg },
  cpHeader: { marginTop: Spacing.xl, marginBottom: Spacing.sm },
  checkpoints: { gap: Spacing.md },
  cpCard: {},
  cpRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center' },
  cpNum: {
    width: 30,
    height: 30,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cpNumText: { fontSize: 14, fontWeight: '800' },
  cpStatus: { flexDirection: 'row', marginTop: 6 },
});
