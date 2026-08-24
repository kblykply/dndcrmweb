import type { QualityLocale } from "@/lib/qualityPolicy";

export type Iso9001Clause = {
  code: string;
  title: Record<QualityLocale, string>;
  points: Record<QualityLocale, string[]>;
  evidence?: Record<QualityLocale, string[]>;
};

export type Iso9001FoundationSection = {
  code: string;
  title: Record<QualityLocale, string>;
  points: Record<QualityLocale, string[]>;
};

const localeList = (tr: string[], en: string[]) => ({ tr, en });

const clause = (
  code: string,
  trTitle: string,
  enTitle: string,
  trPoints: string[],
  enPoints: string[],
  trEvidence?: string[],
  enEvidence?: string[],
): Iso9001Clause => ({
  code,
  title: { tr: trTitle, en: enTitle },
  points: localeList(trPoints, enPoints),
  ...(trEvidence && enEvidence ? { evidence: localeList(trEvidence, enEvidence) } : {}),
});

export const ISO9001_GUIDE_COPY = {
  tr: {
    eyebrow: "Sabit standart rehberi",
    title: "ISO 9001:2015 gereklilikleri",
    description:
      "Bu içerik TS EN ISO 9001:2015'in madde yapısı esas alınarak hazırlanmış ayrıntılı uygulama özetidir. Kart bilgilerinden bağımsızdır ve düzenlenemez.",
    source: "Kapsam: TS EN ISO 9001:2015, Madde 4-10",
    evidence: "Beklenen dokümante bilgi ve kanıt",
    implementationSummary: "Uygulama özeti",
    licensedText: "Lisanslı dokümandaki madde metni",
    originalLanguage: "Özgün dil: Türkçe",
    figureTranscription: "Şekil içeriğinin metinsel aktarımı",
    openAll: "Tümünü aç",
    closeAll: "Tümünü kapat",
    framework: "Standardın uygulama çerçevesi",
    frameworkDescription:
      "Giriş, kapsam ve temel kavramların uygulamaya dönük özeti. Kaynakça ve yayın bilgileri dahil edilmemiştir.",
    noClauses: "Bu özel kart için doğrudan bir ISO 9001 madde eşleşmesi bulunmuyor.",
  },
  en: {
    eyebrow: "Fixed standard guide",
    title: "ISO 9001:2015 requirements",
    description:
      "This is a detailed implementation summary based on the clause structure of TS EN ISO 9001:2015. It is independent from editable card data and cannot be changed.",
    source: "Coverage: TS EN ISO 9001:2015, Clauses 4-10",
    evidence: "Expected documented information and evidence",
    implementationSummary: "Implementation summary",
    licensedText: "Clause text from the licensed document",
    originalLanguage: "Original language: Turkish",
    figureTranscription: "Text transcription of figure content",
    openAll: "Expand all",
    closeAll: "Collapse all",
    framework: "Implementation framework of the standard",
    frameworkDescription:
      "An implementation-oriented summary of the introduction, scope and core concepts. Bibliography and publication metadata are excluded.",
    noClauses: "No direct ISO 9001 clause mapping is available for this custom card.",
  },
} as const;

export const ISO9001_FOUNDATION: Iso9001FoundationSection[] = [
  {
    code: "0.1",
    title: { tr: "Genel yaklaşım", en: "General approach" },
    points: localeList(
      [
        "Kalite yönetim sistemi kurmak, kuruluşun genel performansını geliştirmeye ve sürdürülebilir çalışmasına yardımcı olan stratejik bir karardır.",
        "Başlıca beklenen faydalar; uygun ürün ve hizmeti sürekli sunmak, müşteri memnuniyetini artırmak, bağlam ve hedeflerle bağlantılı risk ve fırsatları ele almak ve sistem şartlarına uygunluğu gösterebilmektir.",
        "Standart; bütün kuruluşlarda aynı doküman yapısının, aynı madde sıralamasının veya aynı terminolojinin kullanılmasını zorunlu kılmaz. Sistem kuruluşun gerçek süreçleriyle bütünleşmelidir.",
      ],
      [
        "Establishing a quality management system is a strategic decision that supports overall performance and sustainable operation.",
        "Expected benefits include consistently providing conforming products and services, improving customer satisfaction, addressing context-related risks and opportunities, and demonstrating conformity with system requirements.",
        "The standard does not require every organization to use an identical document structure, clause sequence or terminology. The system should be integrated with actual business processes.",
      ],
    ),
  },
  {
    code: "0.2",
    title: { tr: "Kalite yönetimi prensipleri", en: "Quality management principles" },
    points: localeList(
      [
        "Sistem; müşteri odaklılık, liderlik, çalışanların katılımı, proses yaklaşımı, iyileştirme, kanıta dayalı karar alma ve ilişki yönetimi prensipleri üzerine kuruludur.",
        "Bu prensiplerin her biri kuruluşun bağlamına göre birlikte ele alınmalı; tek başına bir kontrol listesi gibi uygulanmamalıdır.",
      ],
      [
        "The system is built on customer focus, leadership, engagement of people, process approach, improvement, evidence-based decision making and relationship management.",
        "The principles should be applied together in the organization's context rather than treated as isolated checklist items.",
      ],
    ),
  },
  {
    code: "0.3",
    title: { tr: "Proses yaklaşımı, PUKÖ ve risk temelli düşünme", en: "Process approach, PDCA and risk-based thinking" },
    points: localeList(
      [
        "Faaliyetler birbirini etkileyen süreçler olarak yönetilir; girdiler, çıktılar, kaynaklar, kontroller ve süreçler arası ilişkiler birlikte değerlendirilir.",
        "Planla-Uygula-Kontrol Et-Önlem Al çevrimi; amaç ve kaynakların planlanmasını, planın uygulanmasını, sonuçların izlenmesini ve gerekli iyileştirmelerin yapılmasını sağlar.",
        "Risk temelli düşünme, planlanan sonuçlardan sapmaya yol açabilecek etkenleri önceden ele almayı, olumsuz etkileri azaltmayı ve fırsatlardan yararlanmayı amaçlar.",
        "Tek proses şeması; önceki prosesler, tedarikçi, müşteri ve ilgili taraflardan gelen girdilerin malzeme, enerji ve bilgi olarak faaliyete girdiğini; faaliyetin ürün, hizmet, karar, malzeme, enerji veya bilgi çıktısı üreterek sonraki proseslere ve alıcılara aktardığını gösterir. Başlangıç-son noktaları ile performans izleme ve ölçme kontrol noktaları sürece ve riske göre belirlenir.",
        "PUKÖ şemasında Madde 4 kuruluş bağlamı, müşteri şartları ve ilgili taraf ihtiyaçlarını sisteme girdi olarak taşır; Madde 5 liderliği merkeze alır; Madde 6 planlamayı, Madde 7-8 destek ve operasyonu, Madde 9 performans değerlendirmeyi ve Madde 10 iyileştirmeyi çevrime bağlar. Çıktılar KYS sonuçları, ürün-hizmetler ve müşteri memnuniyetidir.",
      ],
      [
        "Activities are managed as interacting processes, considering inputs, outputs, resources, controls and process relationships together.",
        "The Plan-Do-Check-Act cycle supports planning objectives and resources, executing the plan, monitoring results and implementing improvements.",
        "Risk-based thinking addresses factors that could cause deviation from intended results, reduces adverse effects and helps the organization use opportunities.",
        "The single-process model shows inputs from previous processes, suppliers, customers and interested parties entering an activity as material, energy or information. The activity produces products, services, decisions, material, energy or information for subsequent processes and recipients. Start/end boundaries and monitoring or measurement control points depend on the process and its risks.",
        "In the PDCA model, Clause 4 brings context, customer requirements and interested-party needs into the system; Clause 5 places leadership at the center; Clause 6 covers planning, Clauses 7-8 support and operation, Clause 9 performance evaluation, and Clause 10 improvement. Outputs are QMS results, products and services, and customer satisfaction.",
      ],
    ),
  },
  {
    code: "0.4",
    title: { tr: "Diğer yönetim sistemleriyle ilişki", en: "Relationship with other management systems" },
    points: localeList(
      [
        "Ortak üst seviye yapı, kalite yönetim sisteminin çevre, iş sağlığı ve güvenliği veya diğer yönetim sistemleriyle birlikte yürütülmesini kolaylaştırır.",
        "ISO 9001 başka yönetim sistemi alanlarının özel şartlarını içermez; kuruluş kalite sistemini ilgili yönetim sistemi gereklilikleriyle bütünleştirebilir.",
      ],
      [
        "The common high-level structure makes it easier to operate the QMS together with environmental, occupational health and safety, or other management systems.",
        "ISO 9001 does not include discipline-specific requirements from other systems, but the organization may integrate its QMS with those requirements.",
      ],
    ),
  },
  {
    code: "1",
    title: { tr: "Kapsam", en: "Scope" },
    points: localeList(
      [
        "Standart; müşteri ve geçerli yasal şartları karşılayan ürün ve hizmetleri düzenli sağlama yeteneğini göstermek isteyen kuruluşlara uygulanır.",
        "Sistemin etkin uygulanması, sürekli iyileştirilmesi ve uygunluk güvencesi yoluyla müşteri memnuniyetini artırmayı hedefler.",
        "Şartlar kuruluşun türü, büyüklüğü veya sunduğu ürün ve hizmetten bağımsız olarak geneldir.",
      ],
      [
        "The standard applies to organizations that need to demonstrate their ability to consistently provide products and services meeting customer and applicable legal requirements.",
        "It aims to improve customer satisfaction through effective system application, continual improvement and assurance of conformity.",
        "The requirements are generic regardless of organization type, size, or the products and services provided.",
      ],
    ),
  },
  {
    code: "2",
    title: { tr: "Atıf yapılan standart ve dokümanlar", en: "Normative references" },
    points: localeList(
      [
        "Standardın uygulanmasında temel esaslar, terimler ve tarifler için ISO 9000:2015 zorunlu referans olarak kullanılır.",
        "Tarihli bir atıfta belirtilen baskı; tarihsiz atıfta ise değişiklikleriyle birlikte en güncel baskı esas alınır.",
      ],
      [
        "ISO 9000:2015 is the mandatory reference for fundamentals, terms and definitions used when applying this standard.",
        "For a dated reference use the stated edition; for an undated reference use the latest edition including amendments.",
      ],
    ),
  },
  {
    code: "3",
    title: { tr: "Terimler ve tarifler", en: "Terms and definitions" },
    points: localeList(
      [
        "Kalite yönetim sistemi terimleri için ISO 9000:2015'te verilen temel kavramlar, terimler ve tarifler esas alınır.",
        "Kuruluş kendi günlük dilini kullanabilir; ancak kayıt ve prosedürlerde kullanılan ifadelerin anlamı tutarlı ve anlaşılır olmalıdır.",
      ],
      [
        "QMS terminology is based on the concepts, terms and definitions provided in ISO 9000:2015.",
        "The organization may use its own everyday language, provided that terms used in records and procedures remain consistent and clear.",
      ],
    ),
  },
  {
    code: "A.1",
    title: { tr: "Yapı ve terminoloji", en: "Structure and terminology" },
    points: localeList(
      [
        "Madde sırası, şartların anlaşılır sunumu ve diğer yönetim sistemleriyle uyum için düzenlenmiştir; kuruluşun dokümanlarını aynı sıraya göre yapılandırması gerekmez.",
        "Kuruluş kendi süreçlerine ve kullanıcılarına en uygun doküman yapısını ve terimleri kullanabilir. Dokümante bilgi yerine kayıt, prosedür veya protokol; dış tedarikçi yerine tedarikçi, ortak veya satıcı gibi ifadeler kullanılabilir.",
        "2015 yaklaşımı ürün ve hizmetleri birlikte ele alır; tek bir yönetim temsilcisi zorunluluğu getirmez; doküman, prosedür ve kayıt kavramlarını dokümante bilgi çatısı altında toplar.",
      ],
      [
        "Clause order is designed for clear presentation and alignment with other management systems; the organization does not have to structure its documents in the same sequence.",
        "The organization may use document structures and terms best suited to its processes and users, such as record, procedure or protocol for documented information, and supplier, partner or vendor for external provider.",
        "The 2015 approach addresses products and services together, does not require one designated management representative, and groups documents, procedures and records under documented information.",
      ],
    ),
  },
  {
    code: "A.2",
    title: { tr: "Ürün ve hizmetler", en: "Products and services" },
    points: localeList(
      [
        "Ürün ve hizmet ifadesi donanım, yazılım, işlenmiş malzeme ve hizmet dahil bütün çıktı türlerini kapsar.",
        "Hizmetin bir bölümü çoğu zaman müşteriyle etkileşim sırasında oluştuğundan, uygunluğun tamamı sunumdan önce doğrulanamayabilir; kontroller hizmet akışına yerleştirilmelidir.",
        "Bir çıktı aynı anda hem maddi veya maddi olmayan ürünleri hem de bunlarla bağlantılı hizmetleri içerebilir.",
      ],
      [
        "The term products and services covers all output categories, including hardware, software, processed materials and services.",
        "Because part of a service is often created during customer interaction, full conformity may not be verifiable before delivery; controls should therefore be built into service delivery.",
        "An output may combine tangible or intangible products with related services.",
      ],
    ),
  },
  {
    code: "A.3",
    title: { tr: "İlgili tarafların sınırı", en: "Boundaries of interested parties" },
    points: localeList(
      [
        "İlgili taraf analizi kalite yönetim sisteminin kapsamını sınırsız biçimde genişletmez; yalnızca uygun ürün-hizmet sunma ve müşteri memnuniyeti üzerinde anlamlı etkisi olan taraf ve şartlar sisteme alınır.",
        "Hangi tarafın ve hangi şartın kalite yönetim sistemiyle ilgili olduğuna kuruluş, bağlam ve etki değerlendirmesi sonucunda karar verir.",
      ],
      [
        "Interested-party analysis does not expand QMS scope without limit; only parties and requirements meaningfully affecting conformity and customer satisfaction need to be included.",
        "The organization decides which parties and requirements are relevant based on context and impact assessment.",
      ],
    ),
  },
  {
    code: "A.4",
    title: { tr: "Risk temelli düşünmenin uygulanması", en: "Applying risk-based thinking" },
    points: localeList(
      [
        "Risk temelli düşünme bağlam, planlama, süreç yönetimi ve dokümantasyon seviyesinin belirlenmesine yerleştirilmiştir; ayrı bir önleyici faaliyet maddesi yoktur.",
        "Standart resmi bir risk yönetimi yöntemi veya zorunlu, ayrı bir risk prosedürü talep etmez. Kuruluş kendi risk düzeyine uygun yöntemi ve kayıt kapsamını belirler.",
        "Bütün süreçler aynı risk düzeyinde değildir; kontrol ve dokümantasyon yoğunluğu belirsizlik ve olası etkiyle orantılı olmalıdır.",
      ],
      [
        "Risk-based thinking is embedded in context, planning, process management and decisions about documentation; there is no separate preventive-action clause.",
        "The standard does not require a formal risk-management method or a separate mandatory risk procedure. The organization selects a method and record level suitable for its risk.",
        "Not all processes carry the same risk; control and documentation intensity should be proportionate to uncertainty and potential impact.",
      ],
    ),
  },
  {
    code: "A.5",
    title: { tr: "Uygulanabilirlik", en: "Applicability" },
    points: localeList(
      [
        "2015 sürümü genel bir hariç tutma yaklaşımı kullanmaz; her şartın uygulanabilirliği kuruluşun büyüklüğü, karmaşıklığı, yönetim modeli, faaliyetleri, riskleri ve fırsatları dikkate alınarak değerlendirilir.",
        "Bir şart yalnızca uygulanmamasının ürün-hizmet uygunluğuna ve müşteri memnuniyetine zarar vermeyeceği kanıtlanabiliyorsa kapsam dışında bırakılabilir.",
      ],
      [
        "The 2015 edition does not use a general exclusion approach; applicability is assessed considering organization size, complexity, management model, activities, risks and opportunities.",
        "A requirement may be treated as not applicable only when doing so cannot harm product/service conformity or customer satisfaction.",
      ],
    ),
  },
  {
    code: "A.6",
    title: { tr: "Dokümante bilgi kavramı", en: "Concept of documented information" },
    points: localeList(
      [
        "Dokümante bilginin sürdürülmesi güncel talimat, prosedür veya planı; muhafaza edilmesi ise yapılan işin kanıtı olan kaydı ifade eder.",
        "Kuruluş hangi ek bilgilerin kayıt altına alınacağını, hangi ortamda ve ne kadar süre saklanacağını kendi ihtiyaç ve risklerine göre belirler.",
        "Standart yalnızca bilgi izlenmeli veya gözden geçirilmeli diyorsa, bu bilginin mutlaka dokümante edilmesi gerekmez; kuruluş ihtiyaca göre karar verir.",
      ],
      [
        "Maintaining documented information generally means keeping instructions, procedures or plans current; retaining it means preserving records as evidence of completed work.",
        "The organization determines what additional information to record, the medium used and retention time according to needs and risks.",
        "Where the standard only says information should be monitored or reviewed, documentation is not automatically mandatory; the organization decides based on need.",
      ],
    ),
  },
  {
    code: "A.7",
    title: { tr: "Kurumsal bilginin korunması", en: "Protecting organizational knowledge" },
    points: localeList(
      [
        "Kurumsal bilgi yönetimi, çalışan değişimi veya bilgi paylaşım eksikliği nedeniyle kritik tecrübenin kaybolmasını önlemelidir.",
        "Tecrübeden öğrenme, mentorluk, kıyaslama ve ders çıkarma yöntemleriyle yeni bilgi edinimi teşvik edilmelidir.",
      ],
      [
        "Organizational knowledge management should prevent loss of critical experience through staff changes or inadequate knowledge sharing.",
        "Acquire new knowledge through learning from experience, mentoring, benchmarking and lessons learned.",
      ],
    ),
  },
  {
    code: "A.8",
    title: { tr: "Dış tedarikin kapsamı", en: "Scope of external provision" },
    points: localeList(
      [
        "Dış tedarik; doğrudan satın alma, bağlı şirketle anlaşma veya bir sürecin dış kaynağa verilmesi gibi farklı modelleri kapsar.",
        "Kontrol tipi ve yoğunluğu tedarik edilen işin yapısına, kuruluş-tedarikçi etkileşimine ve sonuca ilişkin riske göre değişebilir.",
        "Her tedarikçi ve dış kaynak süreci için uygun kontrol seviyesi risk temelli düşünmeyle belirlenmelidir.",
      ],
      [
        "External provision includes direct purchasing, arrangements with an affiliated company, or outsourcing a process.",
        "Control type and intensity may vary according to the nature of the supplied work, organization-provider interaction and output risk.",
        "Use risk-based thinking to determine the appropriate control level for each provider and outsourced process.",
      ],
    ),
  },
  {
    code: "B",
    title: { tr: "İlgili kalite yönetimi standartları", en: "Related quality management standards" },
    points: localeList(
      [
        "ISO/TC 176 tarafından geliştirilen tamamlayıcı standartlar; müşteri memnuniyeti, kalite planları, proje kalitesi, ölçüm, eğitim, dokümantasyon, tetkik ve diğer uzmanlık alanlarında uygulama rehberliği sağlar.",
        "Bu rehberler ISO 9001 şartlarına ilave yapmaz veya şartları değiştirmez; kuruluşun sistemini kurarken ya da olgunlaştırırken destekleyici bilgi sunar.",
        "Çizelge B.1 her tamamlayıcı standardın ISO 9001 Madde 4-10 ile ilişkisini ayrı ayrı gösterir.",
      ],
      [
        "Complementary standards developed by ISO/TC 176 provide guidance for customer satisfaction, quality plans, project quality, measurement, training, documentation, auditing and other specialist areas.",
        "These guides neither add to nor modify ISO 9001 requirements; they provide supporting information for establishing or maturing the management system.",
        "Table B.1 identifies how each complementary standard relates to ISO 9001 Clauses 4-10.",
      ],
    ),
  },
];

export const ISO9001_CLAUSES: Iso9001Clause[] = [
  clause(
    "4.1",
    "Kuruluşun ve bağlamının anlaşılması",
    "Understanding the organization and its context",
    [
      "Kuruluşun amacı, stratejik yönü ve kalite yönetim sisteminin hedeflenen sonuçları üzerinde etkisi olan iç ve dış konular belirlenmelidir.",
      "Bu konularla ilgili bilgiler düzenli olarak izlenmeli ve gözden geçirilmelidir.",
      "Dış bağlam; yasal, teknolojik, rekabetçi, pazar, kültürel, sosyal ve ekonomik koşulları; iç bağlam ise değerleri, kültürü, kurumsal bilgiyi ve performansı kapsayabilir.",
      "Olumlu gelişmeler kadar olumsuz koşullar da bağlam değerlendirmesine dahil edilmelidir.",
    ],
    [
      "Determine the internal and external issues relevant to the organization's purpose, strategic direction and intended QMS results.",
      "Monitor and review information about these issues at planned intervals.",
      "External context may include legal, technological, competitive, market, cultural, social and economic conditions; internal context may include values, culture, organizational knowledge and performance.",
      "Consider both favorable developments and adverse conditions.",
    ],
  ),
  clause(
    "4.2",
    "İlgili tarafların ihtiyaç ve beklentilerinin anlaşılması",
    "Understanding the needs and expectations of interested parties",
    [
      "Ürün ve hizmetlerin müşteri ve yasal şartlara uygunluğunu etkileyen veya etkileyebilecek ilgili taraflar belirlenmelidir.",
      "Her ilgili tarafın kalite yönetim sistemiyle bağlantılı şartları, beklentileri ve yükümlülükleri tanımlanmalıdır.",
      "İlgili taraf listesi ve bu taraflara ait şartlar değişikliklere karşı izlenmeli ve gözden geçirilmelidir.",
    ],
    [
      "Identify interested parties that affect or could affect the ability to provide products and services meeting customer and legal requirements.",
      "Determine the QMS-related requirements, expectations and obligations of each relevant party.",
      "Monitor and review the interested-party register and their requirements for changes.",
    ],
  ),
  clause(
    "4.3",
    "Kalite yönetim sisteminin kapsamının belirlenmesi",
    "Determining the scope of the quality management system",
    [
      "Kalite yönetim sisteminin sınırları ve hangi faaliyetlere uygulanacağı açıkça belirlenmelidir.",
      "Kapsam belirlenirken iç ve dış bağlam, ilgili taraf şartları ile kuruluşun ürün ve hizmetleri birlikte değerlendirilmelidir.",
      "Belirlenen kapsam içinde uygulanabilir olan bütün ISO 9001 şartları işletilmelidir.",
      "Bir şart uygulanabilir değilse gerekçesi açıklanmalı; bu karar ürün ve hizmet uygunluğunu ya da müşteri memnuniyetini güvence altına alma yeteneğini zayıflatmamalıdır.",
      "Kapsam, kapsanan ürün ve hizmet türlerini de belirten kontrollü bir doküman olarak muhafaza edilmelidir.",
    ],
    [
      "Clearly define the boundaries and applicability of the QMS.",
      "When determining scope, consider internal and external context, interested-party requirements, and the organization's products and services together.",
      "Apply every ISO 9001 requirement that is applicable within the defined scope.",
      "If a requirement is considered not applicable, document the justification; this decision must not weaken the ability to assure conformity or customer satisfaction.",
      "Maintain the scope as controlled documented information, including the types of products and services covered.",
    ],
    ["Onaylı KYS kapsam dokümanı", "Uygulanabilir olmayan maddeler için gerekçe ve etki değerlendirmesi"],
    ["Approved QMS scope document", "Justification and impact assessment for any non-applicable clauses"],
  ),
  clause(
    "4.4.1",
    "Kalite yönetim sistemi ve prosesleri - sistemin kurulması",
    "QMS and its processes - establishing the system",
    [
      "Gerekli süreçler ve bu süreçlerin birbirleriyle etkileşimi tanımlanmalı; sistem kurulmalı, uygulanmalı, sürdürülmeli ve sürekli geliştirilmelidir.",
      "Her süreç için gerekli girdiler ile beklenen çıktılar belirlenmelidir.",
      "Süreçlerin sırası, bağlantıları ve birbirleri üzerindeki etkileri ortaya konmalıdır.",
      "Etkili işletim ve kontrol için yöntemler, kabul kriterleri, izleme-ölçme yöntemleri ve performans göstergeleri belirlenmelidir.",
      "Gerekli insan, altyapı, bilgi, finans ve diğer kaynakların varlığı güvence altına alınmalıdır.",
      "Süreç yetkileri ve sorumlulukları atanmalıdır.",
      "Süreç riskleri ve fırsatları ele alınmalı; sonuçlar değerlendirilerek hedeflenen çıktılar için gerekli değişiklikler yapılmalıdır.",
      "Hem süreçler hem de kalite yönetim sistemi düzenli olarak iyileştirilmelidir.",
    ],
    [
      "Define the required processes and their interactions, then establish, implement, maintain and continually improve the system.",
      "Determine required inputs and expected outputs for every process.",
      "Define process sequence, interfaces and interactions.",
      "Set methods, acceptance criteria, monitoring and measurement arrangements, and performance indicators for effective operation and control.",
      "Ensure the availability of people, infrastructure, knowledge, financial and other required resources.",
      "Assign process responsibilities and authorities.",
      "Address process risks and opportunities, evaluate results and implement changes needed to achieve intended outputs.",
      "Continually improve both the processes and the QMS.",
    ],
  ),
  clause(
    "4.4.2",
    "Kalite yönetim sistemi ve prosesleri - dokümante bilgi",
    "QMS and its processes - documented information",
    [
      "Süreçlerin işletimini desteklemek için ihtiyaç duyulan prosedür, talimat, plan ve diğer kontrollü bilgiler güncel tutulmalıdır.",
      "Süreçlerin planlandığı şekilde yürütüldüğünü kanıtlayan kayıtlar muhafaza edilmelidir.",
    ],
    [
      "Maintain current procedures, instructions, plans and other controlled information needed to operate processes.",
      "Retain records demonstrating that processes were carried out as planned.",
    ],
    ["Süreç kartları ve prosedürler", "Süreç performans ve uygulama kayıtları"],
    ["Process maps and procedures", "Process performance and execution records"],
  ),
  clause(
    "5.1.1",
    "Liderlik ve taahhüt - genel",
    "Leadership and commitment - general",
    [
      "Üst yönetim kalite yönetim sisteminin etkinliğinden hesap verebilir olmalıdır.",
      "Kalite politikası ve hedefleri kuruluşun bağlamı ve stratejik yönüyle uyumlu şekilde oluşturulmalıdır.",
      "Kalite yönetimi gereklilikleri günlük iş süreçlerine entegre edilmelidir.",
      "Proses yaklaşımı ve risk temelli düşünme kuruluş genelinde teşvik edilmelidir.",
      "Sistemin ihtiyaç duyduğu kaynaklar sağlanmalıdır.",
      "Etkili kalite yönetiminin ve şartlara uymanın önemi çalışanlarla paylaşılmalıdır.",
      "Sistemin hedeflenen sonuçlara ulaşması güvence altına alınmalıdır.",
      "Sisteme katkı sağlayan kişiler yönlendirilmeli, desteklenmeli ve sürece dahil edilmelidir.",
      "İyileştirme teşvik edilmeli; yöneticiler kendi sorumluluk alanlarında liderlik gösterebilmeleri için desteklenmelidir.",
    ],
    [
      "Top management remains accountable for QMS effectiveness.",
      "Establish quality policy and objectives aligned with context and strategic direction.",
      "Integrate QMS requirements into everyday business processes.",
      "Promote the process approach and risk-based thinking across the organization.",
      "Provide the resources needed by the system.",
      "Communicate the importance of effective quality management and conformity with requirements.",
      "Ensure the system achieves its intended results.",
      "Engage, direct and support people who contribute to system effectiveness.",
      "Promote improvement and support managers in demonstrating leadership within their areas.",
    ],
  ),
  clause(
    "5.1.2",
    "Müşteri odağı",
    "Customer focus",
    [
      "Müşteri şartları ile geçerli yasal ve düzenleyici şartlar belirlenmeli, anlaşılmalı ve sürekli karşılanmalıdır.",
      "Ürün ve hizmet uygunluğunu veya müşteri memnuniyetini etkileyebilecek risk ve fırsatlar belirlenmeli ve ele alınmalıdır.",
      "Müşteri memnuniyetini artırma odağı bütün faaliyetlerde sürdürülmelidir.",
    ],
    [
      "Determine, understand and consistently meet customer and applicable statutory and regulatory requirements.",
      "Identify and address risks and opportunities that could affect product or service conformity and customer satisfaction.",
      "Maintain a continuing focus on improving customer satisfaction.",
    ],
  ),
  clause(
    "5.2.1",
    "Kalite politikasının oluşturulması",
    "Establishing the quality policy",
    [
      "Politika kuruluşun amacı ve bağlamına uygun olmalı, stratejik yönünü desteklemelidir.",
      "Ölçülebilir kalite hedeflerinin belirlenmesi için çerçeve sağlamalıdır.",
      "Uygulanabilir şartları yerine getirme taahhüdü içermelidir.",
      "Kalite yönetim sistemini sürekli iyileştirme taahhüdü içermelidir.",
    ],
    [
      "Ensure the policy is appropriate to purpose and context and supports strategic direction.",
      "Use it as a framework for establishing measurable quality objectives.",
      "Include a commitment to satisfy applicable requirements.",
      "Include a commitment to continually improve the QMS.",
    ],
  ),
  clause(
    "5.2.2",
    "Kalite politikasının duyurulması",
    "Communicating the quality policy",
    [
      "Kalite politikası kontrollü dokümante bilgi olarak mevcut ve güncel tutulmalıdır.",
      "Kuruluş içinde duyurulmalı, anlaşılması sağlanmalı ve günlük faaliyetlerde uygulanmalıdır.",
      "Uygun olduğunda müşteriler, tedarikçiler ve diğer ilgili tarafların erişimine açılmalıdır.",
    ],
    [
      "Maintain the quality policy as current controlled documented information.",
      "Communicate it internally, ensure it is understood and apply it in daily activities.",
      "Make it available to customers, suppliers and other interested parties where appropriate.",
    ],
    ["Onaylı kalite politikası", "Duyuru, eğitim veya erişim kayıtları"],
    ["Approved quality policy", "Communication, training or access records"],
  ),
  clause(
    "5.3",
    "Kurumsal görev, yetki ve sorumluluklar",
    "Organizational roles, responsibilities and authorities",
    [
      "Kaliteyle ilgili rollerin sorumlulukları ve karar yetkileri açıkça atanmalı ve kuruluş içinde duyurulmalıdır.",
      "Bir sorumlu, sistemin ISO 9001 gerekliliklerini karşılamasını güvence altına almalıdır.",
      "Süreç sahipleri, süreçlerinin beklenen sonuçları üretmesini takip etmelidir.",
      "Sistem performansı ve iyileştirme fırsatları üst yönetime raporlanmalı; müşteri odağı kuruluş genelinde teşvik edilmelidir.",
      "Değişiklikler sırasında kalite yönetim sisteminin bütünlüğünü koruyacak sorumluluklar belirlenmelidir.",
    ],
    [
      "Clearly assign and communicate quality-related responsibilities and decision authorities.",
      "Assign responsibility for ensuring the system conforms to ISO 9001 requirements.",
      "Process owners should ensure their processes deliver expected results.",
      "Report system performance and improvement opportunities to top management and promote customer focus throughout the organization.",
      "Assign responsibility for protecting QMS integrity while changes are planned and implemented.",
    ],
  ),
  clause(
    "6.1.1",
    "Risk ve fırsatların belirlenmesi",
    "Determining risks and opportunities",
    [
      "Planlama sırasında kuruluşun bağlamı ile ilgili taraf şartları dikkate alınarak risk ve fırsatlar belirlenmelidir.",
      "Değerlendirme, sistemin hedeflenen sonuçlara ulaşmasını güvence altına almaya odaklanmalıdır.",
      "Olumlu etkileri güçlendirecek ve istenmeyen etkileri önleyecek veya azaltacak konular ele alınmalıdır.",
      "İyileştirme sağlayabilecek fırsatlar görünür hale getirilmelidir.",
    ],
    [
      "During planning, determine risks and opportunities while considering organizational context and interested-party requirements.",
      "Focus the assessment on assuring achievement of intended system results.",
      "Address matters that can enhance positive effects and prevent or reduce undesired effects.",
      "Identify opportunities capable of delivering improvement.",
    ],
  ),
  clause(
    "6.1.2",
    "Risk ve fırsatlara yönelik faaliyetlerin planlanması",
    "Planning actions for risks and opportunities",
    [
      "Belirlenen risk ve fırsatlar için uygulanacak faaliyetler planlanmalıdır.",
      "Faaliyetlerin kalite yönetim sistemi süreçlerine nasıl entegre edileceği ve nasıl uygulanacağı tanımlanmalıdır.",
      "Faaliyetlerin etkinliğinin nasıl değerlendirileceği belirlenmelidir.",
      "Alınan önlemin kapsamı, ürün ve hizmet uygunluğu üzerindeki olası etkiyle orantılı olmalıdır.",
      "Risk; kaçınma, kaynağı ortadan kaldırma, olasılık veya sonucu değiştirme, paylaşma ya da bilinçli kabul yoluyla ele alınabilir. Fırsatlar yeni uygulama, pazar, müşteri, ortaklık veya teknolojileri kapsayabilir.",
    ],
    [
      "Plan actions for identified risks and opportunities.",
      "Define how those actions will be integrated into and implemented through QMS processes.",
      "Determine how action effectiveness will be evaluated.",
      "Keep the scale of action proportionate to the potential effect on product and service conformity.",
      "Risk responses may include avoidance, eliminating the source, changing likelihood or consequence, sharing, or informed acceptance. Opportunities may include new practices, markets, customers, partnerships or technologies.",
    ],
    ["Risk ve fırsat kayıtları", "Aksiyon, sorumlu, termin ve etkinlik değerlendirmesi"],
    ["Risk and opportunity register", "Actions, owners, deadlines and effectiveness evaluation"],
  ),
  clause(
    "6.2.1",
    "Kalite amaçlarının oluşturulması",
    "Establishing quality objectives",
    [
      "İlgili fonksiyon, seviye ve süreçler için kalite hedefleri belirlenmelidir.",
      "Hedefler kalite politikasıyla uyumlu ve ölçülebilir olmalıdır.",
      "Geçerli şartlar dikkate alınmalı; hedefler ürün-hizmet uygunluğuna ve müşteri memnuniyetine katkı sağlamalıdır.",
      "Hedefler izlenmeli, ilgili kişilere duyurulmalı ve gerektiğinde güncellenmelidir.",
      "Kalite hedefleri kontrollü dokümante bilgi olarak muhafaza edilmelidir.",
    ],
    [
      "Establish quality objectives at relevant functions, levels and processes.",
      "Align objectives with the quality policy and make them measurable.",
      "Consider applicable requirements and ensure objectives contribute to conformity and customer satisfaction.",
      "Monitor objectives, communicate them to relevant people and update them when needed.",
      "Maintain quality objectives as controlled documented information.",
    ],
    ["Kalite hedefleri ve KPI listesi", "Periyodik gerçekleşme ve revizyon kayıtları"],
    ["Quality objectives and KPI register", "Periodic achievement and revision records"],
  ),
  clause(
    "6.2.2",
    "Kalite amaçlarına ulaşmak için planlama",
    "Planning how to achieve quality objectives",
    [
      "Her hedef için yapılacak iş tanımlanmalıdır.",
      "Gerekli kaynaklar belirlenmelidir.",
      "Sorumlu kişi veya rol atanmalıdır.",
      "Tamamlanma zamanı belirlenmelidir.",
      "Sonucun nasıl ölçüleceği ve değerlendirileceği açıklanmalıdır.",
    ],
    [
      "Define the work needed for each objective.",
      "Identify required resources.",
      "Assign a responsible person or role.",
      "Set a completion date.",
      "Define how results will be measured and evaluated.",
    ],
  ),
  clause(
    "6.3",
    "Değişikliklerin planlanması",
    "Planning of changes",
    [
      "Kalite yönetim sistemindeki değişiklikler plansız değil, kontrollü bir yöntemle gerçekleştirilmelidir.",
      "Değişikliğin amacı ile olumlu ve olumsuz olası sonuçları değerlendirilmelidir.",
      "Sistemin bütünlüğü ve gerekli kaynakların bulunabilirliği korunmalıdır.",
      "Görev, yetki ve sorumlulukların yeniden dağıtılması gerekip gerekmediği belirlenmelidir.",
    ],
    [
      "Implement QMS changes through a controlled plan rather than informally.",
      "Evaluate the purpose and potential positive and adverse consequences of the change.",
      "Protect system integrity and ensure required resources remain available.",
      "Determine whether roles, responsibilities and authorities need reassignment.",
    ],
    ["Değişiklik planı ve etki değerlendirmesi", "Onay, sorumlu ve uygulama sonuçları"],
    ["Change plan and impact assessment", "Approvals, owners and implementation results"],
  ),
  clause(
    "7.1.1",
    "Kaynaklar - genel",
    "Resources - general",
    [
      "Sistemin kurulması, işletilmesi, sürdürülmesi ve geliştirilmesi için gereken kaynaklar belirlenmeli ve sağlanmalıdır.",
      "Mevcut iç kaynakların kapasite ve sınırlamaları ile dışarıdan temin edilmesi gereken kaynaklar birlikte değerlendirilmelidir.",
    ],
    [
      "Determine and provide resources needed to establish, operate, maintain and improve the system.",
      "Consider internal resource capabilities and constraints together with resources that must be obtained externally.",
    ],
  ),
  clause(
    "7.1.2",
    "Kişiler",
    "People",
    [
      "Kalite yönetim sistemi ile süreçlerin etkili işletimi ve kontrolü için yeterli sayıda ve uygun yetkinlikte personel belirlenmeli ve görevlendirilmelidir.",
    ],
    [
      "Determine and provide enough competent people for effective operation and control of the QMS and its processes.",
    ],
  ),
  clause(
    "7.1.3",
    "Altyapı",
    "Infrastructure",
    [
      "Süreçleri işletmek ve uygun ürün-hizmet çıktısı elde etmek için gerekli altyapı belirlenmeli, sağlanmalı ve bakımı yapılmalıdır.",
      "Altyapı; bina ve tesisleri, makine ve ekipmanı, donanım ve yazılımı, ulaşım kaynaklarını ve bilgi-iletişim teknolojilerini kapsayabilir.",
      "Arıza, kapasite ve süreklilik riskleri için bakım ve yedekleme ihtiyaçları planlanmalıdır.",
    ],
    [
      "Determine, provide and maintain infrastructure needed to operate processes and achieve conforming outputs.",
      "Infrastructure may include buildings and facilities, machinery and equipment, hardware and software, transport resources, and information and communication technology.",
      "Plan maintenance and backup needs for failure, capacity and continuity risks.",
    ],
  ),
  clause(
    "7.1.4",
    "Proseslerin işletimi için çevre",
    "Environment for the operation of processes",
    [
      "Uygun sonuç elde etmek için gereken çalışma ortamı belirlenmeli, sağlanmalı ve sürdürülmelidir.",
      "Sosyal ortam ayrımcılığı ve çatışmayı önlemeli; psikolojik ortam stresi ve tükenmişliği azaltmalı; fiziksel ortam sıcaklık, nem, ışık, hava, hijyen ve gürültü gibi koşulları kontrol etmelidir.",
      "Gerekli çevre koşulları sunulan ürün, hizmet ve yapılan işe göre belirlenmelidir.",
    ],
    [
      "Determine, provide and maintain the work environment needed to achieve conforming results.",
      "The social environment should prevent discrimination and conflict; the psychological environment should reduce stress and burnout; and the physical environment should control conditions such as temperature, humidity, lighting, air quality, hygiene and noise.",
      "Set environmental conditions according to the product, service and work being performed.",
    ],
  ),
  clause(
    "7.1.5.1",
    "İzleme ve ölçme kaynakları - genel",
    "Monitoring and measuring resources - general",
    [
      "Uygunluğu doğrulamak için izleme veya ölçme yapıldığında geçerli ve güvenilir sonuç üretecek kaynaklar sağlanmalıdır.",
      "Kaynaklar yapılan ölçüm türüne uygun olmalı ve amaca uygunlukları süreklilik gösterecek şekilde bakımlı tutulmalıdır.",
      "Ölçüm kaynaklarının amaca uygunluğunu kanıtlayan kayıtlar muhafaza edilmelidir.",
    ],
    [
      "When monitoring or measurement is used to verify conformity, provide resources capable of producing valid and reliable results.",
      "Resources must suit the type of measurement and be maintained so they remain fit for purpose.",
      "Retain records demonstrating the fitness for purpose of monitoring and measuring resources.",
    ],
    ["Ölçüm cihazı envanteri", "Bakım, kontrol ve uygunluk kayıtları"],
    ["Measuring equipment register", "Maintenance, inspection and suitability records"],
  ),
  clause(
    "7.1.5.2",
    "Ölçüm izlenebilirliği",
    "Measurement traceability",
    [
      "İzlenebilirlik gerekli olduğunda cihazlar belirlenmiş aralıklarla veya kullanımdan önce ulusal ya da uluslararası standartlara izlenebilir şekilde kalibre edilmeli veya doğrulanmalıdır.",
      "İzlenebilir standart yoksa kalibrasyon ya da doğrulamada kullanılan dayanak kayıt altına alınmalıdır.",
      "Cihazın kalibrasyon durumu tanımlanmalı; yetkisiz ayar, hasar ve bozulmaya karşı korunmalıdır.",
      "Cihazın uygunsuz olduğu anlaşılırsa geçmiş ölçüm sonuçlarının geçerliliği değerlendirilmeli ve gerekli düzeltmeler yapılmalıdır.",
    ],
    [
      "Where traceability is required, calibrate or verify equipment at defined intervals or before use against standards traceable to national or international references.",
      "If no traceable reference exists, record the basis used for calibration or verification.",
      "Identify calibration status and protect equipment from unauthorized adjustment, damage and deterioration.",
      "If equipment is found unfit, assess the validity of previous results and take necessary corrective action.",
    ],
    ["Kalibrasyon/doğrulama sertifikaları", "Cihaz durum etiketi ve geçmiş sonuç etki değerlendirmesi"],
    ["Calibration/verification certificates", "Equipment status identification and impact assessment of earlier results"],
  ),
  clause(
    "7.1.6",
    "Kurumsal bilgi",
    "Organizational knowledge",
    [
      "Süreçleri işletmek ve ürün-hizmet uygunluğunu sağlamak için gerekli kurumsal bilgi belirlenmelidir.",
      "Bu bilgi korunmalı, güncel tutulmalı ve ihtiyaç duyan kişilerin erişimine açık olmalıdır.",
      "Değişen ihtiyaçlar ve eğilimler karşısında mevcut bilgi yeterliliği değerlendirilmeli; yeni bilginin nasıl edinileceği planlanmalıdır.",
      "Bilgi; geçmiş proje deneyimleri, başarı ve hatalardan öğrenilen dersler, fikri mülkiyet, süreç iyileştirmeleri, standartlar, akademik kaynaklar, müşteriler ve tedarikçilerden gelebilir.",
    ],
    [
      "Determine organizational knowledge needed to operate processes and assure product and service conformity.",
      "Maintain and update that knowledge and make it available to people who need it.",
      "When needs and trends change, assess whether current knowledge is sufficient and plan how additional knowledge will be acquired.",
      "Knowledge may come from project experience, lessons from successes and failures, intellectual property, process improvements, standards, academic sources, customers and suppliers.",
    ],
  ),
  clause(
    "7.2",
    "Yeterlilik",
    "Competence",
    [
      "Kalite performansını etkileyen görevler için gerekli yetkinlikler tanımlanmalıdır.",
      "İşi yapan kişilerin eğitim, öğrenim ve deneyim bakımından yeterli olduğu güvence altına alınmalıdır.",
      "Eksik yetkinlik için eğitim, mentorluk, görev değişikliği, işe alım veya dış kaynak gibi faaliyetler uygulanmalı ve etkinliği değerlendirilmelidir.",
      "Yetkinliğin kanıtı olan kayıtlar muhafaza edilmelidir.",
    ],
    [
      "Define competence requirements for work affecting quality performance.",
      "Ensure people are competent based on education, training and experience.",
      "Where gaps exist, use training, mentoring, reassignment, recruitment or outsourcing and evaluate action effectiveness.",
      "Retain records as evidence of competence.",
    ],
    ["Görev-yetkinlik matrisi", "Diploma, sertifika, eğitim ve etkinlik değerlendirme kayıtları"],
    ["Role-competence matrix", "Diplomas, certificates, training and effectiveness evaluation records"],
  ),
  clause(
    "7.3",
    "Farkındalık",
    "Awareness",
    [
      "Çalışanlar kalite politikasını ve görevleriyle ilgili kalite hedeflerini bilmelidir.",
      "Kendi çalışmalarının sistem etkinliğine ve daha iyi performansa nasıl katkı sağladığını anlamalıdır.",
      "Kalite yönetim sistemi şartlarına uyulmamasının sonuçlarının farkında olmalıdır.",
    ],
    [
      "People should know the quality policy and objectives relevant to their work.",
      "They should understand how their work contributes to system effectiveness and improved performance.",
      "They should understand the consequences of not conforming to QMS requirements.",
    ],
  ),
  clause(
    "7.4",
    "İletişim",
    "Communication",
    [
      "Kalite yönetim sistemiyle ilgili gerekli iç ve dış iletişimler belirlenmelidir.",
      "Hangi konuda iletişim kurulacağı ve iletişimin ne zaman yapılacağı tanımlanmalıdır.",
      "İletişimin hedef kitlesi belirlenmelidir.",
      "Kullanılacak kanal, format ve yöntem kararlaştırılmalıdır.",
      "İletişimi yapmaya yetkili veya sorumlu kişiler belirlenmelidir.",
    ],
    [
      "Determine necessary internal and external communications relevant to the QMS.",
      "Define what will be communicated and when communication will occur.",
      "Identify the intended audience.",
      "Set the channel, format and method to be used.",
      "Assign people authorized or responsible for communication.",
    ],
  ),
  clause(
    "7.5.1",
    "Dokümante edilmiş bilgi - genel",
    "Documented information - general",
    [
      "Sistem, ISO 9001 tarafından zorunlu tutulan dokümante bilgiyi içermelidir.",
      "Kuruluş, sistemin etkinliği için gerekli gördüğü ek prosedür, talimat, plan, form ve kayıtları da belirlemelidir.",
      "Dokümantasyonun kapsamı kuruluşun büyüklüğü, faaliyet ve süreç karmaşıklığı, ürün-hizmet türü ve çalışan yetkinliğine göre orantılı olmalıdır.",
    ],
    [
      "Include documented information specifically required by ISO 9001.",
      "Also determine additional procedures, instructions, plans, forms and records needed for system effectiveness.",
      "Scale documentation to organization size, activity and process complexity, product/service type and workforce competence.",
    ],
  ),
  clause(
    "7.5.2",
    "Dokümante bilginin oluşturulması ve güncellenmesi",
    "Creating and updating documented information",
    [
      "Her doküman başlık, tarih, yazar, kod veya referans numarası gibi bilgilerle tanımlanmalıdır.",
      "Dil, yazılım sürümü, grafik yapısı ve kağıt/elektronik ortam gibi format özellikleri uygun seçilmelidir.",
      "Doküman yayımlanmadan veya güncellenmeden önce uygunluk ve yeterlilik açısından gözden geçirilmeli ve yetkili kişi tarafından onaylanmalıdır.",
    ],
    [
      "Identify each document using information such as title, date, author, code or reference number.",
      "Choose suitable format attributes including language, software version, graphics and paper/electronic media.",
      "Review and approve documents for suitability and adequacy before issue or update.",
    ],
  ),
  clause(
    "7.5.3.1",
    "Dokümante bilginin kontrolü - erişim ve koruma",
    "Control of documented information - access and protection",
    [
      "Dokümante bilgi ihtiyaç duyulan yerde, doğru zamanda, doğru ve kullanılabilir sürüm olarak erişilebilir olmalıdır.",
      "Bilgi; gizlilik kaybı, yetkisiz veya uygunsuz kullanım, bozulma ve bütünlük kaybına karşı korunmalıdır.",
    ],
    [
      "Make documented information available in the correct usable version at the place and time it is needed.",
      "Protect information from loss of confidentiality, unauthorized or improper use, deterioration and loss of integrity.",
    ],
  ),
  clause(
    "7.5.3.2",
    "Dokümante bilginin kontrolü - yaşam döngüsü",
    "Control of documented information - lifecycle",
    [
      "Dağıtım, erişim, görüntüleme, kullanım ve yeniden kullanım yetkileri kontrol edilmelidir.",
      "Dokümanlar okunabilirliğini ve bütünlüğünü koruyacak şekilde saklanmalı, yedeklenmeli ve arşivlenmelidir.",
      "Değişiklik ve sürüm kontrolü uygulanmalıdır.",
      "Saklama süresi ve güvenli imha yöntemi tanımlanmalıdır.",
      "Sistem için gerekli dış kaynaklı dokümanlar belirlenmeli, güncellikleri ve dağıtımları kontrol edilmelidir.",
      "Uygunluk kanıtı olan kayıtlar istenmeyen değişikliklere karşı korunmalıdır.",
    ],
    [
      "Control distribution, access, viewing, use and reuse permissions.",
      "Store, back up and archive documents so readability and integrity are preserved.",
      "Apply change and version control.",
      "Define retention periods and secure disposal methods.",
      "Identify external documents needed by the system and control their currency and distribution.",
      "Protect records used as evidence of conformity against unintended alteration.",
    ],
    ["Doküman ana listesi", "Revizyon, dağıtım, erişim, saklama ve imha kayıtları"],
    ["Master document register", "Revision, distribution, access, retention and disposal records"],
  ),
  clause(
    "8.1",
    "Operasyonel planlama ve kontrol",
    "Operational planning and control",
    [
      "Ürün ve hizmet şartlarını karşılayacak operasyon süreçleri planlanmalı, uygulanmalı ve kontrol edilmelidir.",
      "Ürün ve hizmet şartları ile süreç ve kabul kriterleri belirlenmelidir.",
      "Uygunluğu sağlayacak insan, ekipman, altyapı, bilgi ve diğer kaynaklar planlanmalıdır.",
      "Süreç kontrolleri belirlenen kriterlere göre uygulanmalıdır.",
      "Süreçlerin planlandığı şekilde yürütüldüğünü ve çıktıların şartları karşıladığını gösteren dokümante bilgi oluşturulmalı ve saklanmalıdır.",
      "Planlı değişiklikler kontrol edilmeli; plansız değişikliklerin sonuçları değerlendirilerek olumsuz etkiler azaltılmalıdır.",
      "Dışarıya yaptırılan süreçler de kuruluşun operasyonel kontrolü altında tutulmalıdır.",
    ],
    [
      "Plan, implement and control operational processes needed to meet product and service requirements.",
      "Define product and service requirements together with process and acceptance criteria.",
      "Plan the people, equipment, infrastructure, knowledge and other resources needed for conformity.",
      "Apply process controls against defined criteria.",
      "Create and retain documented information showing that processes ran as planned and outputs met requirements.",
      "Control planned changes and evaluate unintended changes so adverse effects are reduced.",
      "Keep outsourced processes under the organization's operational control.",
    ],
    ["Operasyon, proje ve kalite planları", "Kabul kriterleri ve uygulama kayıtları", "Değişiklik ve dış kaynak kontrol kayıtları"],
    ["Operational, project and quality plans", "Acceptance criteria and execution records", "Change and outsourced-process control records"],
  ),
  clause(
    "8.2.1",
    "Müşteri ile iletişim",
    "Customer communication",
    [
      "Müşteriye ürün ve hizmetlerle ilgili açık ve güncel bilgi sağlanmalıdır.",
      "Teklif, soru, sözleşme, sipariş ve bunlara ait değişikliklerin nasıl yönetileceği belirlenmelidir.",
      "Şikayetler dahil müşteri geri bildirimleri alınmalı ve ilgili süreçlere aktarılmalıdır.",
      "Müşteriye ait bilgi, malzeme veya diğer mülkiyetin nasıl korunacağı açıklanmalıdır.",
      "Uygun olduğunda acil veya beklenmedik durumlar için özel iletişim ve müdahale şartları belirlenmelidir.",
    ],
    [
      "Provide clear and current information about products and services.",
      "Define how enquiries, quotations, contracts, orders and related changes are handled.",
      "Collect customer feedback, including complaints, and route it into the relevant processes.",
      "Explain how customer information, materials and other property will be protected.",
      "Where relevant, establish special communication and response arrangements for contingencies.",
    ],
  ),
  clause(
    "8.2.2",
    "Ürün ve hizmet şartlarının belirlenmesi",
    "Determining requirements for products and services",
    [
      "Müşteriye sunulacak ürün veya hizmete ait şartlar açıkça tanımlanmalıdır.",
      "Geçerli yasal ve düzenleyici şartlar ile kuruluşun gerekli gördüğü ilave şartlar kapsama alınmalıdır.",
      "Kuruluş, müşteriye duyurduğu veya taahhüt ettiği şartları gerçekten karşılayabileceğini doğrulamalıdır.",
    ],
    [
      "Clearly define requirements for products or services offered to customers.",
      "Include applicable statutory and regulatory requirements and any additional requirements considered necessary by the organization.",
      "Verify that the organization can meet the requirements it communicates or commits to customers.",
    ],
  ),
  clause(
    "8.2.3.1",
    "Taahhüt öncesi şartların gözden geçirilmesi",
    "Review of requirements before commitment",
    [
      "Kuruluş, müşteriye taahhütte bulunmadan önce şartları karşılayabilecek kapasiteye sahip olduğunu gözden geçirmelidir.",
      "Teslim ve teslim sonrası faaliyetler dahil müşterinin açıkça belirttiği şartlar incelenmelidir.",
      "Müşteri tarafından söylenmemiş olsa da bilinen kullanım amacı için zorunlu şartlar değerlendirilmelidir.",
      "Kuruluşun kendi belirlediği şartlar ve geçerli yasal şartlar kontrol edilmelidir.",
      "Önceki teklif, sözleşme veya siparişten farklı olan şartlar belirlenmeli ve çözüme kavuşturulmalıdır.",
      "Müşteri şartları yazılı değilse kabulden önce kuruluş tarafından teyit edilmelidir.",
      "Her sipariş için ayrı resmi incelemenin pratik olmadığı satış modellerinde katalog, teknik föy veya onaylı ürün bilgisi üzerinden sistematik gözden geçirme yapılabilir.",
    ],
    [
      "Before making a customer commitment, review whether the organization has the capacity to meet the requirements.",
      "Review customer-stated requirements, including delivery and post-delivery activities.",
      "Consider requirements necessary for known intended use even when the customer has not explicitly stated them.",
      "Check the organization's own requirements and applicable legal requirements.",
      "Identify and resolve terms that differ from earlier quotations, contracts or orders.",
      "If customer requirements are not documented, confirm them before acceptance.",
      "Where a formal review of every order is impractical, use a systematic review of approved catalogues, technical data or product information.",
    ],
  ),
  clause(
    "8.2.3.2",
    "Şartların gözden geçirilmesine ait kayıtlar",
    "Records of requirement review",
    [
      "Gözden geçirme sonuçları kayıt altına alınmalıdır.",
      "Ürün veya hizmet için ortaya çıkan yeni ya da değişen şartlar muhafaza edilmelidir.",
    ],
    [
      "Retain the results of the review.",
      "Retain new or changed requirements for the product or service.",
    ],
    ["Teklif/sözleşme/sipariş gözden geçirme kaydı", "Yeni veya değişen şartların onay kaydı"],
    ["Quotation/contract/order review record", "Approval record for new or changed requirements"],
  ),
  clause(
    "8.2.4",
    "Ürün ve hizmet şartlarındaki değişiklikler",
    "Changes to requirements for products and services",
    [
      "Şart değiştiğinde ilgili sözleşme, çizim, şartname, plan ve diğer dokümante bilgiler güncellenmelidir.",
      "Değişiklikten etkilenen çalışanların yeni şartları bildiği ve doğru sürümü kullandığı güvence altına alınmalıdır.",
    ],
    [
      "When requirements change, update the relevant contracts, drawings, specifications, plans and other documented information.",
      "Ensure affected people know the revised requirements and use the correct version.",
    ],
  ),
  clause(
    "8.3.1",
    "Tasarım ve geliştirme - genel",
    "Design and development - general",
    [
      "Ürün ve hizmetlerin daha sonra güvenli ve uygun şekilde sunulmasını sağlayacak bir tasarım ve geliştirme süreci kurulmalı, uygulanmalı ve sürdürülmelidir.",
    ],
    [
      "Establish, implement and maintain a design and development process that enables products and services to be provided safely and in conformity.",
    ],
  ),
  clause(
    "8.3.2",
    "Tasarım ve geliştirmenin planlanması",
    "Design and development planning",
    [
      "Tasarımın yapısı, süresi ve karmaşıklığı değerlendirilmelidir.",
      "Aşamalar ile her aşamada yapılacak gözden geçirme, doğrulama ve geçerli kılma faaliyetleri belirlenmelidir.",
      "Tasarım yetkileri ve sorumlulukları atanmalıdır.",
      "Gerekli iç ve dış kaynaklar belirlenmelidir.",
      "Tasarımda görev alan disiplinler ve kişiler arasındaki arayüzler kontrol edilmelidir.",
      "Müşteri ve son kullanıcıların hangi aşamalarda sürece dahil olacağı planlanmalıdır.",
      "Ürün veya hizmetin sonraki üretim, sunum, kullanım ve bakım şartları dikkate alınmalıdır.",
      "Müşteri ve diğer ilgili tarafların beklediği kontrol seviyesi belirlenmelidir.",
      "Tasarım şartlarının karşılandığını kanıtlayacak dokümante bilgi planlanmalıdır.",
    ],
    [
      "Consider the nature, duration and complexity of the design.",
      "Define stages and the reviews, verification and validation activities required at each stage.",
      "Assign design responsibilities and authorities.",
      "Identify required internal and external resources.",
      "Control interfaces between disciplines and people involved in design.",
      "Plan where customers and end users need to participate.",
      "Consider subsequent production, delivery, use and maintenance requirements.",
      "Determine the level of control expected by customers and other interested parties.",
      "Plan documented information needed to demonstrate that design requirements were met.",
    ],
    ["Tasarım yönetim planı", "Aşama, sorumluluk, kontrol ve onay matrisi"],
    ["Design management plan", "Stage, responsibility, control and approval matrix"],
  ),
  clause(
    "8.3.3",
    "Tasarım ve geliştirme girdileri",
    "Design and development inputs",
    [
      "Fonksiyon, performans ve kullanım şartları belirlenmelidir.",
      "Benzer geçmiş tasarımlardan öğrenilen bilgiler değerlendirilmelidir.",
      "Geçerli yasal ve düzenleyici şartlar ile kuruluşun uymayı taahhüt ettiği standart ve uygulama kuralları kapsanmalıdır.",
      "Tasarım başarısızlığının güvenlik, performans, maliyet ve kullanım üzerindeki olası sonuçları dikkate alınmalıdır.",
      "Girdiler tam, açık, doğrulanabilir ve tasarım amacına uygun olmalıdır.",
      "Birbiriyle çelişen girdiler tasarıma başlamadan veya ilerlemeden önce çözümlenmelidir.",
      "Tasarım girdileri kontrollü kayıt olarak muhafaza edilmelidir.",
    ],
    [
      "Determine functional, performance and use requirements.",
      "Consider knowledge gained from similar previous designs.",
      "Include applicable legal requirements and standards or codes of practice the organization has committed to follow.",
      "Consider potential safety, performance, cost and use consequences of design failure.",
      "Inputs must be complete, clear, verifiable and suitable for the design purpose.",
      "Resolve conflicting inputs before design proceeds.",
      "Retain controlled records of design inputs.",
    ],
    ["Tasarım girdileri listesi ve şartnameler", "Çelişki çözüm ve onay kayıtları"],
    ["Design input register and specifications", "Conflict resolution and approval records"],
  ),
  clause(
    "8.3.4",
    "Tasarım ve geliştirme kontrolleri",
    "Design and development controls",
    [
      "Tasarımın ulaşması gereken sonuçlar açıkça tanımlanmalıdır.",
      "Sonuçların şartları karşılama kabiliyeti uygun aşamalarda gözden geçirilmelidir.",
      "Çıktıların girdileri karşıladığını doğrulayan kontroller yapılmalıdır.",
      "Ortaya çıkan ürün veya hizmetin amaçlanan kullanıma uygun olduğunu geçerli kılacak faaliyetler yürütülmelidir.",
      "Gözden geçirme, doğrulama veya geçerli kılmada bulunan sorunlar için düzeltici faaliyet yapılmalıdır.",
      "Bütün kontrol ve sonuç kayıtları muhafaza edilmelidir.",
    ],
    [
      "Clearly define the results the design must achieve.",
      "Review the ability of design results to meet requirements at appropriate stages.",
      "Perform verification to confirm outputs meet inputs.",
      "Perform validation to confirm the resulting product or service is suitable for intended use.",
      "Take action on issues found during review, verification or validation.",
      "Retain records of controls and results.",
    ],
    ["Tasarım gözden geçirme tutanakları", "Doğrulama/geçerli kılma sonuçları", "Sorun ve aksiyon kayıtları"],
    ["Design review minutes", "Verification/validation results", "Issue and action records"],
  ),
  clause(
    "8.3.5",
    "Tasarım ve geliştirme çıktıları",
    "Design and development outputs",
    [
      "Tasarım çıktıları onaylı girdileri karşılamalıdır.",
      "Satın alma, üretim, inşaat, teslim ve diğer sonraki süreçler için yeterli bilgi sağlamalıdır.",
      "İzleme-ölçme şartlarını ve uygun olduğunda kabul kriterlerini içermeli veya bunlara atıf yapmalıdır.",
      "Ürünün ya da hizmetin amaçlanan kullanımında güvenlik ve uygunluk için gerekli temel özellikler açıkça belirtilmelidir.",
    ],
    [
      "Design outputs must meet approved inputs.",
      "Provide sufficient information for purchasing, production, construction, delivery and later processes.",
      "Include or reference monitoring and measurement requirements and, where appropriate, acceptance criteria.",
      "Clearly specify characteristics essential for safe and proper intended use.",
    ],
    ["Onaylı çizim, hesap, şartname ve teknik çıktı", "Kabul ve kontrol kriterleri"],
    ["Approved drawings, calculations, specifications and technical outputs", "Acceptance and inspection criteria"],
  ),
  clause(
    "8.3.6",
    "Tasarım ve geliştirme değişiklikleri",
    "Design and development changes",
    [
      "Tasarım sırasında veya sonrasında yapılan değişiklikler tanımlanmalı, gözden geçirilmeli ve uygunluğu olumsuz etkilemeyecek şekilde kontrol edilmelidir.",
      "Değişikliğin kendisi ve gözden geçirme sonuçları kaydedilmelidir.",
      "Değişikliği onaylayan yetkili izlenebilir olmalıdır.",
      "Olumsuz etkileri önlemek için alınan önlemler kayıt altına alınmalıdır.",
    ],
    [
      "Identify, review and control changes made during or after design so they do not adversely affect conformity.",
      "Record the change and review results.",
      "Ensure the person authorizing the change is traceable.",
      "Record actions taken to prevent adverse effects.",
    ],
    ["Tasarım revizyon/değişiklik kaydı", "Etki değerlendirmesi ve yetkili onayı"],
    ["Design revision/change record", "Impact assessment and authorized approval"],
  ),
  clause(
    "8.4.1",
    "Dışarıdan tedarik edilen proses, ürün ve hizmetler - genel",
    "Externally provided processes, products and services - general",
    [
      "Dışarıdan alınan süreç, ürün ve hizmetlerin belirlenen şartlara uygunluğu güvence altına alınmalıdır.",
      "Kuruluşun kendi çıktısına dahil edilen alımlar, kuruluş adına müşteriye doğrudan sunulanlar ve dış kaynağa verilen süreçler kontrol kapsamına alınmalıdır.",
      "Tedarikçi değerlendirme, seçim, performans izleme ve yeniden değerlendirme kriterleri belirlenmelidir.",
      "Tedarikçinin uygun ürün ve hizmet sunma kabiliyeti kararların temelini oluşturmalıdır.",
      "Değerlendirme sonuçları ve gerekli takip faaliyetleri kayıt altına alınmalıdır.",
    ],
    [
      "Ensure externally provided processes, products and services conform to defined requirements.",
      "Control purchased inputs incorporated into the organization's output, items delivered directly to customers on its behalf, and outsourced processes.",
      "Establish criteria for supplier evaluation, selection, performance monitoring and re-evaluation.",
      "Base decisions on the supplier's ability to provide conforming outputs.",
      "Retain evaluation results and resulting follow-up actions.",
    ],
    ["Onaylı tedarikçi/taşeron listesi", "Değerlendirme, performans ve yeniden değerlendirme kayıtları"],
    ["Approved supplier/subcontractor list", "Evaluation, performance and re-evaluation records"],
  ),
  clause(
    "8.4.2",
    "Dış tedarik kontrolünün tipi ve kapsamı",
    "Type and extent of control over external provision",
    [
      "Dış tedarik, kuruluşun müşteriye sürekli uygun çıktı sunma kabiliyetini zayıflatmamalıdır.",
      "Dışarıya verilen süreçler kalite yönetim sisteminin kontrolü içinde kalmalıdır.",
      "Tedarikçiye ve tedarik edilen sonuca uygulanacak kontrol seviyesi tanımlanmalıdır.",
      "Kontrol seviyesi belirlenirken dış tedarikin müşteri ve yasal şartları karşılama üzerindeki olası etkisi ile tedarikçinin kendi kontrollerinin etkinliği değerlendirilmelidir.",
      "Gerekli giriş kontrolü, saha denetimi, test, doğrulama veya geçerli kılma faaliyetleri belirlenmelidir.",
    ],
    [
      "External provision must not weaken the organization's ability to consistently deliver conforming outputs.",
      "Outsourced processes remain within QMS control.",
      "Define the control level applied to both the provider and the supplied result.",
      "When setting control level, consider the potential effect on customer and legal requirements and the effectiveness of the provider's own controls.",
      "Determine necessary incoming inspection, site audit, testing, verification or validation activities.",
    ],
  ),
  clause(
    "8.4.3",
    "Dış tedarikçiye verilecek bilgi",
    "Information for external providers",
    [
      "Satın alma veya taşeronluk şartları tedarikçiye gönderilmeden önce doğruluk ve yeterlilik açısından gözden geçirilmelidir.",
      "Tedarik edilecek süreç, ürün veya hizmet açıkça tanımlanmalıdır.",
      "Ürün, hizmet, yöntem, süreç, ekipman ve serbest bırakma/onay şartları belirtilmelidir.",
      "Personel için gerekli yetkinlik ve nitelikler bildirilmelidir.",
      "Tedarikçinin kuruluşla iletişim ve çalışma biçimi ile performansının nasıl izleneceği açıklanmalıdır.",
      "Kuruluşun veya müşterinin tedarikçi tesisinde yapacağı doğrulama ya da geçerli kılma faaliyetleri önceden bildirilmelidir.",
    ],
    [
      "Review purchasing or subcontract requirements for accuracy and adequacy before sending them to the provider.",
      "Clearly define the process, product or service to be supplied.",
      "Specify approval requirements for products, services, methods, processes, equipment and release.",
      "Communicate required competence and qualifications of personnel.",
      "Explain how the provider will interact with the organization and how performance will be monitored.",
      "Communicate verification or validation planned by the organization or customer at the provider's premises.",
    ],
  ),
  clause(
    "8.5.1",
    "Üretim ve hizmet sunumunun kontrolü",
    "Control of production and service provision",
    [
      "Üretim ve hizmet faaliyetleri kontrollü koşullarda yürütülmelidir.",
      "Yapılacak işin, ürün veya hizmetin özellikleri ve beklenen sonuçları güncel dokümanlarla tanımlanmalıdır.",
      "Uygun izleme ve ölçme kaynakları kullanılmalıdır.",
      "Süreç ve çıktı kontrol kriterleri ile kabul kriterleri uygun aşamalarda doğrulanmalıdır.",
      "Uygun altyapı ve çalışma ortamı kullanılmalı, gerekli yetkinliğe sahip personel görevlendirilmelidir.",
      "Sonucun daha sonra ölçülemediği süreçler önceden geçerli kılınmalı ve gerektiğinde yeniden yeterli hale getirilmelidir.",
      "İnsan hatasını önleyecek yöntem, kontrol ve hata önleme araçları uygulanmalıdır.",
      "Serbest bırakma, teslim ve teslim sonrası faaliyetler planlandığı şekilde uygulanmalıdır.",
    ],
    [
      "Carry out production and service activities under controlled conditions.",
      "Use current documents to define work, product or service characteristics and expected results.",
      "Use suitable monitoring and measuring resources.",
      "Verify process, output and acceptance criteria at appropriate stages.",
      "Use suitable infrastructure and work environment and assign competent personnel.",
      "Validate processes whose results cannot be verified later and requalify them when necessary.",
      "Apply methods, controls and mistake-proofing measures to prevent human error.",
      "Implement release, delivery and post-delivery activities as planned.",
    ],
  ),
  clause(
    "8.5.2",
    "Tanımlama ve izlenebilirlik",
    "Identification and traceability",
    [
      "Uygunluğu güvence altına almak için gerekli çıktılar benzersiz veya uygun bir yöntemle tanımlanmalıdır.",
      "Üretim ve hizmet boyunca çıktının kontrol, test, onay veya bekleme durumu görünür olmalıdır.",
      "İzlenebilirlik şartı varsa her çıktıya ait özel kimlik ve geçmiş bağlantıları kontrollü kayıtlarda muhafaza edilmelidir.",
    ],
    [
      "Identify outputs by a unique or otherwise suitable method where needed to assure conformity.",
      "Make the inspection, test, approval or hold status of outputs visible throughout production and service provision.",
      "Where traceability is required, control unique identification and retain records linking each output to its history.",
    ],
    ["Ürün/unit/iş emri kimliği", "Kontrol durumu ve geriye dönük izlenebilirlik kayıtları"],
    ["Product/unit/work-order identity", "Inspection status and backward traceability records"],
  ),
  clause(
    "8.5.3",
    "Müşteri veya dış tedarikçiye ait mülkiyet",
    "Property belonging to customers or external providers",
    [
      "Kuruluşun kontrolündeki müşteri veya tedarikçi mülkiyetine özen gösterilmelidir.",
      "Kullanılacak ya da ürüne dahil edilecek mülkiyet tanımlanmalı, doğrulanmalı, korunmalı ve güvenli tutulmalıdır.",
      "Kayıp, hasar veya kullanıma uygunsuzluk halinde mal sahibi bilgilendirilmeli ve olay kaydedilmelidir.",
      "Mülkiyet; malzeme, ekipman, tesis, fikri mülkiyet, çizim, anahtar, kişisel veri ve diğer bilgileri kapsayabilir.",
    ],
    [
      "Exercise care over customer or provider property while it is under the organization's control.",
      "Identify, verify, protect and secure property to be used or incorporated into the output.",
      "If property is lost, damaged or unsuitable for use, inform the owner and retain a record of the incident.",
      "Property may include materials, equipment, facilities, intellectual property, drawings, keys, personal data and other information.",
    ],
    ["Teslim alma/zimmet kaydı", "Kayıp, hasar veya uygunsuzluk bildirim kaydı"],
    ["Receipt/custody record", "Loss, damage or unsuitability notification record"],
  ),
  clause(
    "8.5.4",
    "Muhafaza",
    "Preservation",
    [
      "Üretim veya hizmet sırasında çıktılar şartlara uygunluğu koruyacak düzeyde muhafaza edilmelidir.",
      "Muhafaza; tanımlama, güvenli elleçleme, kirlenme kontrolü, ambalajlama, depolama, taşıma ve fiziksel korumayı kapsayabilir.",
    ],
    [
      "Preserve outputs during production or service to the extent needed to maintain conformity.",
      "Preservation may include identification, safe handling, contamination control, packaging, storage, transport and physical protection.",
    ],
  ),
  clause(
    "8.5.5",
    "Teslimat sonrası faaliyetler",
    "Post-delivery activities",
    [
      "Ürün ve hizmetlere ilişkin teslim sonrası yükümlülükler yerine getirilmelidir.",
      "Gerekli faaliyetler belirlenirken yasal yükümlülükler ve sözleşme şartları değerlendirilmelidir.",
      "Olası istenmeyen sonuçlar ile ürün veya hizmetin yapısı, kullanımı ve beklenen ömrü dikkate alınmalıdır.",
      "Müşteri şartları ve müşteri geri bildirimleri değerlendirmeye dahil edilmelidir.",
      "Faaliyetler garanti, bakım-servis, satış sonrası destek, geri çağırma, geri dönüşüm veya nihai bertaraf hizmetlerini kapsayabilir.",
    ],
    [
      "Fulfil post-delivery obligations associated with products and services.",
      "When determining activities, consider legal obligations and contract requirements.",
      "Consider potential undesired consequences and the nature, use and expected lifetime of the product or service.",
      "Include customer requirements and customer feedback in the evaluation.",
      "Activities may include warranty, maintenance, after-sales support, recall, recycling or final disposal services.",
    ],
  ),
  clause(
    "8.5.6",
    "Üretim ve hizmet değişikliklerinin kontrolü",
    "Control of production and service changes",
    [
      "Üretim veya hizmet sunumundaki değişiklikler, uygunluğu koruyacak ölçüde gözden geçirilmeli ve kontrol edilmelidir.",
      "Gözden geçirme sonuçları, değişikliği onaylayan kişi ve gerekli takip faaliyetleri kayıt altına alınmalıdır.",
    ],
    [
      "Review and control changes to production or service provision to the extent needed to maintain conformity.",
      "Record review results, the person authorizing the change and required follow-up actions.",
    ],
    ["Üretim/hizmet değişiklik formu", "Onay ve takip sonuçları"],
    ["Production/service change form", "Approval and follow-up results"],
  ),
  clause(
    "8.6",
    "Ürün ve hizmetlerin serbest bırakılması",
    "Release of products and services",
    [
      "Ürün veya hizmetin şartları karşıladığı planlanan aşamalarda doğrulanmalıdır.",
      "Planlı kontroller tamamlanmadan ve yetkili onayı alınmadan müşteriye teslim veya serbest bırakma yapılmamalıdır; istisna ancak yetkili ve gerekiyorsa müşteri onayıyla mümkündür.",
      "Kabul kriterlerine uygunluğu kanıtlayan sonuçlar muhafaza edilmelidir.",
      "Serbest bırakmayı onaylayan kişiye kadar izlenebilirlik sağlanmalıdır.",
    ],
    [
      "Verify at planned stages that the product or service meets requirements.",
      "Do not deliver or release before planned controls are complete and authorized approval is obtained; any exception requires appropriate authority and, where relevant, customer approval.",
      "Retain results demonstrating conformity with acceptance criteria.",
      "Maintain traceability to the person authorizing release.",
    ],
    ["Kontrol ve test sonuçları", "Teslim/serbest bırakma onayı ve yetkili kimliği"],
    ["Inspection and test results", "Delivery/release approval and identity of authorizer"],
  ),
  clause(
    "8.7.1",
    "Uygun olmayan çıktının kontrolü",
    "Control of nonconforming outputs",
    [
      "Şartları karşılamayan çıktı istenmeyen kullanım veya teslimi önleyecek şekilde tanımlanmalı ve kontrol altına alınmalıdır.",
      "Yapılacak işlem uygunsuzluğun türü, büyüklüğü ve ürün-hizmet uygunluğu üzerindeki etkisine göre seçilmelidir.",
      "Kontrol teslimden önce, teslim sırasında veya teslimden sonra fark edilen uygunsuzluklara uygulanmalıdır.",
      "Çıktı düzeltilebilir; ayrılabilir, karantinaya alınabilir, geri çağrılabilir veya faaliyet askıya alınabilir.",
      "Gerektiğinde müşteri bilgilendirilmeli ya da şartlı kabul için yetkili onayı alınmalıdır.",
      "Düzeltilen çıktı şartlara uygunluğunu kanıtlamak için yeniden doğrulanmalıdır.",
    ],
    [
      "Identify and control nonconforming output to prevent unintended use or delivery.",
      "Choose action according to the nature, scale and effect of the nonconformity on conformity.",
      "Apply control to issues found before, during or after delivery.",
      "Correct the output or segregate, quarantine, recall or suspend it as appropriate.",
      "Inform the customer where needed or obtain authorized concession for conditional acceptance.",
      "Re-verify corrected output to demonstrate conformity.",
    ],
  ),
  clause(
    "8.7.2",
    "Uygun olmayan çıktıya ait kayıtlar",
    "Records of nonconforming outputs",
    [
      "Uygunsuzluğun ne olduğu açıkça kaydedilmelidir.",
      "Yapılan düzeltme, ayırma, bildirim veya diğer faaliyetler belirtilmelidir.",
      "Verilen şartlı kabul ve koşulları kaydedilmelidir.",
      "Uygunsuzluk hakkında karar veren yetkili kişi izlenebilir olmalıdır.",
    ],
    [
      "Clearly record the nature of the nonconformity.",
      "Describe correction, segregation, notification and other action taken.",
      "Record any concession and its conditions.",
      "Maintain traceability to the person deciding the disposition.",
    ],
    ["Uygunsuzluk kaydı", "Faaliyet, şartlı kabul, yeniden doğrulama ve yetkili karar kaydı"],
    ["Nonconformity record", "Action, concession, re-verification and authorized disposition record"],
  ),
  clause(
    "9.1.1",
    "İzleme, ölçme, analiz ve değerlendirme - genel",
    "Monitoring, measurement, analysis and evaluation - general",
    [
      "Nelerin izleneceği ve ölçüleceği belirlenmelidir.",
      "Geçerli sonuç üretecek izleme, ölçme, analiz ve değerlendirme yöntemleri tanımlanmalıdır.",
      "İzleme ve ölçmenin zamanı veya sıklığı belirlenmelidir.",
      "Sonuçların ne zaman ve kim tarafından analiz edilip değerlendirileceği belirlenmelidir.",
      "Kalite yönetim sisteminin performansı ve etkinliği değerlendirilerek sonuçları kanıtlayan kayıtlar saklanmalıdır.",
    ],
    [
      "Determine what needs to be monitored and measured.",
      "Define monitoring, measurement, analysis and evaluation methods capable of producing valid results.",
      "Set timing or frequency for monitoring and measurement.",
      "Define when and by whom results will be analyzed and evaluated.",
      "Evaluate QMS performance and effectiveness and retain records demonstrating the results.",
    ],
    ["KPI ve ölçüm planı", "Analiz, değerlendirme ve performans raporları"],
    ["KPI and measurement plan", "Analysis, evaluation and performance reports"],
  ),
  clause(
    "9.1.2",
    "Müşteri memnuniyeti",
    "Customer satisfaction",
    [
      "Müşterinin ihtiyaç ve beklentilerinin ne ölçüde karşılandığına ilişkin algısı izlenmelidir.",
      "Bilginin nasıl elde edileceği, izleneceği ve gözden geçirileceği belirlenmelidir.",
      "Yöntemler anket, teslimat geri bildirimi, müşteri toplantısı, şikayet, övgü, garanti talebi, pazar bilgisi veya satış kanalı raporlarını içerebilir.",
    ],
    [
      "Monitor customer perception of the extent to which needs and expectations have been fulfilled.",
      "Determine how this information will be obtained, monitored and reviewed.",
      "Methods may include surveys, delivery feedback, customer meetings, complaints, compliments, warranty claims, market information or sales-channel reports.",
    ],
  ),
  clause(
    "9.1.3",
    "Analiz ve değerlendirme",
    "Analysis and evaluation",
    [
      "İzleme ve ölçmeden elde edilen uygun veri ve bilgiler analiz edilmelidir.",
      "Ürün ve hizmetlerin uygunluğu ile müşteri memnuniyeti düzeyi değerlendirilmelidir.",
      "Kalite yönetim sisteminin performansı ve etkinliği değerlendirilmelidir.",
      "Planların etkin biçimde uygulanıp uygulanmadığı kontrol edilmelidir.",
      "Risk ve fırsat faaliyetlerinin etkinliği değerlendirilmelidir.",
      "Dış tedarikçi performansı ölçülmelidir.",
      "İyileştirme ihtiyaç ve fırsatları belirlenmeli; uygun olduğunda istatistiksel yöntemlerden yararlanılmalıdır.",
    ],
    [
      "Analyze relevant data and information resulting from monitoring and measurement.",
      "Evaluate product and service conformity and the level of customer satisfaction.",
      "Evaluate QMS performance and effectiveness.",
      "Check whether plans were implemented effectively.",
      "Evaluate the effectiveness of risk and opportunity actions.",
      "Measure external-provider performance.",
      "Identify improvement needs and opportunities and use statistical methods where useful.",
    ],
  ),
  clause(
    "9.2.1",
    "İç tetkikin amacı",
    "Purpose of internal audit",
    [
      "Planlanan aralıklarla yapılan iç tetkikler, sistemin kuruluşun kendi şartlarına ve ISO 9001 şartlarına uygunluğunu değerlendirmelidir.",
      "Tetkik, sistemin etkili şekilde uygulanıp sürdürülüp sürdürülmediğini ortaya koymalıdır.",
    ],
    [
      "Conduct internal audits at planned intervals to assess conformity with the organization's own QMS requirements and ISO 9001.",
      "Audits should determine whether the system is effectively implemented and maintained.",
    ],
  ),
  clause(
    "9.2.2",
    "İç tetkik programı ve uygulaması",
    "Internal audit programme and execution",
    [
      "Süreç önemi, değişiklikler ve önceki tetkik sonuçları dikkate alınarak sıklık, yöntem, sorumluluk, planlama ve raporlamayı içeren tetkik programı oluşturulmalıdır.",
      "Her tetkikin kriteri ve kapsamı belirlenmelidir.",
      "Tetkikçiler tarafsızlık ve objektifliği koruyacak şekilde seçilmelidir.",
      "Sonuçlar ilgili yönetime raporlanmalıdır.",
      "Düzeltme ve düzeltici faaliyetler gereksiz gecikme olmadan uygulanmalıdır.",
      "Tetkik programının yürütüldüğünü ve sonuçlarını gösteren kayıtlar muhafaza edilmelidir.",
    ],
    [
      "Establish an audit programme covering frequency, methods, responsibilities, planning and reporting while considering process importance, changes and previous audit results.",
      "Define criteria and scope for each audit.",
      "Select auditors to protect impartiality and objectivity.",
      "Report results to relevant management.",
      "Implement corrections and corrective actions without undue delay.",
      "Retain records showing programme implementation and audit results.",
    ],
    ["İç tetkik programı ve planları", "Tetkik raporu, bulgu ve takip kayıtları"],
    ["Internal audit programme and plans", "Audit report, findings and follow-up records"],
  ),
  clause(
    "9.3.1",
    "Yönetimin gözden geçirmesi - genel",
    "Management review - general",
    [
      "Üst yönetim kalite yönetim sistemini planlı aralıklarla; uygunluk, yeterlilik, etkinlik ve stratejik yönle uyum açısından gözden geçirmelidir.",
    ],
    [
      "Top management should review the QMS at planned intervals for continuing suitability, adequacy, effectiveness and alignment with strategic direction.",
    ],
  ),
  clause(
    "9.3.2",
    "Yönetimin gözden geçirmesi girdileri",
    "Management review inputs",
    [
      "Önceki yönetim gözden geçirme karar ve aksiyonlarının durumu değerlendirilmelidir.",
      "İç ve dış bağlamdaki değişiklikler ele alınmalıdır.",
      "Müşteri memnuniyeti, ilgili taraf geri bildirimleri ve kalite hedeflerinin gerçekleşme düzeyi incelenmelidir.",
      "Süreç performansı, ürün-hizmet uygunluğu, uygunsuzluklar ve düzeltici faaliyetler değerlendirilmelidir.",
      "İzleme-ölçme ve tetkik sonuçları ile dış tedarikçi performansı incelenmelidir.",
      "Kaynak yeterliliği, risk-fırsat faaliyetlerinin etkinliği ve iyileştirme fırsatları gündeme alınmalıdır.",
    ],
    [
      "Review the status of actions from previous management reviews.",
      "Consider changes in internal and external context.",
      "Review customer satisfaction, interested-party feedback and achievement of quality objectives.",
      "Evaluate process performance, conformity, nonconformities and corrective actions.",
      "Review monitoring, measurement and audit results and external-provider performance.",
      "Consider resource adequacy, effectiveness of risk and opportunity actions, and improvement opportunities.",
    ],
  ),
  clause(
    "9.3.3",
    "Yönetimin gözden geçirmesi çıktıları",
    "Management review outputs",
    [
      "İyileştirme fırsatları hakkında karar ve faaliyetler belirlenmelidir.",
      "Kalite yönetim sisteminde değişiklik ihtiyacı karara bağlanmalıdır.",
      "Gerekli kaynaklar belirlenmeli ve tahsis kararları alınmalıdır.",
      "Toplantı sonuçları, kararlar ve sorumlular dokümante bilgi olarak muhafaza edilmelidir.",
    ],
    [
      "Determine decisions and actions concerning improvement opportunities.",
      "Decide whether changes to the QMS are needed.",
      "Identify required resources and make allocation decisions.",
      "Retain meeting results, decisions and owners as documented information.",
    ],
    ["Yönetimin gözden geçirmesi gündemi ve tutanağı", "Karar, aksiyon, sorumlu ve termin listesi"],
    ["Management review agenda and minutes", "Decision, action, owner and deadline register"],
  ),
  clause(
    "10.1",
    "İyileştirme - genel",
    "Improvement - general",
    [
      "Müşteri şartlarını karşılamak ve memnuniyeti artırmak için iyileştirme fırsatları belirlenmeli, önceliklendirilmeli ve uygulanmalıdır.",
      "Ürün ve hizmetler bugünkü şartların yanında gelecekteki ihtiyaç ve beklentileri de karşılayacak şekilde geliştirilmelidir.",
      "İstenmeyen etkiler düzeltilmeli, önlenmeli veya azaltılmalı; sistem performansı ve etkinliği yükseltilmelidir.",
      "İyileştirme; düzeltme, düzeltici faaliyet, sürekli iyileştirme, büyük değişiklik, inovasyon veya organizasyon değişikliği şeklinde olabilir.",
    ],
    [
      "Identify, prioritize and implement improvement opportunities to meet customer requirements and increase satisfaction.",
      "Improve products and services to address current requirements and future needs and expectations.",
      "Correct, prevent or reduce undesired effects and improve system performance and effectiveness.",
      "Improvement may take the form of correction, corrective action, continual improvement, breakthrough change, innovation or organizational change.",
    ],
  ),
  clause(
    "10.2.1",
    "Uygunsuzluk ve düzeltici faaliyet",
    "Nonconformity and corrective action",
    [
      "Şikayet kaynaklı olanlar dahil her uygunsuzluğa zamanında tepki verilmeli; durum kontrol altına alınmalı, düzeltilmeli ve sonuçları yönetilmelidir.",
      "Uygunsuzluğun tekrarını veya başka yerde oluşmasını önlemek için neden ortadan kaldırma ihtiyacı değerlendirilmelidir.",
      "Uygunsuzluk gözden geçirilmeli ve analiz edilmeli; kök nedenleri belirlenmelidir.",
      "Benzer uygunsuzlukların mevcut olup olmadığı veya oluşma ihtimali araştırılmalıdır.",
      "Gerekli düzeltici faaliyetler uygulanmalı ve etkinlikleri sonradan doğrulanmalıdır.",
      "Gerekirse risk ve fırsat kayıtları ile kalite yönetim sistemi güncellenmelidir.",
      "Düzeltici faaliyetin kapsamı uygunsuzluğun etkisiyle orantılı olmalıdır.",
    ],
    [
      "Respond promptly to every nonconformity, including complaints; control and correct the situation and manage its consequences.",
      "Evaluate whether action is needed to eliminate causes and prevent recurrence or occurrence elsewhere.",
      "Review and analyze the nonconformity and determine root causes.",
      "Investigate whether similar nonconformities exist or could potentially occur.",
      "Implement required corrective actions and later verify their effectiveness.",
      "Update risks, opportunities and the QMS when necessary.",
      "Keep corrective action proportionate to the effect of the nonconformity.",
    ],
  ),
  clause(
    "10.2.2",
    "Düzeltici faaliyet kayıtları",
    "Corrective action records",
    [
      "Uygunsuzluğun niteliği ve sonrasında yapılan bütün faaliyetler kayıt altına alınmalıdır.",
      "Düzeltici faaliyetlerin sonuçları ve etkinlik değerlendirmesi muhafaza edilmelidir.",
    ],
    [
      "Record the nature of the nonconformity and all subsequent actions.",
      "Retain corrective action results and effectiveness evaluation.",
    ],
    ["Uygunsuzluk ve kök neden analizi", "Düzeltici faaliyet, sonuç ve etkinlik doğrulama kaydı"],
    ["Nonconformity and root-cause analysis", "Corrective action, result and effectiveness verification record"],
  ),
  clause(
    "10.3",
    "Sürekli iyileştirme",
    "Continual improvement",
    [
      "Kalite yönetim sisteminin uygunluğu, yeterliliği ve etkinliği sürekli geliştirilmelidir.",
      "Analiz ve değerlendirme sonuçları ile yönetimin gözden geçirmesi çıktıları, sürekli iyileştirme ihtiyacı ve fırsatlarını belirlemek için kullanılmalıdır.",
    ],
    [
      "Continually improve QMS suitability, adequacy and effectiveness.",
      "Use analysis and evaluation results and management review outputs to identify continual improvement needs and opportunities.",
    ],
  ),
];

const SPECIAL_CARD_PREFIXES: Record<string, string[]> = {
  "İNŞAAT": ["6.1", "6.3", "7.1", "7.2", "8.1", "8.3", "8.4", "8.5", "8.6", "8.7", "9.1", "10.2"],
  SATIŞ: ["4.2", "5.1.2", "7.4", "8.2", "8.5.5", "8.6", "9.1.2", "10.2"],
};

function clauseMatchesPrefix(clauseCode: string, prefix: string) {
  return clauseCode === prefix || clauseCode.startsWith(`${prefix}.`);
}

export function iso9001ClausesForCard(code?: string | null) {
  const cleanCode = String(code || "").trim().toLocaleUpperCase("tr-TR");
  if (!cleanCode) return [];

  const prefixes = SPECIAL_CARD_PREFIXES[cleanCode] || [cleanCode];
  return ISO9001_CLAUSES.filter((item) => prefixes.some((prefix) => clauseMatchesPrefix(item.code, prefix)));
}
