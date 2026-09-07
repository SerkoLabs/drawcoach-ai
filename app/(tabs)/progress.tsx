import { MessageState } from '@/components/ui/message-state';
import { Screen } from '@/components/ui/screen';

export default function ProgressScreen() {
  return (
    <Screen title="Gelişim Haritan" description="Kompozisyon, perspektif, değer, renk ve malzeme kontrolündeki değişimini takip edeceksin.">
      <MessageState title="Henüz puan yok" body="İlk gerçek ders ve iki aşamalı geri bildirim döngüsü tamamlandığında beceri eğilimleri burada oluşacak." />
    </Screen>
  );
}
