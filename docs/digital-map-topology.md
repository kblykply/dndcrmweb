# DND Dijital Harita: altyapı kaydı

Bu belge, kullanıcının anlattığı mevcut altyapıyı ve uygulamadaki başlangıç haritasını açıklar. Barındırma bilgileri kullanıcı beyanına dayanır; resmi web adreslerinin doğrulanması, sunucu veya barındırma yapısının ayrıca doğrulandığı anlamına gelmez.

Harita üreticisi: [topology.ts](../src/app/\(app\)/digital-map/_lib/topology.ts). `createDndInfrastructure(locale)` aynı öğe ve bağlantı kimlikleriyle Türkçe veya İngilizce belge oluşturur. Kimlikler; düzenlemelerin, sistem gruplarının ve eklenen görsellerin eşleştirilebilmesi için sabittir.

## DND AWS ortamı

Yalnızca iki EC2 sunucusu vardır: Windows ve Ubuntu. Ek EC2, sanal makine veya sağlayıcı sunucusu varsayılmamıştır.

| Sunucu | Sistem | Doğrulanan bileşenler |
| --- | --- | --- |
| Windows | Logo | Backend, veritabanı, masaüstü modülü |
| Windows | Talep Restoran | Frontend/panel, backend, veritabanı |
| Windows | Talep İnşaat | Frontend/panel, backend, veritabanı |
| Windows | Muhasebe CRM | Web uygulaması; backend/veritabanı mimarisi ayrıca belirtilmedi |
| Ubuntu | DND Reserve | Site yönetimi ve kiralama backend'i ile veritabanı |
| Ubuntu | DND CRM | Şirket raporları backend'i ile veritabanı |
| Ubuntu | Golden Eye / PSS | Satış/PSS backend'i ile veritabanı |
| Ubuntu | DND Homes | Backend ve veritabanı |
| Ubuntu | Ozan Dokmecioglu | Backend ve veritabanı |

AWS hesap/bölge bilgileri, instance kimlikleri, sunucu adresleri, işletim sistemi sürümleri ve veritabanı motorları belirtilmemiştir. Harita bunları boş veya açıklama notuyla bırakır.

## Vercel üzerindeki web siteleri ve paneller

Her uygulamanın web bileşenleri ayrı bir uygulama grubunda bulunur. DND Reserve Booking, Golden Eye, DND Homes ve Ozan Dokmecioglu için web sitesi ve panel; DND CRM için frontend/panel gösterilir. Bu uygulamalar ilgili Ubuntu backend'ine bağlıdır.

**DND Cyprus frontend route yapısını kullanır; ayrı backend veya veritabanı yoktur.** Web sitesi ve panel Vercel grubunda bulunur. Backend eksikmiş gibi bir öğe veya bağlantı oluşturulmaz.

Golden Eye satış/PSS sistemi, DND Reserve'in site yönetimi ve kiralama işlevinden ayrı tutulur.

### Bilinen adresler

| Sistem | Bilinen URL | Kaynak |
| --- | --- | --- |
| DND Reserve Booking | [dndreserve.com/en](https://www.dndreserve.com/en) | Resmi web sitesi |
| Golden Eye Resort Bafra | [goldeneyeresortbafra.com](https://www.goldeneyeresortbafra.com/) | Resmi web sitesi |
| DND Homes | [dnd-homes.com](https://dnd-homes.com/) | Resmi web sitesi |
| Ozan Dokmecioglu | [ozandokmecioglu.com](https://www.ozandokmecioglu.com/) | Resmi web sitesi |
| DND Cyprus | [dndcyprus.com](https://www.dndcyprus.com/) | Resmi web sitesi |
| DND CRM frontend | [dndcrmweb.vercel.app](https://dndcrmweb.vercel.app) | Mevcut API [CORS yapılandırması](../../api/src/main.ts) |

Bu adresler yalnızca belirtilen web bileşenlerine atanır. Yönetim paneli yolları, başka Vercel proje adresleri veya backend URL'leri tahmin edilmez; kullanıcı tarafından girilebilir.

## Dış sağlayıcılar

**HotelRunner**, La Joya kiralama operasyonları için PMS, kanal yönetimi ve takvim hizmeti sağlar. Kullanıcının belirttiği sağlayıcı AWS ortamı, DND'nin iki EC2 sunucusundan ayrı bir bulut grubu olarak gösterilir. Sağlayıcının sunucu ve hesap ayrıntıları bilinmez.

**Simpra Portal** dış sağlayıcının AWS ortamında gösterilir. Simpra POS ve Simpra Inventory ayrı sistemlerdir. Bu iki sistemin nerede barındırıldığı belirtilmediği için Portal'ın AWS grubunun içine yerleştirilmez.

## Veri akışları

| Kaynak | Hedef | Aktarılan veri |
| --- | --- | --- |
| Simpra POS | Simpra Inventory | Çift yönlü POS / Inventory veri alışverişi |
| Simpra POS | Simpra Portal | POS verileri |
| Simpra Inventory | Simpra Portal | Inventory verileri |
| Simpra Portal | Logo | Simpra Portal verileri |
| Logo | DND CRM | Finansal raporlama verileri |
| Simpra Portal | DND CRM | Portal üzerinden Inventory verileri |
| HotelRunner | DND CRM | PMS / kanal / takvim verileri |
| HotelRunner PMS | Logo Muhasebe | PMS verileri |
| Talep Restoran | Logo Muhasebe | Talep Restoran Logo’ya veri yazar |
| Talep İnşaat | Logo Muhasebe | Talep İnşaat Logo’ya veri yazar |
| Logo Muhasebe | Muhasebe CRM | Muhasebe CRM Logo’dan veri çeker |
| DND Reserve booking engine | HotelRunner PMS / Channel Manager | Rezervasyon yapıldığında rezervasyon bilgileri |

Bu on iki bağlantı iş düzeyindeki veri akışlarını gösterir. Muhasebe CRM veriyi çekse de ok, verinin kaynağı olan Logo’dan Muhasebe CRM’e doğrudur. Talep Restoran ve Talep İnşaat’ın Logo’ya yazması, doğrudan veritabanı bağlantısı veya belirli bir protokol varsaymadan sistemler arasında gösterilir. Aktarım protokolü, teknik endpoint ve alan eşleştirmeleri belirtilmemiştir. DND Reserve → HotelRunner akışı rezervasyon yapıldığında tetiklenir; diğer akışların zamanlaması belirtilmemiştir. Inventory → DND CRM akışı Portal üzerinden gösterilir; doğrudan bağlantı varsayılmaz.

## Erişim sınırları

- Ofisteki finans/muhasebe kullanıcıları RDP üzerinden Logo masaüstü modülüne ve Muhasebe CRM'e erişir.
- Ofis dışındaki kullanıcılar Tailscale üzerinden Talep Restoran ve Talep İnşaat frontend'lerine erişir. Bu kullanıcıların ekip veya yetki grupları henüz belirtilmemiştir.
- Paylaşılan `http://100.81.139.12:8085/` adresinin hangi uygulamaya ait olduğu belirtilmedi. Adres yalnızca Tailscale açıklama notunda tutulur; bir öğeye URL veya IP olarak atanmaz.
- Erişim matrisi yalnızca `ACCESS` bağlantılarını takip eder ve ağ geçitlerinden geçebilir. API, veritabanı veya veri akışı bağlantılarından kullanıcı yetkisi çıkarmaz.

Harita mevcut bilgileri belgeler; sistemlerin gerçek erişim izinlerini değiştirmez.

## Erişim yetkisi

Dijital Harita geçici olarak yalnızca aktif **ADMIN** hesaplarına açıktır. Gerçek altyapı verisi tarayıcı paketine gömülmez; yalnızca yetki kontrolü yapılan API’den alınır. MANAGER dahil diğer roller menüde modülü göremez; sayfaya, harita API’sine ve görsel yükleme/indirme uçlarına erişemez.

## Haritayı kullanma

- **Sistem görünümü** backend/DB bileşenlerini uygulama kartında toplar. **Teknik detay** bileşenleri tek tek açar; sürükleme, yeniden boyutlandırma ve iç içe yerleştirme bu görünümde yapılır.
- **Veri akışı** on iki iş entegrasyonunu, **Erişim yolları** RDP ve Tailscale yollarını gösterir. **Tüm bağlantılar** frontend/backend ve veritabanı bağlantılarını da açar.
- **Sisteme odaklan** seçimi, uygulamanın kendisini ve doğrudan bağlantılı sistemleri gösterir. Çalışma alanı tam ekran açılabilir; yakınlaştırma ve genel görünüm düğmeleri bulunur.
- **Website & paneller** bölümünde bağlantılar açılır, öğe ayrıntılarından eksik URL'ler ve PNG/JPG/WebP ekran görüntüleri (en fazla 5 MB) eklenir. Görsel atamasının paylaşılması için **Haritayı kaydet** kullanılır.
- Görseller kimlik doğrulamalı API üzerinden yüklenir ve okunur. JSON dışa aktarma görsel kimliklerini içerir; görsel dosyalarının taşınabilir yedeği değildir.
- Önizleme önce yüklenen görseli gösterir. **Canlı sayfa** seçilirse tarayıcı ilgili adresi açar. Gömülmeyi engelleyen siteler yeni sekmede açılabilir; özel ağ adreslerinde kullanıcının gerekli ağ bağlantısı bulunmalıdır.
