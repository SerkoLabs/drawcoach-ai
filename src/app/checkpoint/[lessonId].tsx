import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FeedbackView } from '@/components/ui/FeedbackView';
import { Pill } from '@/components/ui/Pill';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { findLessonById } from '@/content/paths';
import { Radius, Spacing } from '@/constants/theme';
import { checkpointProgress, latestAttempt, nextCheckpoint } from '@/domain/progress';
import type { Attempt } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';
import { requestCritique } from '@/services/critique';
import { useApp } from '@/store/AppStore';
import { CaptureError, pickArtwork, prepareForCritique, type PickSource } from '@/store/capture';
import { persistArtwork, uid } from '@/store/media';

export default function CheckpointScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { lessonId, cp } = useLocalSearchParams<{ lessonId: string; cp?: string }>();
  const { profile, progress, recordAttempt, setCheckpointComplete } = useApp();

  const found = findLessonById(lessonId);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stored = found ? checkpointProgress(progress, found.lesson.id, resolveCpId(found, cp)) : undefined;
  const attempts = stored?.attempts ?? [];
  const latest = latestAttempt(stored);
  const completed = !!stored?.completed;

  const checkpoint = useMemo(() => {
    if (!found) return null;
    const id = resolveCpId(found, cp);
    return found.lesson.checkpoints.find((c) => c.id === id) ?? found.lesson.checkpoints[0];
  }, [found, cp]);

  if (!found || !checkpoint || !profile) {
    return (
      <Screen>
        <AppText variant="title">Checkpoint not found</AppText>
      </Screen>
    );
  }
  const { path, lesson } = found;
  // Non-null captures so closures below keep the narrowing from the guard above.
  const activeProfile = profile;
  const activeCheckpoint = checkpoint;
  const cpIndex = lesson.checkpoints.findIndex((c) => c.id === activeCheckpoint.id);

  async function handlePick(source: PickSource) {
    setError(null);
    let asset;
    try {
      asset = await pickArtwork(source);
    } catch (e) {
      setError(e instanceof CaptureError ? e.message : 'Could not open the picker.');
      return;
    }
    if (!asset) return;

    setBusy(true);
    try {
      const prepared = await prepareForCritique(asset);
      const persistedUri = await persistArtwork(prepared.uri);
      const isCorrection = attempts.length > 0;
      const feedback = await requestCritique({
        imageBase64: prepared.base64,
        mediaType: prepared.mediaType,
        category: activeProfile.category,
        medium: activeProfile.medium,
        level: activeProfile.level,
        lessonTitle: lesson.title,
        lessonObjective: lesson.objective,
        checkpointTitle: activeCheckpoint.title,
        checkpointInstruction: activeCheckpoint.instruction,
        assignment: activeCheckpoint.assignment,
        successCriteria: activeCheckpoint.successCriteria,
        rubricDimensions: activeCheckpoint.rubric.dimensions,
        rubricCriteria: activeCheckpoint.rubric.criteria,
        isCorrection,
        previousPriorityIssue: latest?.feedback?.priorityIssue,
      });
      const attempt: Attempt = {
        id: uid(),
        imageUri: persistedUri,
        createdAt: Date.now(),
        isCorrection,
        feedback,
      };
      recordAttempt(lesson.id, activeCheckpoint.id, attempt, { complete: feedback.checkpointMet });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  function goNext() {
    const next = nextCheckpoint(path, progress);
    if (next && next.checkpoint.id !== activeCheckpoint.id) {
      router.replace({
        pathname: '/checkpoint/[lessonId]',
        params: { lessonId: next.lesson.id, cp: next.checkpoint.id },
      });
    } else if (next) {
      // same checkpoint still incomplete somehow — go back to lesson
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }

  const firstImg = attempts[0]?.imageUri;
  const latestImg = latest?.imageUri;
  const showComparison = attempts.length > 1 && firstImg && latestImg;

  return (
    <>
      <Stack.Screen options={{ title: `Checkpoint ${cpIndex + 1}` }} />
      <Screen
        footer={
          completed ? (
            <Button label="Continue" icon="→" onPress={goNext} />
          ) : undefined
        }
      >
        <View style={styles.headerPills}>
          <Pill label={`Lesson ${lesson.number}`} tone="primary" />
          <Pill label={`Checkpoint ${cpIndex + 1} of ${lesson.checkpoints.length}`} />
          {completed ? <Pill label="Complete" tone="success" icon="✓" /> : null}
        </View>

        <AppText variant="display" style={styles.title}>
          {checkpoint.title}
        </AppText>

        <Card style={styles.card}>
          <AppText variant="overline" tone="muted">
            THE TASK
          </AppText>
          <AppText variant="body">{checkpoint.instruction}</AppText>
          <View style={[styles.assignment, { borderTopColor: theme.border }]}>
            <AppText variant="caption" tone="muted">
              SUBMIT
            </AppText>
            <AppText variant="bodyStrong">{checkpoint.assignment}</AppText>
          </View>
        </Card>

        <Card alt style={styles.card}>
          <AppText variant="overline" tone="muted">
            SUCCESS CRITERIA
          </AppText>
          <View style={styles.criteria}>
            {checkpoint.successCriteria.map((c, i) => (
              <View key={i} style={styles.criterion}>
                <AppText style={[styles.bullet, { color: theme.primary }]}>◦</AppText>
                <AppText variant="body" style={styles.flex}>
                  {c}
                </AppText>
              </View>
            ))}
          </View>
        </Card>

        {/* Submissions + feedback */}
        {latestImg ? (
          <View style={styles.section}>
            <AppText variant="heading" style={styles.sectionTitle}>
              {showComparison ? 'Your progress' : 'Your submission'}
            </AppText>
            {showComparison ? (
              <View style={styles.compareRow}>
                <View style={styles.compareCol}>
                  <AppText variant="caption" tone="muted">
                    First
                  </AppText>
                  <Image source={{ uri: firstImg }} style={styles.thumb} contentFit="cover" transition={150} />
                </View>
                <View style={styles.compareCol}>
                  <AppText variant="caption" tone="primary">
                    Latest
                  </AppText>
                  <Image source={{ uri: latestImg }} style={styles.thumb} contentFit="cover" transition={150} />
                </View>
              </View>
            ) : (
              <Image source={{ uri: latestImg }} style={styles.singleImage} contentFit="cover" transition={150} />
            )}
            <AppText variant="caption" tone="muted" style={styles.attemptCount}>
              {attempts.length} submission{attempts.length === 1 ? '' : 's'}
            </AppText>
          </View>
        ) : null}

        {busy ? (
          <Card style={styles.busyCard}>
            <ActivityIndicator color={theme.primary} />
            <AppText variant="bodyStrong" style={styles.busyText}>
              Your coach is reviewing your work…
            </AppText>
            <AppText variant="caption" tone="muted" style={styles.center}>
              This usually takes a few seconds.
            </AppText>
          </Card>
        ) : latest?.feedback ? (
          <View style={styles.section}>
            <AppText variant="heading" style={styles.sectionTitle}>
              Coach feedback
            </AppText>
            <FeedbackView feedback={latest.feedback} medium={profile.medium} />
          </View>
        ) : null}

        {error ? (
          <Card style={[styles.errorCard, { backgroundColor: theme.dangerSoft, borderColor: theme.danger }]}>
            <AppText variant="bodyStrong" style={{ color: theme.danger }}>
              {error}
            </AppText>
          </Card>
        ) : null}

        {/* Capture actions */}
        {!busy ? (
          <Card style={styles.captureCard}>
            <AppText variant="heading">
              {attempts.length === 0 ? 'Submit your work' : completed ? 'Push it further' : 'Submit a revision'}
            </AppText>
            <AppText variant="caption" tone="secondary">
              {attempts.length === 0
                ? 'Photograph your drawing or upload it to get feedback.'
                : 'Apply the correction, then resubmit to see your score improve.'}
            </AppText>
            <View style={styles.captureButtons}>
              <Button label="Take photo" icon="📷" onPress={() => handlePick('camera')} style={styles.flex} />
              <Button label="Upload" icon="🖼" variant="secondary" onPress={() => handlePick('library')} style={styles.flex} />
            </View>
            {latest?.feedback && !completed ? (
              <Button
                label="Mark complete anyway"
                variant="ghost"
                onPress={() => {
                  setCheckpointComplete(lesson.id, checkpoint.id, true);
                }}
              />
            ) : null}
          </Card>
        ) : null}
      </Screen>
    </>
  );
}

function resolveCpId(found: NonNullable<ReturnType<typeof findLessonById>>, cp?: string): string {
  if (cp) return cp;
  const firstIncomplete = found.lesson.checkpoints[0];
  return firstIncomplete.id;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  headerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  title: { marginTop: Spacing.sm, marginBottom: Spacing.lg },
  card: { gap: Spacing.sm, marginBottom: Spacing.lg },
  assignment: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.sm, marginTop: Spacing.xs, gap: 2 },
  criteria: { gap: Spacing.sm, marginTop: Spacing.xs },
  criterion: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  bullet: { fontSize: 18, lineHeight: 22, fontWeight: '900' },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { marginBottom: Spacing.md },
  compareRow: { flexDirection: 'row', gap: Spacing.md },
  compareCol: { flex: 1, gap: 6 },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: Radius.md },
  singleImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.md },
  attemptCount: { marginTop: Spacing.sm },
  busyCard: { alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.lg, paddingVertical: Spacing.xl },
  busyText: { marginTop: Spacing.xs },
  errorCard: { marginBottom: Spacing.lg },
  captureCard: { gap: Spacing.md, marginBottom: Spacing.lg },
  captureButtons: { flexDirection: 'row', gap: Spacing.md },
});
