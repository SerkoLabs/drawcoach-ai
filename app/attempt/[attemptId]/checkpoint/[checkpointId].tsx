import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { analyzeArtwork, type LearnerCritique } from '@/features/feedback/api';
import { getCheckpointAttemptDetail, getCurrentCheckpointAttempt } from '@/features/lessons/api';
import { uploadAndRegisterArtwork, type RegisteredArtwork } from '@/features/submissions/api';
import { randomUuidV4 } from '@/lib/uuid';
import { colors, radius, spacing, typeScale } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PreparedArtwork = {
  asset: ImagePicker.ImagePickerAsset;
  submissionId: string;
};

function FeedbackCard({ critique }: { critique: LearnerCritique }) {
  return (
    <Card>
      <Text style={styles.feedbackHeading}>AI GERİ BİLDİRİMİ</Text>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Güçlü yön</Text>
        <Text style={styles.body}>{critique.strength}</Text>
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Şimdi tek odağın</Text>
        <Text style={styles.priority}>{critique.priority_issue}</Text>
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Neden önemli?</Text>
        <Text style={styles.body}>{critique.why_it_matters}</Text>
      </View>
      <View style={styles.feedbackSection}>
        <Text style={styles.feedbackLabel}>Şimdi bunu yap</Text>
        <Text style={styles.actionText}>{critique.next_action}</Text>
      </View>
      {critique.micro_exercise ? (
        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackLabel}>Mini egzersiz</Text>
          <Text style={styles.body}>{critique.micro_exercise}</Text>
        </View>
      ) : null}
      {critique.limitations ? <Text style={styles.limitation}>Not: {critique.limitations}</Text> : null}
    </Card>
  );
}

export default function CheckpointRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    attemptId?: string | string[];
    checkpointId?: string | string[];
  }>();
  const attemptId = typeof params.attemptId === 'string' ? params.attemptId : '';
  const checkpointAttemptId = typeof params.checkpointId === 'string' ? params.checkpointId : '';
  const valid = UUID.test(attemptId) && UUID.test(checkpointAttemptId);

  const [prepared, setPrepared] = useState<PreparedArtwork | null>(null);
  const [registered, setRegistered] = useState<RegisteredArtwork | null>(null);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  const [latestFeedback, setLatestFeedback] = useState<LearnerCritique | null>(null);
  const [nextCheckpointId, setNextCheckpointId] = useState<string | null>(null);
  const [lessonCompleted, setLessonCompleted] = useState(false);

  const checkpoint = useQuery({
    queryKey: ['checkpoint-attempt', attemptId, checkpointAttemptId],
    queryFn: () => getCheckpointAttemptDetail(attemptId, checkpointAttemptId),
    enabled: valid,
  });

  const upload = useMutation({
    mutationFn: () => {
      if (!prepared) throw new Error('no_artwork_selected');
      return uploadAndRegisterArtwork({
        submissionId: prepared.submissionId,
        lessonAttemptId: attemptId,
        checkpointAttemptId,
        asset: prepared.asset,
      });
    },
    onSuccess: setRegistered,
  });

  const analysis = useMutation({
    mutationFn: async () => {
      if (!registered) throw new Error('submission_not_registered');
      return analyzeArtwork(registered.submissionId);
    },
    onSuccess: async (result) => {
      if (result.status === 'needs_better_image') {
        setPickerMessage(result.image_issue);
        setPrepared(null);
        setRegistered(null);
        return;
      }

      if (result.status === 'processing') {
        setPickerMessage('Analiz hâlâ devam ediyor. Biraz sonra aynı gönderim için tekrar kontrol edebilirsin.');
        return;
      }

      setLatestFeedback(result.critique);
      setPickerMessage(null);
      const state = await getCurrentCheckpointAttempt(attemptId);
      await checkpoint.refetch();

      if (!state) {
        setLessonCompleted(true);
        return;
      }
      if (state.id !== checkpointAttemptId) setNextCheckpointId(state.id);
    },
  });

  const acceptAsset = (asset: ImagePicker.ImagePickerAsset) => {
    setPrepared({ asset, submissionId: randomUuidV4() });
    setRegistered(null);
    setPickerMessage(null);
    setNextCheckpointId(null);
    upload.reset();
    analysis.reset();
  };

  const pickFromLibrary = async () => {
    setPickerMessage(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      selectionLimit: 1,
    });
    if (!result.canceled && result.assets[0]) acceptAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    setPickerMessage(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPickerMessage('Kamera izni verilmedi. İstersen galeriden bir fotoğraf seçebilirsin.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled && result.assets[0]) acceptAsset(result.assets[0]);
  };

  if (!valid) {
    return (
      <Screen title="Kontrol noktası açılamadı">
        <MessageState tone="danger" title="Geçersiz bağlantı" body="Çalışma bağlantısı beklenen güvenli kimlik biçiminde değil." />
        <AppButton label="Geri dön" onPress={() => router.back()} />
      </Screen>
    );
  }

  if (checkpoint.isPending) {
    return (
      <Screen title="Çalışman hazırlanıyor">
        <MessageState title="Kontrol noktası yükleniyor" body="Sunucudaki güncel ödev ve ilerleme durumu kontrol ediliyor." />
      </Screen>
    );
  }

  if (checkpoint.isError) {
    return (
      <Screen title="Kontrol noktası açılamadı">
        <MessageState tone="danger" title="Bu çalışma bulunamadı" body="Başka bir hesaba ait, tamamlanmış veya artık geçerli olmayan bir çalışma olabilir." />
        <AppButton label="Tekrar Dene" onPress={() => void checkpoint.refetch()} />
        <AppButton label="Geri dön" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }

  const data = checkpoint.data;
  const mutable = data.status === 'in_progress' && !nextCheckpointId && !lessonCompleted;

  return (
    <Screen title={`${data.position}. kontrol noktası — ${data.title}`} description={data.instruction}>
      {data.captureGuidance ? (
        <Card>
          <Text style={styles.kicker}>FOTOĞRAF İPUCU</Text>
          <Text style={styles.body}>{data.captureGuidance}</Text>
        </Card>
      ) : null}

      {latestFeedback ? <FeedbackCard critique={latestFeedback} /> : null}

      {nextCheckpointId ? (
        <MessageState title="Bu aşama tamamlandı" body="Düzeltmen sunucu tarafından kaydedildi. Sıradaki kontrol noktasına geçebilirsin." />
      ) : null}
      {lessonCompleted ? (
        <MessageState title="Ders tamamlandı" body="Tüm kontrol noktaları sunucu tarafında tamamlandı. İlerlemen yeniden açtığında da korunacak." />
      ) : null}

      {!mutable && !nextCheckpointId && !lessonCompleted ? (
        <MessageState title="Bu kontrol noktası artık düzenlenemez" body="Sunucu ilerleme durumunu tamamlanmış olarak işaretledi. Yeni yükleme yapılmaz." />
      ) : null}

      {mutable && prepared ? (
        <Card>
          <Image source={{ uri: prepared.asset.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel="Seçilen çizim fotoğrafı" />
          <Text style={styles.meta}>{prepared.asset.width} × {prepared.asset.height}</Text>
          {registered ? (
            <MessageState title={`Gönderim ${registered.version} kaydedildi`} body="Çizim özel depolama alanına yüklendi ve bu kontrol noktasına sunucu tarafından bağlandı." />
          ) : null}
        </Card>
      ) : mutable && !prepared ? (
        <MessageState title={latestFeedback ? 'Düzeltmeni göster' : 'Çizimini ekle'} body={latestFeedback ? 'Yukarıdaki tek ana düzeltmeyi uygula, sonra yeni fotoğrafını yükle.' : 'Kağıdın tamamının göründüğü net bir fotoğraf seç veya kamerayla çek.'} />
      ) : null}

      {pickerMessage ? <Text accessibilityRole="alert" style={styles.notice}>{pickerMessage}</Text> : null}
      {upload.isError ? <MessageState tone="danger" title="Çizim kaydedilemedi" body="Yükleme veya sunucu kaydı tamamlanmadı. Aynı seçimi tekrar deneyebilirsin; ilerleme otomatik olarak tamamlanmaz." /> : null}
      {analysis.isError ? <MessageState tone="danger" title="Geri bildirim alınamadı" body="Analiz başarısız olduğunda kontrol noktası tamamlanmaz. Aynı kayıt için tekrar deneyebilirsin." /> : null}

      {mutable ? (
        <View style={styles.actions}>
          <AppButton label="Galeriden Seç" variant="secondary" disabled={upload.isPending || analysis.isPending} onPress={() => void pickFromLibrary()} />
          <AppButton label="Fotoğraf Çek" variant="secondary" disabled={upload.isPending || analysis.isPending} onPress={() => void takePhoto()} />
          <AppButton
            label={upload.isPending ? 'Güvenli şekilde yükleniyor…' : registered ? 'Çizim Kaydedildi' : 'Yükle ve Kaydet'}
            disabled={!prepared || upload.isPending || analysis.isPending || Boolean(registered)}
            onPress={() => upload.mutate()}
          />
          {registered ? (
            <AppButton
              label={analysis.isPending ? 'AI değerlendiriyor…' : 'Geri Bildirim Al'}
              disabled={analysis.isPending}
              onPress={() => analysis.mutate()}
            />
          ) : null}
        </View>
      ) : null}

      {nextCheckpointId ? (
        <AppButton label="Sıradaki Aşamaya Geç" onPress={() => router.replace(`/attempt/${attemptId}/checkpoint/${nextCheckpointId}`)} />
      ) : null}
      {lessonCompleted ? (
        <AppButton label="Ana Sayfaya Dön" onPress={() => router.replace('/(tabs)')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800', letterSpacing: 1.2 },
  body: { color: colors.ink, fontSize: typeScale.body, lineHeight: 22 },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.md, backgroundColor: colors.background },
  meta: { color: colors.inkMuted, fontSize: typeScale.caption },
  actions: { gap: spacing.sm },
  notice: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 19 },
  feedbackHeading: { color: colors.brand, fontSize: typeScale.caption, fontWeight: '900', letterSpacing: 1.2 },
  feedbackSection: { gap: spacing.xs },
  feedbackLabel: { color: colors.inkMuted, fontSize: typeScale.caption, fontWeight: '800' },
  priority: { color: colors.ink, fontSize: typeScale.title, lineHeight: 30, fontWeight: '900' },
  actionText: { color: colors.brand, fontSize: typeScale.body, lineHeight: 23, fontWeight: '800' },
  limitation: { color: colors.inkMuted, fontSize: typeScale.caption, lineHeight: 18, fontStyle: 'italic' },
});
