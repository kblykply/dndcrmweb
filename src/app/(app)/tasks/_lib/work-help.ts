export type WorkHelpArticle = {
  title: string;
  meaning: string;
  example: readonly string[];
  rules: readonly string[];
};

const tr = {
  overview: {
    title: "İş yönetimi",
    meaning:
      "Bir işin sorumlusunu, teslim tarihini, ilerlemesini ve kanıtlarını aynı kayıtta takip edebilirsiniz. Müşteri veya acenta bağlantısı zorunlu değildir.",
    example: [
      "Operasyon ekibi için ‘Teslimat hazırlığı’ adlı bir iş projesi oluşturun ve ekibi üye olarak ekleyin.",
      "‘Daire teslim dosyasını hazırla’ işini açın; sorumlu, son tarih ve tahmini süre belirleyin.",
      "Evrak kontrollerini kontrol listesine, ayrı sorumlusu olan işleri alt görevlere ekleyin. Dosyaları ve harcanan süreyi kaydedip iş bitince tamamlayın.",
    ],
    rules: [
      "Bu örnekler açıklama amaçlıdır; otomatik kayıt oluşturmaz.",
      "Kayıtlar ve işlemler kullanıcının erişim yetkisine göre görünür.",
      "Bu modülde otomatik tekrarlayan iş veya son tarih hatırlatma zamanlayıcısı yoktur.",
    ],
  },
  scopes: {
    title: "Hangi işler gösteriliyor?",
    meaning:
      "Üstteki seçimler aynı iş kayıtlarını farklı kapsamlarla gösterir; ayrı kopyalar oluşturmaz.",
    example: [
      "Size atanmış evrak kontrolü ‘İşlerim’de görünür.",
      "Sizin açıp başka birine atadığınız iş ‘Oluşturduklarım’da; takip ettiğiniz iş ‘Takip ettiklerim’de görünür.",
    ],
    rules: [
      "‘Tüm işler’ yalnızca erişebildiğiniz işleri kapsar, şirketin bütün kayıtlarını herkese açmaz.",
      "‘Projesiz işler’ bir iş projesine bağlı olmayan kayıtlardır; yalnızca sizin kayıtlarınız anlamına gelmez.",
      "Proje seçimi kapsamı o projeye değiştirir. Diğer filtreler bu kapsamı daraltır.",
    ],
  },
  projects: {
    title: "İş projeleri",
    meaning:
      "Bir ekibin ortak işlerini, üyelerini ve departmanını bir araya getirir. Buradaki iş projesi, CRM'deki gayrimenkul projesinden ayrıdır.",
    example: [
      "‘Teslimat hazırlığı’ projesine TES anahtarını ve Operasyon departmanını verin.",
      "Teknik kontrol ve evrak işleri aynı projede toplansın; işleri yürütecek kişileri üye olarak ekleyin.",
    ],
    rules: [
      "Anahtar 2–10 karakterdir; büyük harfle başlar, büyük harf ve rakam içerir.",
      "Departman seçimi o departmandaki herkese otomatik erişim vermez; üyelik ayrıca belirlenir.",
      "Bir iş oluşturulduktan sonra bağlı olduğu proje ve üst görev değiştirilemez.",
    ],
  },
  access: {
    title: "Üyeler, sorumlu ve erişim",
    meaning:
      "Proje üyeliği erişimi; işin sorumlusu ise işi kimin yürüteceğini belirler. Proje yöneticisi, sistemdeki yönetici rolüyle aynı şey değildir.",
    example: [
      "Ekip koordinatörünü proje yöneticisi, teknisyeni üye, yalnızca sonucu izleyecek kişiyi görüntüleyici yapın.",
      "Kontrol işini teknisyene atayın. Görüntüleyici işi okuyabilir ve takip edebilir, ancak düzenleyemez.",
    ],
    rules: [
      "Proje sahibi ve proje yöneticisi üyeleri yönetir. Üye işleri düzenler; görüntüleyici okur, indirir ve takip eder.",
      "ADMIN ve MANAGER tüm iş projelerine erişebilir ve yönetebilir; PREVIEW boş, salt okunur görünüm alır.",
      "Projeli işin sorumlusu aktif proje sahibi veya görüntüleyici olmayan aktif üye olmalıdır.",
      "Açık işi bulunan üye çıkarılamaz veya görüntüleyiciye düşürülemez; önce işleri yeniden atayın.",
    ],
  },
  task: {
    title: "İş kaydı ve açıklama",
    meaning:
      "Başlık beklenen sonucu, açıklama işin kapsamını ve kabul koşullarını anlatır. İş türü kayıtları sınıflandırır.",
    example: [
      "Başlık: ‘Teslim dosyasındaki eksik belgeleri tamamla’.",
      "Açıklama: ‘İmzalı tutanak ve sayaç fotoğrafları eklenecek; eksik belge kalmadığında incelemeye gönderilecek.’ Tür: Görev.",
    ],
    rules: [
      "Başlık zorunludur. Proje, sorumlu, tarihler ve CRM bağlantıları isteğe bağlıdır.",
      "Görev, hata, talep ve kilometre taşı türleri tek başına otomatik işlem başlatmaz.",
      "Başka biri kaydı değiştirdiyse eski sürümle kaydetme engellenir. Yenileyip güncel kayıt üzerinde değişiklik yapın.",
    ],
  },
  workflow: {
    title: "Durum ve tamamlanma kuralları",
    meaning:
      "Durum, işin şu an hangi aşamada olduğunu gösterir. İncelemede olmak tamamlandı demek değildir.",
    example: [
      "Evrak hazırlığı ‘Yapılacak’ olarak başlar, çalışma başlayınca ‘Devam ediyor’ olur.",
      "Dışarıdan belge bekleniyorsa ‘Engellendi’, kontrol bekleniyorsa ‘İncelemede’ seçilebilir. Kontroller bitince ‘Tamamlandı’ olur.",
    ],
    rules: [
      "Tamamlamak için kontrol listesi bitmiş; alt görevler ve engelleyen işler tamamlanmış veya iptal edilmiş olmalıdır.",
      "Engellendi durumu elle seçilir. Bağımlılık eklemek tarihi veya durumu otomatik değiştirmez.",
      "Tamamlanmış bir üst işi veya bağlı işi etkileyen kaydı yeniden açmadan önce ilgili tamamlanmış işi yeniden açın.",
      "İptal edilen iş, tamamlanan iş sayısına dahil değildir.",
    ],
  },
  priority: {
    title: "Öncelik",
    meaning:
      "Düşük, orta, yüksek ve acil seviyeleri, ekibin hangi işe önce odaklanması gerektiğini belirtir; teslim tarihinden bağımsızdır.",
    example: [
      "Yarın teslimi durduran elektrik arızasına ‘Acil’, gelecek ayki dosya düzenlemesine ‘Düşük’ verin.",
      "Acil işler filtresiyle o gün öncelikli ele alınacak kayıtları birlikte inceleyin.",
    ],
    rules: [
      "Öncelik yükseltmek tarihi değiştirmez veya otomatik bildirim takvimi oluşturmaz.",
      "Düşük öncelikli bir işin de son tarihi geçmiş olabilir.",
    ],
  },
  dates: {
    title: "Başlangıç ve son tarih",
    meaning:
      "Başlangıç planlanan başlangıcı, son tarih işin bitmesi beklenen zamanı belirtir. Bu tarihler harcanan süre değildir.",
    example: [
      "Teknik kontrolün başlangıcını 12 Eylül 09:00, son tarihini 14 Eylül 17:00 belirleyin.",
      "Son tarih geçip iş hâlâ açık kalırsa geciken işler arasında görünür. Yeni plan kesinleştiğinde tarihi elle güncelleyin.",
    ],
    rules: [
      "Tarihler isteğe bağlıdır; son tarih başlangıçtan önce olamaz.",
      "Son tarihi olmayan işler gecikmiş sayılmaz.",
      "Bağımlılıklar tarihleri otomatik ötelemez; tarih girmek otomatik hatırlatma oluşturmaz.",
    ],
  },
  labels: {
    title: "Etiketler",
    meaning:
      "Etiketler bir işin konusunu kısa ifadelerle belirtir; departman veya yetki değildir.",
    example: [
      "Bir teslim dosyasına ‘evrak, teslimat, kontrol’ etiketlerini ekleyin.",
      "Başka bir işte de ‘teslimat’ kullanarak aynı konudaki kayıtları görsel olarak ayırt edin.",
    ],
    rules: [
      "Etiketler formda virgülle ayrılarak girilir.",
      "Etiket eklemek kişilere erişim vermez ve işi başka projeye taşımaz.",
    ],
  },
  crm: {
    title: "İsteğe bağlı CRM bağlantıları",
    meaning:
      "İş gerçekten bir müşteri, acenta veya satış fırsatıyla ilgiliyse bağlantı ekleyebilirsiniz. Şirket içi işler bu bağlantılar olmadan da takip edilir.",
    example: [
      "Bir müşteriye ait evrak talebini ilgili müşteriyle ilişkilendirin.",
      "‘Depo sayımı’ gibi bir iç operasyon işinde CRM alanlarını boş bırakın.",
    ],
    rules: [
      "Aramada yalnızca erişim izniniz olan kayıtlar listelenir.",
      "Bağlantı eklemek müşteri veya acenta sahibini değiştirmez.",
      "Muhasebe rolünün iş formunda CRM bağlantısı seçimi gösterilmez.",
    ],
  },
  board: {
    title: "Pano",
    meaning:
      "Sütunlar iş durumlarını gösterir. Kartı başka sütuna taşımak, düzenleme yetkiniz varsa işin durumunu kaydeder.",
    example: [
      "Üzerinde çalışmaya başladığınız kartı ‘Yapılacak’tan ‘Devam ediyor’a taşıyın.",
      "Kontrol için ‘İncelemede’ye taşıyın; tüm zorunlu işler bitince ‘Tamamlandı’ya alın.",
    ],
    rules: [
      "Sürükleme kullanmadan iş detayındaki durum seçimiyle de aynı değişiklik yapılabilir.",
      "Kontrol listesi, alt görev ve bağımlılık kuralları panoda da geçerlidir; engellenen değişiklik kaydedilmez.",
      "Pano yüklenmiş kartları gösterir. Daha fazla kayıt yüklemek görünür kart sayısını artırır.",
    ],
  },
  list: {
    title: "Liste ve seçim",
    meaning:
      "Liste görünümü işleri satır satır karşılaştırmayı ve birden fazla iş üzerinde ortak değişiklik yapmayı sağlar.",
    example: [
      "Teknik kontrol işlerini sorumlu ve son tarihleriyle karşılaştırın.",
      "Aynı projedeki üç işi seçip toplu düzenleme ile yeni sorumluya atayın.",
    ],
    rules: [
      "Seçim yüklenmiş, seçilebilir satırlar üzerinde yapılır; henüz yüklenmemiş kayıtlar kendiliğinden seçilmez.",
      "Toplu düzenleme tek projeden en fazla 50 iş içindir.",
    ],
  },
  calendar: {
    title: "Takvim",
    meaning:
      "Tarihi olan yüklenmiş işleri takvimde gösterir. Bir iş son tarihinde; son tarihi yoksa başlangıcında görünür.",
    example: [
      "12 Eylül'de başlayıp 14 Eylül'de bitecek kontrol işi takvimde 14 Eylül'de görünür.",
      "Takvimdeki işe tıklayıp detayında tarihini veya durumunu düzenleyin.",
    ],
    rules: [
      "Tarihsiz işler takvimde görünmez.",
      "Takvim bir süre aralığı veya personelin müsaitlik takvimi değildir.",
      "Takvimde sürükleyerek tarih değiştirme yoktur. Daha fazla iş yüklemek takvime de kayıt ekler.",
    ],
  },
  timeline: {
    title: "Zaman çizelgesi",
    meaning:
      "Yüklenmiş işlerin başlangıç ve son tarihlerini seçilen ay içinde yatay çubuklarla gösterir.",
    example: [
      "12–14 Eylül teknik kontrolünü, 15–16 Eylül evrak hazırlığıyla yan yana karşılaştırın.",
      "Bir iş sonraki aya uzanıyorsa çubuğun kalan kısmını sonraki ayda görebilirsiniz.",
    ],
    rules: [
      "Çubuklar görünür ay aralığında kesilir; kayıt tarihleri değişmez.",
      "Tek tarihi olan iş o tarihte gösterilir. Tarihsiz iş çizelgede yer almaz.",
      "Bu görünüm otomatik kaynak planlaması veya bağımlılığa göre tarih ötelemesi yapmaz.",
    ],
  },
  reports: {
    title: "Rapor kapsamı ve durum dağılımı",
    meaning:
      "Rapor, erişebildiğiniz ve seçili filtrelere uyan tüm işlerden hesaplanır. Sadece ekrana yüklenen ilk sayfa ile sınırlı değildir.",
    example: [
      "Projede filtreye uyan 120 iş, listede yüklenmiş 100 kart varsa rapor 120 işi kapsar.",
      "Durum dağılımında her iş kendi durumunda bir kez sayılır. Alt görevler de ayrı iş kayıtlarıdır.",
    ],
    rules: [
      "Proje, kişi, durum, öncelik ve tarih filtreleri rapor sonuçlarını değiştirir.",
      "Rapor mevcut kayıtların durumunu gösterir; geçmiş bir tarihteki durumun anlık görüntüsü değildir.",
      "Tamamlandı ve iptal ayrı kategorilerdir.",
    ],
  },
  filters: {
    title: "Filtreler ve arşiv kapsamı",
    meaning:
      "Filtreler birlikte uygulanır. Her ek seçim mevcut kapsamı daraltır.",
    example: [
      "Operasyon projesi + belirli sorumlu + yüksek öncelik seçimi, üçünün birden koşulunu sağlayan işleri getirir.",
      "Gecikenler filtresiyle son tarihi geçmiş ama bitmemiş işleri inceleyin.",
    ],
    rules: [
      "Arama başlık ve açıklamada yapılır.",
      "Tarih filtreleri işin son tarihini kullanır; süre kaydının çalışma tarihini kullanmaz.",
      "Bugün ve gelecek 7 gün hesabı sunucunun gün sınırlarına göredir.",
      "Arşiv seçildiğinde normal listeye ekleme yapılmaz; arşivlenmiş işler veya arşivlenmiş projelerin işleri gösterilir.",
    ],
  },
  open: {
    title: "Açık iş sayısı",
    meaning:
      "Seçili kapsamda henüz tamamlanmamış ve iptal edilmemiş işlerin toplamıdır.",
    example: [
      "10 işin 3'ü tamamlandı, 1'i iptal edildiyse açık iş sayısı 10 − 3 − 1 = 6'dır.",
    ],
    rules: [
      "Yapılacak, devam ediyor, engellendi ve incelemede olan işler dahildir.",
      "Filtreye uyan tüm işler sayılır; yüklenmiş kart sayısıyla sınırlı değildir.",
    ],
  },
  overdue: {
    title: "Geciken iş sayısı",
    meaning:
      "Son tarihi şu andan önce olan ve hâlâ açık duran işlerin sayısıdır.",
    example: [
      "Dün 17:00'de bitmesi gereken kontrol hâlâ incelemedeyse gecikmiş sayılır.",
      "Aynı iş tamamlandığında, son tarihi geçmiş olsa bile gecikenler sayısından çıkar.",
    ],
    rules: [
      "Tamamlanan, iptal edilen ve son tarihi olmayan işler dahil edilmez.",
      "Gecikme bir günün bitmesini değil, kayıttaki tarih ve saatin geçmesini esas alır.",
    ],
  },
  review: {
    title: "İncelemedeki işler",
    meaning:
      "Durumu ‘İncelemede’ olan işlerin sayısıdır. Ayrıca açık iş sayısına da dahildir.",
    example: [
      "Hazırlanan teslim dosyası koordinatör kontrolündeyse ‘İncelemede’ seçin.",
      "Kontrol olumlu sonuçlandığında ve eksikler kapandığında işi tamamlayın.",
    ],
    rules: [
      "İnceleme durumu kendi başına ayrı bir onay ataması veya otomatik onay akışı oluşturmaz.",
      "Son tarihi geçen inceleme işleri gecikenler sayısına da girebilir.",
    ],
  },
  completed: {
    title: "Tamamlanan iş sayısı",
    meaning:
      "Seçili kapsamda şu an ‘Tamamlandı’ durumunda bulunan işlerin sayısıdır.",
    example: [
      "5 iş tamamlandı, 2 iş iptal edildiyse tamamlanan sayı 5'tir, 7 değildir.",
    ],
    rules: [
      "Bu sayı seçilen günlerde tamamlanan iş sayısı değildir; tarih filtresi son tarihe uygulanır.",
      "İş yeniden açılırsa tamamlananlar sayısından çıkar.",
    ],
  },
  bulk: {
    title: "Toplu düzenleme",
    meaning:
      "Seçtiğiniz işlerin durumunu, önceliğini veya sorumlusunu tek işlemle değiştirebilirsiniz.",
    example: [
      "Aynı projedeki üç açık işi seçin. Sorumluyu yeni ekip üyesi olarak belirleyip uygulayın.",
      "Yalnızca sorumlu alanını değiştirirseniz işlerin mevcut durum ve öncelikleri korunur.",
    ],
    rules: [
      "1–50 iş seçilebilir; hepsi aynı projede veya hepsi projesiz olmalıdır.",
      "Her iş için düzenleme yetkisi, güncel sürüm ve tamamlanma koşulları kontrol edilir.",
      "Bir kayıt bile kontrolleri geçemezse hiçbirine değişiklik uygulanmaz. Hatalı kaydı düzeltip yeniden deneyin.",
    ],
  },
  export: {
    title: "CSV dışa aktarımı",
    meaning:
      "Seçili filtrelere uyan erişilebilir işleri elektronik tabloda incelemek için dışa aktarır.",
    example: [
      "Operasyon ve gecikenler filtrelerini seçip CSV indirin.",
      "İndirdiğiniz dosyada sorumlu ve son tarihlere göre toplantı listenizi düzenleyin.",
    ],
    rules: [
      "Yalnızca seçili satırlar değil, filtreye uyan tüm sayfalar alınır.",
      "Dosyada yapılan değişiklikler CRM kayıtlarına geri yazılmaz.",
      "İndirilen dosyayı yalnızca yetkili kişilerle paylaşın.",
    ],
  },
  checklist: {
    title: "Kontrol listesi",
    meaning:
      "Bir işin tamamlanması için gereken küçük kontrolleri tutar. Ayrı sorumlu ve tarih gerektiren adımlar için alt görev daha uygundur.",
    example: [
      "‘İmzalı tutanak eklendi’, ‘Sayaç fotoğrafı eklendi’ ve ‘İletişim bilgileri doğrulandı’ maddelerini oluşturun.",
      "İki madde bittiğinde ilerleme 2/3 olur. Son madde de bitmeden iş tamamlanamaz.",
    ],
    rules: [
      "İşin tamamlanması için kontrol listesindeki tüm maddeler işaretli olmalıdır.",
      "Bir maddeyi işaretlemek üst işin durumunu kendiliğinden tamamlandı yapmaz.",
    ],
  },
  subtasks: {
    title: "Alt görevler",
    meaning:
      "Bir ana işi, ayrı sorumlusu ve tarihi olan daha küçük işlere ayırır.",
    example: [
      "‘Teslimata hazırlan’ ana işinin altında ‘Teknik kontrol’ ve ‘Evrak hazırlığı’ açın.",
      "Teknik ekibe kontrolü, operasyon ekibine evrakı atayın. Her alt görev kendi durumuyla takip edilir.",
    ],
    rules: [
      "Tek seviye alt görev desteklenir; alt görevin altına yeni seviye eklenmez.",
      "Alt görev ana işle aynı projede kalır; üst görev bağlantısı sonradan değişmez.",
      "Ana işi tamamlamak için alt görevler tamamlanmış veya iptal edilmiş olmalıdır.",
    ],
  },
  dependencies: {
    title: "Bağımlılıklar",
    meaning:
      "Bir işin tamamlanmasının başka bir işin çözülmesine bağlı olduğunu belirtir. ‘Engelleyen işler’ önce çözülmesi gerekenlerdir.",
    example: [
      "‘Duvarı boya’ işine ‘Su kaçağını gider’ işini engelleyen iş olarak ekleyin.",
      "Kaçak işi açıkken boya işi tamamlanamaz. Kaçak tamamlanır veya iptal edilirse bu engel çözülür.",
    ],
    rules: [
      "Bağımlılıklar aynı proje içindedir; projesiz işler yalnızca projesiz işlerle bağlanır.",
      "Kendi kendini veya birbirini döngü halinde bekleyen bağlantılar engellenir.",
      "Bağımlılık tarihleri kaydırmaz; başlangıç ve son tarih ayrıca planlanır.",
      "Engelleyeni yeniden açmak için tamamlanmış bağlı işler önce yeniden açılmalıdır.",
    ],
  },
  files: {
    title: "Dosyalar ve kanıtlar",
    meaning:
      "İşin çıktısı, kontrol fotoğrafı veya onay belgesi gibi dosyaları iş kaydına ekler.",
    example: [
      "Teknik kontrol işine kontrol fotoğrafını, teslim dosyasına imzalı PDF'yi yükleyin.",
      "Yetkili ekip üyeleri dosyayı iş detayından indirebilir.",
    ],
    rules: [
      "Dosya başına en fazla 5 MB; iş başına 10 dosya ve toplam 20 MB.",
      "PDF, PNG, JPEG, DOCX, XLSX, TXT ve CSV kabul edilir.",
      "İndirme için iş erişimi yeniden kontrol edilir; dosyalar herkese açık bağlantı değildir.",
      "Silme, gerekli düzenleme yetkisiyle dosyayı ekleyen kişi veya ADMIN/MANAGER tarafından yapılabilir.",
    ],
  },
  comments: {
    title: "Yorumlar",
    meaning:
      "İşe ait kararları, soruları ve gelişmeleri ekip için kayıt altına alır. Açıklamayı değiştirmeden güncelleme paylaşabilirsiniz.",
    example: [
      "‘İmzalı tutanak bekleniyor; operasyon ekibiyle görüşüldü’ yorumunu ekleyin.",
      "Belge geldiğinde yeni yorumla sonucu bildirin ve gerekiyorsa dosyayı ekleyin.",
    ],
    rules: [
      "Yorum eklemek iş durumunu veya son tarihini değiştirmez.",
      "Yorum düzenleme ve silme, gerekli iş yetkisiyle yazarı veya ADMIN/MANAGER tarafından yapılabilir.",
      "Değişiklikler etkinlik geçmişinde izlenir.",
    ],
  },
  time: {
    title: "Tahmini ve harcanan süre",
    meaning:
      "Tahmin planladığınız eforu, süre kayıtları gerçekten çalışıldığı bildirilen dakikaları gösterir. Otomatik kronometre yoktur.",
    example: [
      "Bir kontrol için tahmini süreyi 120 dakika girin.",
      "İlk gün 45, ikinci gün 60 dakika kaydederseniz toplam 105 dakika görünür; tahminden 15 dakika azdır.",
    ],
    rules: [
      "Her süre kaydı 1–1440 dakika arasındadır; bu sınır günlük toplam sınırı değildir.",
      "Süre kaydına çalışma tarihi ve not eklenebilir. Süre eklemek işi tamamlamaz.",
      "Rapor seçili işlerin tüm süre kayıtlarını toplar; son tarih filtresi çalışma tarihine uygulanmaz.",
      "Süre kayıtlarını gerekli düzenleme yetkisiyle yazarı veya ADMIN/MANAGER değiştirebilir.",
    ],
  },
  activity: {
    title: "Etkinlik geçmişi",
    meaning:
      "İş üzerinde kimin, ne zaman, hangi değişikliği yaptığını gösterir. Mevcut olduğunda eski ve yeni değerler de yer alır.",
    example: [
      "Son tarih 14 Eylül'den 16 Eylül'e taşınırsa tarih değişikliğini ve işlemi yapan kişiyi geçmişte inceleyin.",
      "Sorumlu, durum, yorum ve dosya işlemlerini aynı işin geçmişinden takip edin.",
    ],
    rules: [
      "Geçmiş bir kaydı görüntülemek değişikliği geri almaz.",
      "Eski sistemden gelen bazı kayıtlarda önceki değer bulunmayabilir; eksik bilgi uydurulmaz.",
      "Daha eski etkinlikler ek sayfalar halinde yüklenebilir.",
    ],
  },
  following: {
    title: "İşi takip etme",
    meaning:
      "Sorumlusu olmadığınız ama erişebildiğiniz bir işin gelişmelerini takip edebilirsiniz.",
    example: [
      "Ekip koordinatörü olarak teknik kontrol işini takip edin.",
      "İş üzerinde değişiklik olduğunda uygulama içi bildirimlerden haberdar olun; kayıt ‘Takip ettiklerim’de de görünür.",
    ],
    rules: [
      "Takip etmek düzenleme yetkisi vermez ve işin sorumlusunu değiştirmez.",
      "Bildirimler oluşturucu, sorumlu ve takipçiler için güncel erişim kontrolünden geçer.",
      "Bu takip uygulama içi bildirimdir; otomatik e-posta veya son tarih hatırlatıcısı değildir.",
    ],
  },
  archive: {
    title: "Arşivleme",
    meaning:
      "Biten işleri günlük çalışma listesinden ayırır; kayıtları kalıcı olarak silmez.",
    example: [
      "Tamamlanan teslim hazırlığını arşivleyin. Eski kayda ihtiyaç duyunca arşiv filtresinden bulun.",
      "Tekrar kullanılacaksa yetkinizle arşivden geri alın.",
    ],
    rules: [
      "İş önce tamamlanmalı veya iptal edilmelidir; alt görevler üst görevden önce arşivlenir.",
      "Arşivlenmiş projeler geri alınana kadar salt okunurdur.",
      "Arşivleme yetkisi ayrı kontrol edilir; işi görebilmek arşivleme hakkı vermez.",
    ],
  },
  workload: {
    title: "Kişi bazında iş yükü",
    meaning:
      "Filtreye uyan işleri sorumluya göre toplar. Açık ve tamamlanan iş sayıları ile tahmini eforu karşılaştırır.",
    example: [
      "Bir kişide 4 açık, 2 tamamlanan iş varsa iki sayı ayrı gösterilir.",
      "Filtredeki 6 işin tahminleri toplam 300 dakika ise 5 saat görünür; bu kişinin yalnızca kalan işi demek değildir.",
    ],
    rules: [
      "Açık sayısına tamamlanan ve iptal edilenler girmez.",
      "Tahmini süre toplamı filtredeki tüm durumları kapsar; tamamlanmış ve iptal edilmiş işler de dahil olabilir.",
      "Atanmayan işler ayrı gruptur. Bu rapor mesai kapasitesi veya otomatik iş dağıtımı hesaplamaz.",
    ],
  },
  upcoming: {
    title: "Son tarih sıralaması",
    meaning:
      "Son tarihi olan açık işleri en erken son tarihten başlayarak listeler. Geçmiş tarihli açık işler de burada yer alır.",
    example: [
      "Dün bitmesi gereken kontrol, yarın bitecek evrak hazırlığından önce görünür.",
      "Satıra tıklayıp iş detayında planı, sorumluyu veya durumu güncelleyin.",
    ],
    rules: [
      "Filtreye uyan ilk 20 tarihli açık iş gösterilir.",
      "Tamamlanmış, iptal edilmiş ve son tarihsiz işler bu listeye dahil değildir.",
    ],
  },
} satisfies Record<string, WorkHelpArticle>;

export type WorkHelpTopic = keyof typeof tr;

const en: Record<WorkHelpTopic, WorkHelpArticle> = {
  overview: {
    title: "Work management",
    meaning:
      "Keep responsibility, deadlines, progress and evidence in one work record. A customer or agency link is not required.",
    example: [
      "Create a ‘Handover preparation’ work project and add the operations team as members.",
      "Create ‘Prepare the handover file’, assign a person, and set a deadline and estimated effort.",
      "Add document checks to the checklist and separately assigned work as subtasks. Record files and time, then complete the work.",
    ],
    rules: [
      "These examples are illustrative; they do not create records.",
      "Visible records and available actions depend on access permissions.",
      "Automatic recurring tasks and scheduled deadline reminders are not enabled.",
    ],
  },
  scopes: {
    title: "Which work is shown?",
    meaning:
      "The top selections show different scopes of the same work records, not separate copies.",
    example: [
      "A document check assigned to you appears in ‘My work’.",
      "Work you created for someone else appears in ‘Created by me’; work you follow appears in ‘Following’.",
    ],
    rules: [
      "‘All work’ means all work you can access, not unrestricted company data.",
      "‘Unprojected work’ means records without a work project, not necessarily records owned by you.",
      "Selecting a project changes the scope to that project. Other filters narrow it further.",
    ],
  },
  projects: {
    title: "Work projects",
    meaning:
      "Group a team's work, members and department. A work project is separate from a property development project in the CRM.",
    example: [
      "Create ‘Handover preparation’ with the key HAND and the Operations department.",
      "Group technical checks and document preparation in this project, then add the people doing the work as members.",
    ],
    rules: [
      "Keys contain 2–10 uppercase letters or digits and start with a letter.",
      "A department does not automatically grant access to its staff; membership is assigned separately.",
      "A task's project and parent cannot be changed after creation.",
    ],
  },
  access: {
    title: "Members, assignees and access",
    meaning:
      "Project membership determines access; the assignee identifies who does the work. A project lead is different from a system manager role.",
    example: [
      "Make the coordinator a project lead, the technician a member and the observer a viewer.",
      "Assign the check to the technician. The viewer can read and follow it, but cannot edit it.",
    ],
    rules: [
      "Owners and project leads manage membership. Members edit work; viewers read, download and follow.",
      "ADMIN and MANAGER can access and manage all work projects. PREVIEW receives an empty, read-only view.",
      "Project tasks can be assigned to an active project owner or active non-viewer member.",
      "Members with open assignments cannot be removed or changed to viewers; reassign their work first.",
    ],
  },
  task: {
    title: "Work record and description",
    meaning:
      "The title names the expected outcome; the description defines scope and acceptance conditions. The type classifies the record.",
    example: [
      "Title: ‘Complete missing handover documents’.",
      "Description: ‘Attach the signed form and meter photos; send for review when all documents are present.’ Type: Task.",
    ],
    rules: [
      "A title is required. Project, assignee, dates and CRM links are optional.",
      "Task, bug, request and milestone types do not trigger automation by themselves.",
      "If someone else changed the record, a stale save is blocked. Refresh and apply changes to the current version.",
    ],
  },
  workflow: {
    title: "Status and completion rules",
    meaning:
      "Status describes the current stage. Work in review is not completed work.",
    example: [
      "Document preparation starts as ‘To do’, then moves to ‘In progress’ when work begins.",
      "Use ‘Blocked’ while waiting for an external document and ‘In review’ while checking it. Complete the task when the checks are finished.",
    ],
    rules: [
      "Completion requires a finished checklist and completed or cancelled subtasks and blocking tasks.",
      "Blocked is a manually selected status. Adding dependencies does not change status or dates automatically.",
      "Before reopening work that supports a completed parent or dependent task, reopen that completed work first.",
      "Cancelled tasks are not counted as completed.",
    ],
  },
  priority: {
    title: "Priority",
    meaning:
      "Low, medium, high and urgent indicate what needs attention first. Priority is separate from the deadline.",
    example: [
      "Mark an electrical fault blocking tomorrow's handover as urgent; mark next month's filing work as low.",
      "Filter urgent work to review what the team should address first.",
    ],
    rules: [
      "Increasing priority does not change the deadline or schedule reminders.",
      "Low-priority work can still be overdue.",
    ],
  },
  dates: {
    title: "Start and due dates",
    meaning:
      "Start is the planned beginning; due is when work should finish. Neither is the amount of time spent working.",
    example: [
      "Plan a technical check from 12 September at 09:00 to 14 September at 17:00.",
      "If it remains open after the deadline, it becomes overdue. Update the date manually when the new plan is agreed.",
    ],
    rules: [
      "Dates are optional; due cannot be before start.",
      "Work without a due date is not counted as overdue.",
      "Dependencies do not shift dates, and setting a date does not create an automatic reminder.",
    ],
  },
  labels: {
    title: "Labels",
    meaning:
      "Labels describe a work item's subject. They are not departments or permissions.",
    example: [
      "Add ‘documents, handover, inspection’ to a handover task.",
      "Use ‘handover’ on another task to visually identify related work.",
    ],
    rules: [
      "Enter labels separated by commas in the form.",
      "Labels do not grant access or move work to a different project.",
    ],
  },
  crm: {
    title: "Optional CRM links",
    meaning:
      "Link work to a customer, agency or lead when relevant. Internal company work can be tracked without these links.",
    example: [
      "Link a document request to the relevant customer.",
      "Leave CRM links empty for internal work such as ‘Count warehouse stock’.",
    ],
    rules: [
      "Reference searches only return records you are allowed to access.",
      "Linking a record does not change the customer or agency owner.",
      "CRM link selection is not shown in the accounting role's work form.",
    ],
  },
  board: {
    title: "Board",
    meaning:
      "Columns represent statuses. Moving a card to another column saves its status when you have permission to edit.",
    example: [
      "Move work from ‘To do’ to ‘In progress’ when you start it.",
      "Move it to ‘In review’ for checking, then ‘Done’ once the required work is finished.",
    ],
    rules: [
      "The status selector in task details offers the same change without dragging.",
      "Checklist, subtask and dependency rules also apply on the board; blocked changes are not saved.",
      "The board shows loaded cards. Loading more records adds more visible cards.",
    ],
  },
  list: {
    title: "List and selection",
    meaning:
      "Compare work row by row and select multiple tasks for a shared change.",
    example: [
      "Compare technical checks by assignee and due date.",
      "Select three tasks in the same project and bulk-assign them to a new person.",
    ],
    rules: [
      "Selection applies to loaded, selectable rows; unloaded records are not automatically selected.",
      "Bulk editing supports up to 50 tasks from one project.",
    ],
  },
  calendar: {
    title: "Calendar",
    meaning:
      "Shows loaded work with dates. A task appears on its due date, or on its start date if no due date exists.",
    example: [
      "A check starting on 12 September and due on 14 September appears on 14 September.",
      "Open the task from the calendar to edit its date or status in the detail view.",
    ],
    rules: [
      "Tasks with no dates do not appear.",
      "This is not a duration-range or staff-availability calendar.",
      "Dragging to reschedule is not enabled. Loading more tasks also adds calendar entries.",
    ],
  },
  timeline: {
    title: "Timeline",
    meaning:
      "Displays start-to-due ranges for loaded work as horizontal bars within the selected month.",
    example: [
      "Compare a technical check on 12–14 September with document preparation on 15–16 September.",
      "For work continuing into the next month, view the remaining bar in that month.",
    ],
    rules: [
      "Bars are clipped to the visible month; record dates are unchanged.",
      "Work with one date appears on that date. Undated work is omitted.",
      "This view does not allocate resources or automatically reschedule dependencies.",
    ],
  },
  reports: {
    title: "Report scope and status distribution",
    meaning:
      "Reports aggregate all accessible work matching the current filters, not just the first loaded page.",
    example: [
      "If 120 tasks match but only 100 cards are loaded, the report still covers 120 tasks.",
      "Each record is counted once in its current status. Subtasks are separate work records.",
    ],
    rules: [
      "Project, person, status, priority and date filters change report results.",
      "Reports show current record states, not a historical snapshot of a past date.",
      "Completed and cancelled are separate categories.",
    ],
  },
  filters: {
    title: "Filters and archive scope",
    meaning:
      "Filters work together. Each selection further narrows the current scope.",
    example: [
      "Operations project + a specific assignee + high priority returns tasks meeting all three conditions.",
      "Use overdue to review work that is late and still unfinished.",
    ],
    rules: [
      "Search matches titles and descriptions.",
      "Date filters use the task's due date, not a time entry's work date.",
      "Today and the next 7 days use the server's day boundaries.",
      "Archive selection replaces the normal scope with archived tasks or tasks in archived projects; it does not add them to the active list.",
    ],
  },
  open: {
    title: "Open work count",
    meaning:
      "The number of matching tasks that are neither completed nor cancelled.",
    example: [
      "With 10 tasks, 3 completed and 1 cancelled, open work is 10 − 3 − 1 = 6.",
    ],
    rules: [
      "To do, in progress, blocked and in review are included.",
      "All matching records count, not just loaded cards.",
    ],
  },
  overdue: {
    title: "Overdue count",
    meaning: "Open tasks whose due date and time are earlier than now.",
    example: [
      "A check due yesterday at 17:00 is overdue if it is still in review.",
      "Once completed, it leaves the overdue count even though its due date is in the past.",
    ],
    rules: [
      "Completed, cancelled and undated tasks are excluded.",
      "The saved date and time determine lateness; it does not wait until the end of the day.",
    ],
  },
  review: {
    title: "Work in review",
    meaning:
      "Tasks currently marked ‘In review’. They are also part of the open count.",
    example: [
      "Mark a prepared handover file ‘In review’ while the coordinator checks it.",
      "Complete it once the check passes and outstanding items are resolved.",
    ],
    rules: [
      "This status does not assign a separate approver or launch an approval workflow.",
      "Review tasks with past deadlines can also be overdue.",
    ],
  },
  completed: {
    title: "Completed count",
    meaning: "The number of matching tasks currently marked ‘Done’.",
    example: [
      "If 5 tasks are done and 2 are cancelled, the completed count is 5, not 7.",
    ],
    rules: [
      "This is not a count of tasks completed during the selected dates; date filters use due dates.",
      "Reopening a task removes it from the completed count.",
    ],
  },
  bulk: {
    title: "Bulk editing",
    meaning:
      "Change the status, priority or assignee of selected tasks in one operation.",
    example: [
      "Select three open tasks in the same project, choose the new team member as assignee and apply.",
      "Changing only the assignee preserves their existing status and priority.",
    ],
    rules: [
      "Select 1–50 tasks, all in the same project or all unprojected.",
      "Every task is checked for edit permission, current version and completion requirements.",
      "If any task fails validation, none are changed. Resolve the issue before trying again.",
    ],
  },
  export: {
    title: "CSV export",
    meaning:
      "Export accessible work matching the current filters for spreadsheet review.",
    example: [
      "Select Operations and overdue, then download a CSV.",
      "Arrange the downloaded rows by assignee and due date for a team meeting.",
    ],
    rules: [
      "All matching pages are exported, not just selected rows.",
      "Changes to the downloaded file do not update CRM records.",
      "Share the file only with authorised people.",
    ],
  },
  checklist: {
    title: "Checklist",
    meaning:
      "Track small checks required to finish a task. Use subtasks for steps needing their own assignee or deadline.",
    example: [
      "Add ‘Signed form attached’, ‘Meter photo attached’ and ‘Contact details verified’.",
      "When two are checked, progress is 2/3. The task cannot be completed until the last check is finished.",
    ],
    rules: [
      "All checklist entries must be checked before completing the task.",
      "Checking an entry does not automatically mark the task done.",
    ],
  },
  subtasks: {
    title: "Subtasks",
    meaning:
      "Split a parent task into smaller work records with their own assignees and dates.",
    example: [
      "Under ‘Prepare for handover’, create ‘Technical inspection’ and ‘Document preparation’.",
      "Assign inspection to technical staff and documents to operations. Track each subtask separately.",
    ],
    rules: [
      "Only one subtask level is supported; subtasks cannot have another level beneath them.",
      "Subtasks stay in the parent's project; the parent link cannot be changed later.",
      "Subtasks must be completed or cancelled before the parent can be completed.",
    ],
  },
  dependencies: {
    title: "Dependencies",
    meaning:
      "Declare that completing one task requires another to be resolved. ‘Blocked by’ lists work that must be resolved first.",
    example: [
      "Add ‘Repair water leak’ as a blocker of ‘Paint the wall’.",
      "Painting cannot be completed while the leak task is open. Completing or cancelling the leak task resolves this blocker.",
    ],
    rules: [
      "Dependencies stay within one project; unprojected tasks link only to unprojected tasks.",
      "Self-links and circular waiting chains are rejected.",
      "Dependencies do not shift dates; plan start and due dates separately.",
      "Before reopening a blocker, reopen any completed dependent work first.",
    ],
  },
  files: {
    title: "Files and evidence",
    meaning:
      "Attach work outputs, inspection photos or signed evidence to the record.",
    example: [
      "Upload an inspection photo to the technical check and the signed PDF to the handover task.",
      "Authorised team members can download these from task details.",
    ],
    rules: [
      "Maximum 5 MB per file, 10 files and 20 MB total per task.",
      "PDF, PNG, JPEG, DOCX, XLSX, TXT and CSV are supported.",
      "Downloads recheck task access; files are not public links.",
      "Removal requires edit access and either file authorship or ADMIN/MANAGER permissions.",
    ],
  },
  comments: {
    title: "Comments",
    meaning:
      "Record decisions, questions and progress for the team without replacing the task description.",
    example: [
      "Post ‘Waiting for the signed form; operations has been contacted’.",
      "When the document arrives, post the outcome and attach the file if needed.",
    ],
    rules: [
      "Posting a comment does not change status or due date.",
      "Editing and removal require work permissions and either authorship or ADMIN/MANAGER access.",
      "Changes are tracked in activity history.",
    ],
  },
  time: {
    title: "Estimated and logged time",
    meaning:
      "Estimates describe planned effort. Time entries record reported working minutes; there is no automatic stopwatch.",
    example: [
      "Estimate 120 minutes for an inspection.",
      "Log 45 minutes on the first day and 60 on the second: total 105 minutes, 15 less than estimated.",
    ],
    rules: [
      "Each entry accepts 1–1440 minutes; this is not a daily total limit.",
      "Entries include a work date and optional note. Logging time does not complete the task.",
      "Reports sum all time entries for matching tasks; due-date filters do not filter work dates.",
      "Editing requires work permissions and either entry authorship or ADMIN/MANAGER access.",
    ],
  },
  activity: {
    title: "Activity history",
    meaning:
      "Shows who changed work, when and what changed. Previous and new values appear when available.",
    example: [
      "When a deadline moves from 14 to 16 September, review the change and its author here.",
      "Follow assignment, status, comment and file operations in the same task's history.",
    ],
    rules: [
      "Viewing an activity entry does not undo it.",
      "Some legacy records have no previous value; missing history is not invented.",
      "Older entries can be loaded in additional pages.",
    ],
  },
  following: {
    title: "Following work",
    meaning:
      "Stay informed about accessible work even when you are not its assignee.",
    example: [
      "As coordinator, follow the technical inspection task.",
      "Receive in-app change notifications and find the task under ‘Following’.",
    ],
    rules: [
      "Following does not grant edit access or change the assignee.",
      "Notifications for creators, assignees and followers are filtered by current access.",
      "These are in-app notifications, not automatic emails or deadline reminders.",
    ],
  },
  archive: {
    title: "Archiving",
    meaning:
      "Remove finished work from daily lists without permanently deleting its records.",
    example: [
      "Archive a completed handover task, then use the archive filter when you need its history.",
      "Restore it with the appropriate permissions when needed.",
    ],
    rules: [
      "Work must be completed or cancelled first; archive children before their parent.",
      "Archived projects remain read-only until restored.",
      "Archive permissions are checked separately; viewing work does not grant the right to archive it.",
    ],
  },
  workload: {
    title: "Workload by person",
    meaning:
      "Groups matching tasks by assignee to compare open work, completed work and estimated effort.",
    example: [
      "A person with 4 open and 2 completed tasks has those counts shown separately.",
      "If all 6 estimates total 300 minutes, the estimate shows 5 hours; this is not just remaining effort.",
    ],
    rules: [
      "Open excludes completed and cancelled work.",
      "Estimated time covers all filtered statuses, which can include completed and cancelled tasks.",
      "Unassigned tasks are a separate group. This does not calculate staff capacity or automatically distribute work.",
    ],
  },
  upcoming: {
    title: "Due-date order",
    meaning:
      "Lists dated open work from the earliest due date. Overdue work is included, not only future deadlines.",
    example: [
      "An inspection due yesterday appears before document preparation due tomorrow.",
      "Open a row to update the plan, assignee or status in task details.",
    ],
    rules: [
      "Shows the first 20 matching open tasks with due dates.",
      "Completed, cancelled and undated work are excluded.",
    ],
  },
};

export const workHelp: Record<
  "tr" | "en",
  Record<WorkHelpTopic, WorkHelpArticle>
> = { tr, en };
