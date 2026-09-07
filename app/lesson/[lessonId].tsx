import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import {
  getCurrentCheckpointAttempt,
  getLessonDetail,
  startOrResumeLesson,
} from '@/features/lessons/api';
import { colors, spacing, typeScale } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function LessonRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ lessonId?: string | string[] }>();
  const lessonId = typeof params.lessonId === 'string' ? params.lessonId : '';
  const valid = UUID.test(lessonId);

  const lesson = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => getLessonDetail(lessonId),
    enabled: valid,
  });

  const start = useMutation({
    mutationFn: async () => {
      const attemptId = await startOrResumeLesson(lessonId);
      const checkpoint = await getCurrentCheckpointAttempt(attemptId);
      if (!checkpoint) throw new Error('current_checkpoint_missing');
      return { attemptId, checkpointAttemptId: checkpoint.id };
    },
    onSuccess: ({ attemptId, checkpointAttemptId }) => {
      router.push(`/attempt/${attemptId}/checkpoint/${checkpointAttemptId}`);
    },
  });

  if (!valid) {
    return (
      <Screen title="Ders açılamadı" footer={<AppButton label="Geri dön" onPress={() => router.back()} />}>
        <MessageState tone="danger" title="Geçersiz ders kimliği" body="Ders bağlantısı beklenen biçimde değil. Güvenli şekilde önceki ekrana dönebilirsin." />
      </Screen>
    );
  }

  if (lesson.isPending) {
    return (
      <Screen title="Ders yükleniyor">
        <MessageState title="Ders hazırlanıyor" body="Hedefler ve kontrol noktaları güvenli katalogdan alınıyor." />
      </Screen>
    );
  }

  if (lesson.isError) {
    return (
      <Screen title="Ders açılamadı">
        <MessageState tone="danger" title="Ders bulunamadı" body="Ders artık aktif olmayabilir veya bağlantı kurulamadı." />
        <AppButton label="Tekrar Dene" onPress={() => void lesson.refetch()} />
        <AppButton label="Geri dön" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const data = lesson.data;

  return (
    <Screen
      title={`Ders ${data.lessonNumber} — ${data.title}`}
      description={data.instructions}
      footer={
        <AppButton
          label={start.isPending ? 'Ders hazırlanıyor…' : 'Derse Başla / Devam Et'}
          disabled={start.isPending}
          onPress={() => start.mutate()}
        />
      }
    >
      <Card>
        <Text style={styles.kicker}>AMAÇ</Text>
        <Text style={styles.body}>{data.objective}</Text>
        <Text style={styles.meta}>Yaklaşık {data.estimatedMinutes} dakika</Text>
      </Card>

      <Card>
        <Text style={styles.kicker}>MALZEMELER</Text>
        {data.materials.map((material) => <Text key={material} style={styles.body}>• {material}</Text>)}
      </Card>

      <Card>
        <Text style={styles.kicker}>KONTROL NOKTALARI</Text>
        <View style={styles.checkpointList}>
          {data.checkpoints.map((checkpoint) => (
            <View key={checkpoint.id} style={styles.checkpointRow}>
              <Text style={styles.position}>{checkpoint.position}</Text>
              <View style={styles.checkpointCopy}>
                <Text style={styles.checkpointTitle}>{checkpoint.title}</Text>
                <Text style={styles.checkpointBody}>{checkpoint.instruction}</Text>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {start.isError ? (
        <MessageState tone="danger" title="Ders başlatılamadı" body="Bu ders henüz uygun olmayabilir veya bağlantı kesilmiş olabilir. İlerleme istemci tarafından zorlanmaz." />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800', letterSpacing: 1.2 },
  body: { color: colors.ink, fontSize: typeScale.body, lineHeight: 22 },
  meta: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '700' },
  checkpointList: { gap: spacing.md },
  checkpointRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  position: { width: 28, color: colors.brand, fontWeight: '900', fontSize: typeScale.body },
  checkpointCopy: { flex: 1, gap: spacing.xs },
  checkpointTitle: { color: colors.ink, fontSize: typeScale.body, fontWeight: '800' },
  checkpointBody: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 19 },
});
