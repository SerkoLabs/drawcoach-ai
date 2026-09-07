import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { getMyAttemptHistory } from '@/features/history/api';
import { t } from '@/i18n';
import { colors, typeScale } from '@/theme/tokens';

export default function HistoryScreen() {
  const router = useRouter();
  const history = useQuery({
    queryKey: ['attempt-history'],
    queryFn: getMyAttemptHistory,
  });

  if (history.isPending) {
    return (
      <Screen title={t('history.title')} description={t('history.description')}>
        <MessageState title="Çalışmalar yükleniyor" body="Özel ders geçmişin hesabından alınıyor." />
      </Screen>
    );
  }

  if (history.isError) {
    return (
      <Screen title={t('history.title')} description={t('history.description')}>
        <MessageState tone="danger" title="Geçmiş alınamadı" body="Bağlantını kontrol edip yeniden deneyebilirsin." />
        <AppButton label={t('common.retry')} onPress={() => void history.refetch()} />
      </Screen>
    );
  }

  if (history.data.length === 0) {
    return (
      <Screen title={t('history.title')} description={t('history.description')}>
        <MessageState title={t('history.emptyTitle')} body={t('history.emptyBody')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('history.title')} description={t('history.description')}>
      {history.data.map((attempt) => (
        <Card key={attempt.id}>
          <Text style={styles.title}>{attempt.lessonTitle}</Text>
          <Text style={styles.status}>{attempt.status === 'completed' ? 'Tamamlandı' : 'Devam ediyor'}</Text>
          <Text style={styles.date}>{new Date(attempt.startedAt).toLocaleDateString('tr-TR')}</Text>
          <AppButton label="Çalışmayı Aç" variant="secondary" onPress={() => router.push(`/attempt/${attempt.id}`)} />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontSize: typeScale.body, fontWeight: '800' },
  status: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '800' },
  date: { color: colors.inkMuted, fontSize: typeScale.caption },
});
