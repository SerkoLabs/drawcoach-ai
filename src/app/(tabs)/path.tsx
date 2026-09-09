import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { getPath } from '@/content/paths';
import { Radius, Spacing } from '@/constants/theme';
import { lessonStatus, pathStatus } from '@/domain/progress';
import { SKILL_LABELS, mediumSkillLabel } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

export default function PathScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { profile, pathId, progress } = useApp();

  const path = getPath(pathId);
  if (!profile || !path) return null;

  const status = pathStatus(path, progress);

  return (
    <Screen>
      <AppText variant="overline" tone="primary">
        YOUR PATH
      </AppText>
      <AppText variant="display">{path.title}</AppText>
      <AppText variant="body" tone="secondary" style={styles.subtitle}>
        {path.subtitle}
      </AppText>

      <View style={styles.progressRow}>
        <ProgressBar percent={status.percent} />
        <AppText variant="caption" tone="muted" style={styles.progressLabel}>
          {status.percent}% · {status.doneLessons}/{status.totalLessons} lessons complete
        </AppText>
      </View>

      <View style={styles.lessons}>
        {path.lessons.map((lesson) => {
          const s = lessonStatus(lesson, progress);
          const done = s.completed;
          const inProgress = s.started && !done;
          return (
            <Card
              key={lesson.id}
              onPress={() => router.push({ pathname: '/lesson/[id]', params: { id: lesson.id } })}
              style={styles.lessonCard}
            >
              <View style={styles.lessonRow}>
                <View
                  style={[
                    styles.numBadge,
                    {
                      backgroundColor: done ? theme.success : inProgress ? theme.primary : theme.backgroundAlt,
                    },
                  ]}
                >
                  <AppText
                    style={[
                      styles.numText,
                      { color: done || inProgress ? theme.onPrimary : theme.textSecondary },
                    ]}
                  >
                    {done ? '✓' : lesson.number}
                  </AppText>
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading">{lesson.title}</AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={2}>
                    {lesson.objective}
                  </AppText>
                  <View style={styles.metaRow}>
                    <AppText variant="caption" tone="muted">
                      {s.done}/{s.total} checkpoints · {lesson.estMinutes} min
                    </AppText>
                  </View>
                  <View style={styles.skillPills}>
                    {lesson.primarySkills.map((d) => (
                      <Pill
                        key={d}
                        label={d === 'medium' ? mediumSkillLabel(profile.medium) : SKILL_LABELS[d]}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.statusCol}>
                  {done ? (
                    <Pill label="Done" tone="success" />
                  ) : inProgress ? (
                    <Pill label="In progress" tone="primary" />
                  ) : (
                    <AppText variant="heading" tone="muted">
                      ›
                    </AppText>
                  )}
                </View>
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  subtitle: { marginTop: Spacing.xs },
  progressRow: { marginTop: Spacing.lg, marginBottom: Spacing.xl, gap: Spacing.sm },
  progressLabel: {},
  lessons: { gap: Spacing.md },
  lessonCard: {},
  lessonRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  numBadge: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 15, fontWeight: '800' },
  metaRow: { marginTop: 6 },
  skillPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  statusCol: { alignItems: 'flex-end', justifyContent: 'center', minHeight: 34 },
});
