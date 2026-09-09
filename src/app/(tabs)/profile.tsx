import { useState } from 'react';
import { Alert, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/Text';
import { getPath } from '@/content/paths';
import { Radius, Spacing } from '@/constants/theme';
import {
  AGE_BANDS,
  EXPERIENCE_LEVELS,
  GOALS,
  WEEKLY_PRACTICE,
  type Option,
} from '@/domain/types';
import { useScheme, useTheme } from '@/hooks/use-theme';
import { useApp } from '@/store/AppStore';

function labelFor(options: Option<string>[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

async function confirm(title: string, message: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      {
        text: destructive ? 'Delete' : 'OK',
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}

export default function Profile() {
  const theme = useTheme();
  const scheme = useScheme();
  const { profile, pathId, renameProfile, deleteAllArtwork, deleteAccount } = useApp();

  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');

  const path = getPath(pathId);
  if (!profile) return null;

  function startEdit() {
    setNameDraft(profile!.name);
    setEditing(true);
  }
  function saveEdit() {
    const trimmed = nameDraft.trim();
    if (trimmed) renameProfile(trimmed);
    setEditing(false);
  }

  async function onDeleteArtwork() {
    const ok = await confirm(
      'Delete all artwork?',
      'This removes every photo you have submitted. Your lesson progress is kept. This cannot be undone.',
      true,
    );
    if (ok) await deleteAllArtwork();
  }

  async function onDeleteAccount() {
    const ok = await confirm(
      'Delete account?',
      'This permanently erases your profile, all progress and all artwork from this device. This cannot be undone.',
      true,
    );
    if (ok) await deleteAccount();
  }

  const facts: { label: string; value: string }[] = [
    { label: 'Level', value: labelFor(EXPERIENCE_LEVELS, profile.level) },
    { label: 'Goal', value: labelFor(GOALS, profile.goal) },
    { label: 'Age band', value: labelFor(AGE_BANDS, profile.ageBand) },
    { label: 'Practice', value: labelFor(WEEKLY_PRACTICE, profile.weeklyPractice) },
  ];

  return (
    <Screen>
      <AppText variant="display" style={styles.title}>
        Profile
      </AppText>

      <Card style={styles.card}>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              autoFocus
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={saveEdit}
              returnKeyType="done"
              keyboardAppearance={scheme}
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
            />
            <Button label="Save" fullWidth={false} onPress={saveEdit} />
          </View>
        ) : (
          <View style={styles.nameRow}>
            <View style={styles.flex}>
              <AppText variant="overline" tone="muted">
                LEARNER
              </AppText>
              <AppText variant="title">{profile.name}</AppText>
            </View>
            <Button label="Edit" variant="ghost" fullWidth={false} onPress={startEdit} />
          </View>
        )}
      </Card>

      {path ? (
        <Card style={styles.card}>
          <AppText variant="overline" tone="primary">
            ACTIVE PATH
          </AppText>
          <AppText variant="heading">{path.title}</AppText>
          <View style={styles.factGrid}>
            {facts.map((f) => (
              <View key={f.label} style={styles.fact}>
                <AppText variant="caption" tone="muted">
                  {f.label}
                </AppText>
                <AppText variant="bodyStrong">{f.value}</AppText>
              </View>
            ))}
          </View>
        </Card>
      ) : null}

      <Card alt style={styles.card}>
        <AppText variant="heading">Your data is private</AppText>
        <AppText variant="caption" tone="secondary">
          Your profile, progress and artwork stay on this device. Images are sent to the feedback
          service only at the moment you submit a checkpoint, to generate your critique.
        </AppText>
      </Card>

      <AppText variant="overline" tone="muted" style={styles.dangerTitle}>
        DANGER ZONE
      </AppText>
      <View style={styles.dangerActions}>
        <Button label="Delete all artwork" variant="danger" onPress={onDeleteArtwork} />
        <Button label="Delete account & all data" variant="danger" onPress={onDeleteAccount} />
      </View>

      <AppText variant="caption" tone="muted" style={styles.version}>
        DrawCoach AI · MVP
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: Spacing.lg },
  card: { gap: Spacing.sm, marginBottom: Spacing.lg },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: 16,
  },
  factGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: Spacing.sm },
  fact: { width: '50%', paddingVertical: Spacing.sm, gap: 2 },
  dangerTitle: { marginBottom: Spacing.sm },
  dangerActions: { gap: Spacing.md },
  version: { textAlign: 'center', marginTop: Spacing.xxl },
});
