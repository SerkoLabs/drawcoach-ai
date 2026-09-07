import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { Image, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/app-button';
import { Card } from '@/components/ui/card';
import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';
import { getCheckpointAttemptDetail } from '@/features/lessons/api';
import { uploadAndRegisterArtwork, type RegisteredArtwork } from '@/features/submissions/api';
import { randomUuidV4 } from '@/lib/uuid';
import { colors, radius, spacing, typeScale } from '@/theme/tokens';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PreparedArtwork = {
  asset: ImagePicker.ImagePickerAsset;
  submissionId: string;
};

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

  const acceptAsset = (asset: ImagePicker.ImagePickerAsset) => {
    setPrepared({ asset, submissionId: randomUuidV4() });
    setRegistered(null);
    setPickerMessage(null);
    upload.reset();
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
  const mutable = data.status === 'in_progress';

  return (
    <Screen
      title={`${data.position}. kontrol noktası — ${data.title}`}
      description={data.instruction}
    >
      {data.captureGuidance ? (
        <Card>
          <Text style={styles.kicker}>FOTOĞRAF İPUCU</Text>
          <Text style={styles.body}>{data.captureGuidance}</Text>
        </Card>
      ) : null}

      {!mutable ? (
        <MessageState title="Bu kontrol noktası artık düzenlenemez" body="Sunucu ilerleme durumunu tamamlanmış olarak işaretledi. Yeni yükleme yapılmaz." />
      ) : null}

      {prepared ? (
        <Card>
          <Image source={{ uri: prepared.asset.uri }} style={styles.preview} resizeMode="contain" accessibilityLabel="Seçilen çizim fotoğrafı" />
          <Text style={styles.meta}>{prepared.asset.width} × {prepared.asset.height}</Text>
          {registered ? (
            <MessageState
              title={`Gönderim ${registered.version} kaydedildi`}
              body="Çizim özel depolama alanına yüklendi ve bu kontrol noktasına sunucu tarafından bağlandı."
            />
          ) : null}
        </Card>
      ) : (
        <MessageState title="Çizimini ekle" body="Kağıdın tamamının göründüğü net bir fotoğraf seç veya kamerayla çek." />
      )}

      {pickerMessage ? <Text accessibilityRole="alert" style={styles.notice}>{pickerMessage}</Text> : null}
      {upload.isError ? (
        <MessageState tone="danger" title="Çizim kaydedilemedi" body="Yükleme veya sunucu kaydı tamamlanmadı. Aynı seçimi tekrar deneyebilirsin; ilerleme otomatik olarak tamamlanmaz." />
      ) : null}

      <View style={styles.actions}>
        <AppButton label="Galeriden Seç" variant="secondary" disabled={!mutable || upload.isPending} onPress={() => void pickFromLibrary()} />
        <AppButton label="Fotoğraf Çek" variant="secondary" disabled={!mutable || upload.isPending} onPress={() => void takePhoto()} />
        <AppButton
          label={upload.isPending ? 'Güvenli şekilde yükleniyor…' : registered ? 'Çizim Kaydedildi' : 'Yükle ve Kaydet'}
          disabled={!mutable || !prepared || upload.isPending || Boolean(registered)}
          onPress={() => upload.mutate()}
        />
      </View>

      {registered ? (
        <MessageState title="Sıradaki adım: AI geri bildirimi" body="Bu gönderim artık analiz için hazır. Analiz sunucu tarafında çalışacak; OpenAI anahtarı hiçbir zaman uygulamaya gelmeyecek." />
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
});
