import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { getMyNextLesson } from '@/features/lessons/api';
import { t } from '@/i18n';
import { colors, typeScale } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const nextLesson = useQuery({
    queryKey: ['my-next-lesson'],
    queryFn: getMyNextLesson,
    staleTime: 30_000,
  });

  if (nextLesson.isPending) {
    return (
      <Screen title={t('home.title')} description={t('home.description')}>
        <MessageState title="Ders yolun hazırlanıyor" body="Kayıtlı planın ve sıradaki uygun ders kontrol ediliyor." />
      </Screen>
    );
  }

  if (nextLesson.isError) {
    return (
      <Screen title={t('home.title')} description={t('home.description')}>
        <MessageState tone="danger" title="Ders bilgisi alınamadı" body="Bağlantını kontrol edip tekrar deneyebilirsin." />
        <AppButton label={t('common.retry')} onPress={() => void nextLesson.refetch()} />
      </Screen>
    );
  }

  if (!nextLesson.data) {
    return (
      <Screen title={t('home.title')} description={t('home.description')}>
        <MessageState title="Sırada açık ders yok" body="Aktif öğrenme yolundaki uygun dersler tamamlanmış olabilir. Yeni içerik eklenene kadar ilerlemen korunur." />
      </Screen>
    );
  }

  const lesson = nextLesson.data;

  return (
    <Screen title={t('home.title')} description={t('home.description')}>
      <Card>
        <Text style={styles.kicker}>{lesson.pathTitle.toUpperCase()}</Text>
        <Text style={styles.title}>Ders {lesson.lessonNumber} — {lesson.lessonTitle}</Text>
        <Text style={styles.body}>{lesson.lessonObjective}</Text>
        <Text style={styles.meta}>Yaklaşık {lesson.estimatedMinutes} dakika</Text>
        <AppButton label={t('home.openLesson')} onPress={() => router.push(`/lesson/${lesson.lessonId}`)} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800', letterSpacing: 1.3 },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: '800' },
  body: { color: colors.inkMuted, fontSize: typeScale.body, lineHeight: 22 },
  meta: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '700' },
});
