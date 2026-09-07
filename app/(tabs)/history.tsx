import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';

export default function HistoryScreen() {
  return (
    <Screen title="Çalışmaların" description="İlk gönderim ve düzeltilmiş sürümler özel geçmişinde yan yana tutulacak.">
      <MessageState title="Henüz çalışma yok" body="Bir ders checkpointine çizim yüklediğinde çalışma geçmişin burada başlayacak." />
    </Screen>
  );
}
