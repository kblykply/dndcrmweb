# Dijital Ekip

`/digital-team`, IT projelerini ve sürekli süreçleri yönetim düzeyinde izlemek için kullanılır. Kayıtlar; sorumluları, iş dağılımını, hedefleri, dış faktörleri, bağlantıları ve güncelleme geçmişini bir arada tutar.

## Erişim ve ekip üyeleri

Modülü yalnızca **ADMIN** kullanıcıları görüntüler ve düzenler. Ekip kataloğundaki bir kişiyi projeye veya iş parçasına atamak uygulama hesabı ya da erişim yetkisi vermez. Kataloğa eklenecek gelecekteki ekip üyelerinin uygulama hesabı olması gerekmez.

Yeni kayıtta sorumlu seçimi, giriş yapan yöneticinin ekip kaydıyla eşleştirilebilir. Başka üyeler ve gerçek projeler kullanıcı tarafından eklenir; iş/proje adı, ilerleme veya özel işletme bilgisi üretilmez. Üyenin pasifleştirilmesi mevcut ve geçmiş atamalardaki adını gizlemez.

## Proje ve süreç oluşturma

- **Proje**, belirli bir sonuç ve hedef tarih için yürütülen çalışmadır.
- **Süreç**, tekrarlanan veya sürekli yürütülen iştir. Tekrarlanma sıklığı ayrıca yazılır; sürece tamamlanma yüzdesi atanmaz.
- Yeni kayıtlar `PLANNED`, `NORMAL` öncelik, `NOT_SET` gidişat ve boş ilerleme bilgisiyle başlar.
- Amaç/beklenen sonuç, özet, sorumlu, tarihler ve sonraki adım kullanıcı tarafından doldurulur.
- Kayıt durumları: planlandı, aktif, duraklatıldı, tamamlandı ve arşivlendi.

### İlerleme

Proje ilerlemesi, kullanıcı tarafından girilen bir değerlendirmedir. Belirtilmemiş yüzde `null` kalır ve **“Henüz belirtilmedi”** olarak gösterilir; sıfır varsayılmaz.

Tamamlanan iş parçası sayısı, proje yüzdesine dönüştürülmez. Örneğin dört parçanın dördü tamamlanmış olsa bile girilmemiş proje ilerlemesi boş kalır. Portföy genelinde yüzde ortalaması veya görev adetlerinden kapasite tahmini hesaplanmaz.

### İş dağılımı ve dış faktörler

İş parçasında başlık, kapsam, sorumlu, durum ve isteğe bağlı hedef tarihi bulunur. Bunlar kimin hangi bölümden sorumlu olduğunu gösterir.

Dış faktörlerde konu, kaynak kişi/kurum/sistem, sorumlu, takip tarihi, sonraki adım, açıklama ve isteğe bağlı bağlantı tutulur. Etkiler **bilgi**, **risk** veya **engelleyici**; durumlar **açık** veya **çözüldü** olabilir. Bir faktörün çözülmesi ayrıca kaydedilir; bağlı bir sayfanın açılması faktörü çözülmüş saymaz.

## Yönetim göstergeleri

| Gösterge | Tanım |
| --- | --- |
| Aktif projeler | Türü `PROJECT`, durumu `ACTIVE` olan kayıt sayısı |
| Aktif süreçler | Türü `PROCESS`, durumu `ACTIVE` olan kayıt sayısı |
| Engellenen kayıtlar | Tamamlanmamış/arşivlenmemiş, gidişatı `BLOCKED` olan veya açık engelleyici dış faktörü bulunan benzersiz kayıt sayısı |
| Tarihi geçen projeler | Hedef günü bugünden önce olan, tamamlanmamış/arşivlenmemiş projeler |

Bir kaydın hem engellenmiş gidişatı hem de birden fazla engelleyici faktörü varsa **bir** engellenen kayıt sayılır. Riskli gidişat tek başına engellenme sayılmaz. Duraklatılmış bir projenin hedef tarihi geçmişse tarihi geçen projelere dahil edilir.

Tarih değerlendirmesi kullanıcının yerel takvim gününe göre yapılır. Hedefin bugüne denk gelmesi gecikme değildir; gün bittikten sonra gecikme sayılır. Süreçlerin tarihleri takip amacıyla gösterilebilir, ancak **tarihi geçen projeler** göstergesine süreçler dahil edilmez.

## Bağlantılar ve geçmiş

Web sitesi, panel, kod deposu, belge ve diğer bağlantılar açık `http://` veya `https://` adresleri kullanır. Özel ağ adresleri desteklenir. Göreli adresler, çalıştırılabilir URL şemaları ve adres içine gömülmüş kullanıcı adı/şifre kabul edilmez. İletişim alanı, bağlantı alanından ayrıdır.

Durum notları ve değişiklik geçmişi; değişikliği yapan kişiyi, zamanı ve değişen alanları görünür kılar. Günlük iş adımlarının her biri için yeni proje açmak yerine mevcut projedeki iş dağılımı ve sonraki adım alanları kullanılabilir.

## Geliştirici notları

- [model.ts](../src/app/\(app\)/digital-team/_lib/model.ts): boş taslaklar, metrikler, yerel gün hesabı, güvenli bağlantılar, kişi adları ve filtreleme.
- [copy.ts](../src/app/\(app\)/digital-team/_lib/copy.ts): Türkçe/İngilizce alan ve seçenek etiketleri.
- [digital-team-model.test.mjs](../tests/digital-team-model.test.mjs): metrik, saat dilimi, URL, taslak, arama ve çeviri kontrolleri.

Filtre yardımcısında boş veya `ALL` değerleri filtreyi kaldırır. Sorumlu filtresindeki `null` veya `UNASSIGNED`, sorumlusu atanmamış kayıtları seçer.

## Doğrulama

```sh
node --test tests/digital-team-model.test.mjs tests/navigation.test.mjs
npx eslint 'src/app/(app)/digital-team' src/app/_ui/navigation.ts
npm run build
PLAYWRIGHT_MODULE=/path/to/playwright FRONTEND_URL=http://localhost:3001 node tests/digital-team.browser.cjs
```

Tarayıcı testi bütün API isteklerini izole verilerle karşılar; gerçek projelere veya üyelere yazmaz. Oluşturma, atama, dış faktör ve bağlantı kaydı, çakışmada taslağın korunması, durum notu, arşivleme/geri alma, altı ADMIN dışı rolün engellenmesi, mobil ekran ve koyu tema kontrol edilir.

Gerçek veritabanı kurulumu ve isteğe bağlı ilk ekip üyesi için API deposundaki `docs/digital-team.md` belgesine bakın. Ekip üyeliği kullanıcı hesabının rolünü değiştirmez.
