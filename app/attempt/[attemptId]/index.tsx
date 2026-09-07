import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { getAttemptHistoryDetail } from '@/features/history/api';
import { colors, radius, spacing, typeScale } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function AttemptDetailRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ attemptId?: string | string[] }>();
  const attemptId = typeof params.attemptId === 'string' ? params.attemptId : '';
  const valid = UUID.test(attemptId);

  const detail = useQuery({
    queryKey: ['attempt-history-detail', attemptId],
    queryFn: () => getAttemptHistoryDetail(attemptId),
    enabled: valid,
  });

  if (!valid) {
    return (
      <Screen title="Çalışma açılamadı">
        <MessageState tone="danger" title="Geçersiz çalışma kimliği" body="Bağlantı beklenen biçimde değil." />
        <AppButton label="Geri dön" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (detail.isPending) {
    return (
      <Screen title="Çalışma yükleniyor">
        <MessageState title="Geçmiş hazırlanıyor" body="Çizim sürümleri ve geri bildirimler yalnızca hesabın için yükleniyor." />
      </Screen>
    );
  }

  if (detail.isError) {
    return (
      <Screen title="Çalışma açılamadı">
        <MessageState tone="danger" title="Çalışma bulunamadı" body="Bu çalışma başka bir hesaba ait olabilir, silinmiş olabilir veya bağlantı kurulamadı." />
        <AppButton label="Tekrar Dene" onPress={() => void detail.refetch()} />
        <AppButton label="Geri dön" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const attempt = detail.data;

  return (
    <Screen
      title={attempt.lessonTitle}
      description={attempt.status === 'completed' ? 'Tamamlanmış ders çalışması' : 'Devam eden ders çalışması'}
    >
      {attempt.checkpoints.map((checkpoint) => {
        const first = checkpoint.submissions[0];
        const last = checkpoint.submissions[checkpoint.submissions.length - 1];
        const showPair = first && last && first.id !== last.id;

        return (
          <Card key={checkpoint.id}>
            <Text style={styles.kicker}>{checkpoint.position}. KONTROL NOKTASI</Text>
            <Text style={styles.title}>{checkpoint.title}</Text>
            <Text style={styles.status}>{checkpoint.status === 'accepted' ? 'Hedef düzeldi' : checkpoint.status === 'needs_practice' ? 'Ek pratik önerildi' : 'Devam ediyor'}</Text>

            {checkpoint.submissions.length === 0 ? (
              <Text style={styles.body}>Henüz kayıtlı çizim yok.</Text>
            ) : showPair ? (
              <View style={styles.comparison}>
                <View style={styles.imageColumn}>
                  <Text style={styles.label}>İlk</Text>
                  {first.signedUrl ? <Image source={{ uri: first.signedUrl }} style={styles.image} resizeMode="cover" /> : <Text style={styles.body}>Görüntü erişimi yenilenemedi.</Text>}
                </View>
                <View style={styles.imageColumn}>
                  <Text style={styles.label}>Son</Text>
                  {last.signedUrl ? <Image source={{ uri: last.signedUrl }} style={styles.image} resizeMode="cover" /> : <Text style={styles.body}>Görüntü erişimi yenilenemedi.</Text>}
                </View>
              </View>
            ) : (
              <View>
                <Text style={styles.label}>Gönderim {first.version}</Text>
                {first.signedUrl ? <Image source={{ uri: first.signedUrl }} style={styles.singleImage} resizeMode="contain" /> : <Text style={styles.body}>Görüntü erişimi yenilenemedi.</Text>}
              </View>
            )}

            {last?.critique ? (
              <View style={styles.feedback}>
                <Text style={styles.label}>Son geri bildirim</Text>
                <Text style={styles.body}>{last.critique.priorityIssue}</Text>
                <Text style={styles.nextAction}>{last.critique.nextAction}</Text>
              </View>
            ) : null}
          </Card>
        );
      })}
      <AppButton label="Geri dön" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: typeScale.title, fontWeight: '900' },
  status: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '800' },
  body: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 19 },
  label: { color: colors.ink, fontSize: typeScale.caption, fontWeight: '800' },
  comparison: { flexDirection: 'row', gap: spacing.sm },
  imageColumn: { flex: 1, gap: spacing.xs },
  image: { width: '100%', aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.background },
  singleImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.background, marginTop: spacing.xs },
  feedback: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  nextAction: { color: colors.brand, fontSize: typeScale.caption, lineHeight: 19, fontWeight: '800' },
});
