# IT Destek kullanımı

Modül adresi: `/it-support`. Menü: **Çalışma alanı → IT Destek**.

## Çalışanlar

1. **Bir sorun bildir** veya **Bir istekte bulun** ile kayıt açın. Konu/açıklama zorunludur; ilgili uygulama, cihaz, konum, etki ve işinize etkisini de belirtebilirsiniz.
2. Ekran görüntüsü veya belge ekleyebilirsiniz: PNG, JPG, WebP, PDF ve TXT; bir gönderimde en fazla üç dosya, dosya başına 5 MiB.
3. `DND-IT-000001` biçimindeki numarayla talebinizi **Taleplerim** ekranından bulun. Diğer çalışanların talepleri görünmez.
4. IT ekibinin sorularını aynı kayıttan yanıtlayın. Kullanıcıdan bilgi bekleyen talebe yanıt vermek kaydı İşlemde durumuna döndürür.
5. Çözümü doğruladığınızda **Çözümü onayla** ile kapatın. Sorun sürüyorsa gerekçe yazarak yeniden açın. İhtiyaç kalmadıysa talebi iptal edebilirsiniz.

## IT yönetimi

Şimdilik yalnızca ADMIN hesapları tüm kuyruğu yönetir. **Tüm talepler**, **Bana atanan**, **Atanmamış** ve **Taleplerim** görünümleri bulunur. Durum, öncelik, kategori, tür ve metin araması birlikte kullanılabilir.

**Talebi yönet** ile sorumlu, kategori, öncelik, durum ve isteğe bağlı hedef zamanını değiştirin. Kullanıcıdan veya dış taraftan bekleme, çözüm ve iptal işlemlerinde açıklama girilir. Bu açıklama talep sahibine görünür. Çözüm metni olmadan talep çözüldü durumuna geçemez.

**Talep sahibine yanıt** ile **İç not** farklı görünürlüktedir. İç not ve ekleri yalnızca ADMIN tarafından görülür. İki alanın metin ve dosya taslakları ayrı tutulur; görünüm değiştirildiğinde birinin içeriği diğerine taşınmaz.

Sorumlu seçimi aktif ADMIN hesapları arasındadır. Dijital Ekip kataloğuna kişi eklemek ticket yönetim yetkisi vermez. Dijital Ekip ve Dijital Harita yalnızca ADMIN erişiminde kalır.

## Takip ve dosyalar

- Geçmiş, kimin ne zaman mesaj yazdığını ve durum/atama/öncelik değişikliklerini gösterir.
- Planlanan hedef IT tarafından elle belirlenir. Otomatik kapanış veya SLA sayacı eklenmemiştir.
- Eşzamanlı değişikliklerde eski sürüm yeni bilgileri ezmez; başarısız gönderimde taslak ve seçili dosyalar korunur.
- Dosyalar genel bir bağlantıyla paylaşılmaz; görüntüleme/indirme sırasında ticket erişimi kontrol edilir. İç notun dosyası talep sahibine açılmaz.
- İlk sürüm CRM içindeki form ve konuşmayı kullanır. E-posta veya harici mesajlaşma gönderimi yoktur.
- Kayıt iptali veya kapanışı geçmişi silmez. Çalışanın yeniden açtığı kayıt Yeni durumuna; ADMIN'in yeniden açtığı kayıt İşlemde durumuna döner.

## Araştırma ve doğrulama

Tasarımın kaynakları ve kararları: [IT Destek araştırması](it-support-research.md).

```sh
node --test tests/it-support-model.test.mjs tests/navigation.test.mjs
npx eslint 'src/app/(app)/it-support' src/app/_ui/ModuleNavigation.tsx src/app/_ui/navigation.ts
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright FRONTEND_URL=http://localhost:3001 node tests/it-support.browser.cjs
```

Tarayıcı testleri tüm API yanıtlarını izole verilerle karşılar; gerçek ticket veya dosya oluşturmaz. Çalışan ve ADMIN akışları, yetkiler, iç not gizliliği, dosyalar, çözüm/onay/yeniden açma, taslak koruması, mobil ekran ve koyu tema kontrol edilir. Sunucu testleri ve migration ayrıntıları API deposundaki `docs/it-support.md` belgesindedir.
