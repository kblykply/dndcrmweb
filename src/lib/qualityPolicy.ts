export type QualityLocale = "tr" | "en";

export type QualityPolicyItem = {
  key: string;
  title: Record<QualityLocale, string>;
  summary: Record<QualityLocale, string>;
  detail: Record<QualityLocale, string>;
  codes: string[];
  categories: string[];
};

type QualityCardCopy = {
  title: Record<QualityLocale, string>;
  description: Record<QualityLocale, string>;
  titleAliases?: string[];
  descriptionAliases?: string[];
};

type QualityUiCopy = {
  brandName: string;
  brandValues: string;
  title: string;
  subtitle: string;
  motto: string;
  refresh: string;
  loading: string;
  valuesHeading: string;
  policyHeading: string;
  language: string;
  stats: {
    processes: string;
    documents: string;
    checklist: string;
    review: string;
  };
  outputs: string[];
  values: string[][];
  lanes: {
    construction: string[];
    sales: string[];
  };
  mini: {
    title: string;
    values: string;
    context: string;
    operational: string;
    support: string;
    construction: string;
    sales: string;
    outputs: string[];
    contextNodes: string[][];
    operationalNodes: string[][];
    supportNodes: string[][];
    valueNodes: string[][];
    constructionNodes: string[][];
    salesNodes: string[][];
  };
};

export const QUALITY_CARD_TRANSLATIONS: Record<string, QualityCardCopy> = {
  "4.1": {
    title: {
      tr: "Kuruluşun ve Bağlamının Anlaşılması",
      en: "Understanding the Organization and Its Context",
    },
    description: {
      tr: "DND organizasyonunun iç ve dış bağlamını kalite sistemi içinde takip eder.",
      en: "Tracks DND's internal and external context within the quality management system.",
    },
  },
  "4.2": {
    title: {
      tr: "İlgili Tarafların İhtiyaç ve Beklentileri",
      en: "Needs and Expectations of Interested Parties",
    },
    description: {
      tr: "Müşteri, tedarikçi, ekip ve resmi kurum beklentilerini yönetir.",
      en: "Manages expectations from customers, suppliers, teams and official institutions.",
    },
  },
  "4.3": {
    title: {
      tr: "Kalite Yönetim Sistemi Kapsamı",
      en: "Scope of the Quality Management System",
    },
    description: {
      tr: "KYS kapsamını, uygulanabilir süreçleri ve hariç tutmaları kaydeder.",
      en: "Records the QMS scope, applicable processes and exclusions.",
    },
  },
  "4.4": {
    title: {
      tr: "KYS Süreçlerinin Belirlenmesi",
      en: "Quality Management System Processes",
    },
    description: {
      tr: "Süreç sahipleri, girdiler, çıktılar ve süreç ilişkilerini takip eder.",
      en: "Tracks process owners, inputs, outputs and relationships between processes.",
    },
  },
  "5": {
    title: { tr: "Liderlik", en: "Leadership" },
    description: {
      tr: "Yönetim taahhüdü, kalite politikası ve sorumlulukları kapsar.",
      en: "Covers management commitment, quality policy and responsibilities.",
    },
  },
  "6": {
    title: { tr: "Planlama", en: "Planning" },
    description: {
      tr: "Risk, fırsat, hedef ve değişiklik planlarını bir arada tutar.",
      en: "Keeps risk, opportunity, objective and change plans together.",
    },
  },
  "6.1": {
    title: { tr: "Risk ve Fırsatların Belirlenmesi", en: "Determining Risks and Opportunities" },
    description: {
      tr: "Süreç riskleri ve iyileştirme fırsatlarını düzenli kontrol eder.",
      en: "Regularly reviews process risks and improvement opportunities.",
    },
  },
  "6.2": {
    title: { tr: "Hedefler ve Planlama", en: "Objectives and Planning" },
    description: {
      tr: "Kalite hedeflerini, sorumluları ve gerçekleşme durumunu izler.",
      en: "Tracks quality objectives, responsible owners and completion status.",
    },
  },
  "6.3": {
    title: { tr: "Değişikliklerin Planlanması", en: "Planning of Changes" },
    description: {
      tr: "Süreç, ekip, tedarik ve doküman değişikliklerini kayıt altına alır.",
      en: "Records process, team, procurement and document changes.",
    },
  },
  "7": {
    title: { tr: "Destek", en: "Support" },
    description: {
      tr: "Kaynak, yetkinlik, farkındalık, iletişim ve dokümante bilgi süreçleri.",
      en: "Resource, competence, awareness, communication and documented information processes.",
    },
  },
  "7.1": {
    title: { tr: "Kaynaklar", en: "Resources" },
    description: {
      tr: "İnsan, altyapı, ekipman ve çalışma ortamı ihtiyaçlarını kapsar.",
      en: "Covers people, infrastructure, equipment and work environment needs.",
    },
  },
  "7.2": {
    title: { tr: "Yeterlilik ve Yetkinlik", en: "Competence and Capability" },
    description: {
      tr: "Ekip yetkinlikleri, eğitim kayıtları ve görev yeterliliklerini izler.",
      en: "Tracks team competencies, training records and task capability.",
    },
  },
  "7.3": {
    title: { tr: "Farkındalık", en: "Awareness" },
    description: {
      tr: "Kalite politikası, hedefler ve süreç sorumluluklarının paylaşımı.",
      en: "Sharing of quality policy, objectives and process responsibilities.",
    },
  },
  "7.4": {
    title: { tr: "İletişim", en: "Communication" },
    description: {
      tr: "İç ve dış iletişim kanalları, kayıtları ve sorumlulukları.",
      en: "Internal and external communication channels, records and responsibilities.",
    },
  },
  "7.5": {
    title: { tr: "Dokümante Edilmiş Bilgi", en: "Documented Information" },
    description: {
      tr: "Prosedür, form, kayıt, revizyon ve doküman kontrol akışı.",
      en: "Procedure, form, record, revision and document control flow.",
    },
  },
  "8": {
    title: {
      tr: "Operasyon - Kurumsal Hizmetler ve İşletim",
      en: "Operation - Corporate Services and Management",
    },
    description: {
      tr: "Operasyonel süreçlerin ana kontrol kartı.",
      en: "Main control card for operational processes.",
    },
  },
  "8.1": {
    title: { tr: "Operasyonel Planlama ve Kontrol", en: "Operational Planning and Control" },
    description: {
      tr: "Operasyonel kontroller, teslim kriterleri ve süreç planları.",
      en: "Operational controls, handover criteria and process plans.",
    },
  },
  "8.2": {
    title: { tr: "Ürün ve Hizmetler İçin Şartlar", en: "Requirements for Products and Services" },
    description: {
      tr: "Müşteri şartları, yasal şartlar ve proje beklentileri.",
      en: "Customer requirements, legal requirements and project expectations.",
    },
  },
  "8.3": {
    title: { tr: "Tasarım ve Geliştirme", en: "Design and Development" },
    description: {
      tr: "Tasarım girdileri, onaylar, revizyonlar ve çıktı kontrolleri.",
      en: "Design inputs, approvals, revisions and output controls.",
    },
  },
  "8.4": {
    title: {
      tr: "Dışarıdan Tedarik Edilen Ürün ve Hizmetler",
      en: "Externally Provided Products and Services",
    },
    description: {
      tr: "Tedarikçi, taşeron ve dış hizmet kalite kontrolleri.",
      en: "Quality controls for suppliers, subcontractors and external services.",
    },
  },
  "8.5": {
    title: { tr: "Üretim ve Hizmet Sunumu", en: "Production and Service Provision" },
    description: {
      tr: "İnşaat uygulama, teslim hazırlığı ve hizmet sunumu kontrolleri.",
      en: "Construction execution, delivery preparation and service provision controls.",
    },
  },
  "8.6": {
    title: { tr: "Ürün ve Hizmetlerin Serbest Bırakılması", en: "Release of Products and Services" },
    description: {
      tr: "Kontrol, test, teslim ve devreye alma serbest bırakma kayıtları.",
      en: "Inspection, testing, handover and commissioning release records.",
    },
  },
  "8.7": {
    title: { tr: "Uygun Olmayan Çıktının Kontrolü", en: "Control of Nonconforming Outputs" },
    description: {
      tr: "Uygunsuzluk, hata, eksik iş ve düzeltici faaliyet takibi.",
      en: "Tracking of nonconformities, defects, incomplete work and corrective actions.",
    },
  },
  "9": {
    title: { tr: "Performans Değerlendirme", en: "Performance Evaluation" },
    description: {
      tr: "Süreç ölçüm, analiz, iç tetkik ve yönetim gözden geçirme alanı.",
      en: "Process measurement, analysis, internal audit and management review area.",
    },
  },
  "9.1": {
    title: {
      tr: "İzleme, Ölçme, Analiz ve Değerlendirme",
      en: "Monitoring, Measurement, Analysis and Evaluation",
    },
    description: {
      tr: "KPI, saha kontrol, memnuniyet ve süreç performans verileri.",
      en: "KPI, site inspection, satisfaction and process performance data.",
    },
  },
  "9.2": {
    title: { tr: "İç Tetkik", en: "Internal Audit" },
    description: {
      tr: "İç denetim planları, bulgular, aksiyonlar ve takip kayıtları.",
      en: "Internal audit plans, findings, actions and follow-up records.",
    },
  },
  "9.3": {
    title: { tr: "Yönetimin Gözden Geçirmesi", en: "Management Review" },
    description: {
      tr: "Yönetim gözden geçirme gündemi, kararları ve aksiyonları.",
      en: "Management review agenda, decisions and actions.",
    },
  },
  "10": {
    title: { tr: "İyileştirme", en: "Improvement" },
    description: {
      tr: "Uygunsuzluk, düzeltici faaliyet ve sürekli iyileştirme yönetimi.",
      en: "Management of nonconformity, corrective action and continual improvement.",
    },
  },
  "10.1": {
    title: { tr: "İyileştirme - Genel", en: "Improvement - General" },
    description: {
      tr: "Müşteri şartları, gelecekteki ihtiyaçlar ve sistem etkinliği için iyileştirme fırsatlarını kapsar.",
      en: "Covers improvement opportunities for customer requirements, future needs and system effectiveness.",
    },
    titleAliases: ["Uygunsuzluk ve Düzeltici Faaliyet", "Nonconformity and Corrective Action"],
    descriptionAliases: ["Problem kaydı, kök neden, aksiyon ve kapanış takibi.", "Problem records, root cause, actions and closure tracking."],
  },
  "10.2": {
    title: { tr: "Uygunsuzluk ve Düzeltici Faaliyet", en: "Nonconformity and Corrective Action" },
    description: {
      tr: "Uygunsuzluk tepkisi, kök neden, düzeltici faaliyet ve etkinlik takibini kapsar.",
      en: "Covers nonconformity response, root cause, corrective action and effectiveness review.",
    },
    titleAliases: ["Sürekli İyileştirme", "Continual Improvement"],
    descriptionAliases: ["Tekrarlayan iyileştirme çalışmaları ve standartlaştırma.", "Recurring improvement work and standardization."],
  },
  "10.3": {
    title: { tr: "Sürekli İyileştirme", en: "Continual Improvement" },
    description: {
      tr: "KYS uygunluğu, yeterliliği ve etkinliğinin sürekli geliştirilmesini takip eder.",
      en: "Tracks continual improvement of QMS suitability, adequacy and effectiveness.",
    },
    titleAliases: ["İyileştirme Fırsatları", "Improvement Opportunities"],
    descriptionAliases: ["Fırsat kayıtları ve süreç geliştirme önerileri.", "Opportunity records and process development suggestions."],
  },
  "İNŞAAT": {
    title: { tr: "İnşaat Üretim Süreçleri", en: "Construction Production Processes" },
    description: {
      tr: "Proje hazırlık, tasarım izin, tedarik, inşaat, kontrol ve teslim süreçleri.",
      en: "Project preparation, design permits, procurement, construction, inspection and handover processes.",
    },
  },
  "SATIŞ": {
    title: { tr: "Gayrimenkul Satış Süreçleri", en: "Real Estate Sales Processes" },
    description: {
      tr: "Pazarlama, müşteri ilişkileri, sözleşme, ödeme, teslim ve satış sonrası süreçleri.",
      en: "Marketing, customer relations, contract, payment, handover and after-sales processes.",
    },
  },
};

export const QUALITY_MODULE_COPY: Record<QualityLocale, QualityUiCopy> = {
  tr: {
    brandName: "DND İNŞAAT",
    brandValues: "GÜVEN | KALİTE | DEĞER",
    title: "DND İNŞAAT ÜRETİMİ VE GAYRİMENKUL SATIŞ SÜREÇLERİ",
    subtitle: "KALİTE YÖNETİM SİSTEMİ",
    motto: '"Güven İnşa Ediyoruz, Değer Üretiyoruz."',
    refresh: "Yenile",
    loading: "Yükleniyor",
    valuesHeading: "DND DEĞERLERİMİZ",
    policyHeading: "KALİTE POLİTİKAMIZ",
    language: "Dil",
    stats: {
      processes: "süreç",
      documents: "doküman",
      checklist: "checklist",
      review: "kontrol",
    },
    outputs: [
      "MÜŞTERİ VE İLGİLİ TARAFLARIN MEMNUNİYETİ",
      "KYS'NİN SONUÇLARI",
      "ÜRÜN VE HİZMETLER",
      "ORGANİZASYON YÖNETİM SİSTEMİ",
    ],
    values: [
      ["DÜRÜSTLÜK", "Her koşulda doğruyu söyler, güvene dayalı ilişkiler kurarız."],
      ["NEZAKET", "İnsanlara saygıyla yaklaşır, anlayış ve empatiyle hareket ederiz."],
      ["NETLİK", "Açık, anlaşılır ve zamanında iletişim kurarız."],
      ["NİTELİK", "İşimizi en yüksek kalite standartlarında yaparız."],
      ["DENEYİM", "Tecrübemizi paylaşır, sürekli öğrenir ve geliştiririz."],
    ],
    lanes: {
      construction: [
        "Proje Hazırlık ve Planlama",
        "Tasarım & İzinler",
        "Tedarik & Lojistik",
        "İnşaat Uygulama",
        "Kontrol & Test",
        "Teslimat & Devreye Alma",
      ],
      sales: [
        "Pazarlama & Tanıtım",
        "Müşteri İlişkileri Yönetimi",
        "Satış & Sözleşme",
        "Ödeme & Finansman",
        "Teslim & Tapu",
        "Satış Sonrası Hizmetler",
      ],
    },
    mini: {
      title: "DND KALİTE YÖNETİM SİSTEMİ",
      values: "Güven | Kalite | Değer",
      context: "Bağlam",
      operational: "8. Operasyonel",
      support: "7. Destek",
      construction: "İnşaat üretim",
      sales: "Gayrimenkul satış",
      outputs: ["Müşteri memnuniyeti", "KYS sonuçları", "Ürün & hizmetler", "Yönetim sistemi"],
      contextNodes: [
        ["4.1", "Organizasyon"],
        ["4.2", "Taraflar"],
        ["4.3", "Kapsam"],
        ["4.4", "Süreçler"],
      ],
      operationalNodes: [
        ["8.1", "Plan"],
        ["8.2", "Şartlar"],
        ["8.3", "Tasarım"],
        ["8.4", "Tedarik"],
        ["8.5", "Üretim"],
        ["8.6", "Serbest"],
        ["8.7", "Kontrol"],
      ],
      supportNodes: [
        ["7.1", "Kaynak"],
        ["7.2", "Yetkinlik"],
        ["7.3", "Farkındalık"],
        ["7.4", "İletişim"],
        ["7.5", "Doküman"],
      ],
      valueNodes: [
        ["5", "Dürüstlük"],
        ["7.4", "Nezaket"],
        ["7.4", "Netlik"],
        ["8.6", "Nitelik"],
        ["7.2", "Deneyim"],
      ],
      constructionNodes: [
        ["6", "Proje"],
        ["8.3", "Tasarım"],
        ["8.4", "Tedarik"],
        ["8.5", "İnşaat"],
        ["8.6", "Test"],
      ],
      salesNodes: [
        ["7.4", "Pazarlama"],
        ["4.2", "Müşteri"],
        ["8.2", "Sözleşme"],
        ["8.6", "Teslim"],
        ["9.1", "Satış sonrası"],
      ],
    },
  },
  en: {
    brandName: "DND CONSTRUCTION",
    brandValues: "TRUST | QUALITY | VALUE",
    title: "DND CONSTRUCTION PRODUCTION AND REAL ESTATE SALES PROCESSES",
    subtitle: "QUALITY MANAGEMENT SYSTEM",
    motto: '"We Build Trust, We Create Value."',
    refresh: "Refresh",
    loading: "Loading",
    valuesHeading: "DND VALUES",
    policyHeading: "QUALITY POLICY",
    language: "Language",
    stats: {
      processes: "processes",
      documents: "documents",
      checklist: "checklist",
      review: "review",
    },
    outputs: [
      "CUSTOMER AND STAKEHOLDER SATISFACTION",
      "QMS RESULTS",
      "PRODUCTS AND SERVICES",
      "ORGANIZATION MANAGEMENT SYSTEM",
    ],
    values: [
      ["INTEGRITY", "We build trust through honest relationships."],
      ["COURTESY", "We work with respect, empathy and care."],
      ["CLARITY", "We communicate clearly and on time."],
      ["QUALITY", "We deliver work at high standards."],
      ["EXPERIENCE", "We share knowledge and keep improving."],
    ],
    lanes: {
      construction: [
        "Project Planning and Preparation",
        "Design & Permits",
        "Procurement & Logistics",
        "Construction Execution",
        "Inspection & Testing",
        "Handover & Commissioning",
      ],
      sales: [
        "Marketing & Promotion",
        "Customer Relations Management",
        "Sales & Contract",
        "Payment & Financing",
        "Title Deed & Handover",
        "After-Sales Services",
      ],
    },
    mini: {
      title: "DND QUALITY MANAGEMENT SYSTEM",
      values: "Trust | Quality | Value",
      context: "Context",
      operational: "8. Operational",
      support: "7. Support",
      construction: "Construction production",
      sales: "Real estate sales",
      outputs: ["Customer satisfaction", "QMS results", "Products & services", "Management system"],
      contextNodes: [
        ["4.1", "Organization"],
        ["4.2", "Parties"],
        ["4.3", "Scope"],
        ["4.4", "Processes"],
      ],
      operationalNodes: [
        ["8.1", "Plan"],
        ["8.2", "Terms"],
        ["8.3", "Design"],
        ["8.4", "Supply"],
        ["8.5", "Produce"],
        ["8.6", "Release"],
        ["8.7", "Control"],
      ],
      supportNodes: [
        ["7.1", "Resources"],
        ["7.2", "Competence"],
        ["7.3", "Awareness"],
        ["7.4", "Info"],
        ["7.5", "Docs"],
      ],
      valueNodes: [
        ["5", "Integrity"],
        ["7.4", "Courtesy"],
        ["7.4", "Clarity"],
        ["8.6", "Quality"],
        ["7.2", "Experience"],
      ],
      constructionNodes: [
        ["6", "Project"],
        ["8.3", "Design"],
        ["8.4", "Supply"],
        ["8.5", "Build"],
        ["8.6", "Test"],
      ],
      salesNodes: [
        ["7.4", "Market"],
        ["4.2", "Customer"],
        ["8.2", "Contract"],
        ["8.6", "Deliver"],
        ["9.1", "After sales"],
      ],
    },
  },
};

export const QUALITY_POLICY_ITEMS: QualityPolicyItem[] = [
  {
    key: "customer-focus",
    title: {
      tr: "Müşteri Odaklılık",
      en: "Customer Focus",
    },
    summary: {
      tr: "Müşteri ihtiyaçlarını anlamak, karşılamak ve memnuniyeti sürekli artırmak.",
      en: "Understand customer needs, meet expectations and continuously improve satisfaction.",
    },
    detail: {
      tr: "Müşterilerimizin mevcut ve gelecekteki ihtiyaçlarını anlamayı, beklentilerini karşılamayı ve memnuniyetlerini sürekli artırmayı öncelikli sorumluluğumuz olarak görürüz.",
      en: "We consider understanding current and future customer needs, meeting expectations and continuously improving satisfaction as one of our primary responsibilities.",
    },
    codes: ["4.2", "8.2", "9.1", "SATIŞ"],
    categories: ["REAL_ESTATE_SALES", "PERFORMANCE"],
  },
  {
    key: "leadership",
    title: {
      tr: "Liderlik",
      en: "Leadership",
    },
    summary: {
      tr: "Vizyon, strateji ve kalite hedefleriyle ekibe yön vermek.",
      en: "Guide teams through vision, strategy and quality objectives.",
    },
    detail: {
      tr: "Kurumsal vizyonumuz, stratejilerimiz ve kalite hedeflerimiz doğrultusunda çalışanlarımıza yön veren, katılımı teşvik eden ve sürekli gelişimi destekleyen bir liderlik anlayışı benimseriz.",
      en: "We adopt a leadership approach that provides direction through corporate vision, strategies and quality objectives, encourages participation and supports continual development.",
    },
    codes: ["5", "6", "6.2"],
    categories: ["LEADERSHIP", "PLANNING"],
  },
  {
    key: "people-engagement",
    title: {
      tr: "Personelin Bağlılığı",
      en: "People Engagement",
    },
    summary: {
      tr: "Çalışan yetkinliğini, katılımı ve kurumsal hedeflere bağlılığı desteklemek.",
      en: "Support employee competence, participation and commitment to corporate goals.",
    },
    detail: {
      tr: "Çalışanlarımızı en değerli kaynağımız olarak kabul eder; yetkinliklerinin geliştirilmesini, karar süreçlerine katılımlarını ve kurumsal hedeflere bağlılıklarını destekleriz.",
      en: "We recognize our employees as our most valuable resource and support their competence development, participation in decisions and commitment to corporate goals.",
    },
    codes: ["7.1", "7.2", "7.3"],
    categories: ["SUPPORT"],
  },
  {
    key: "process-approach",
    title: {
      tr: "Proses Yaklaşımı",
      en: "Process Approach",
    },
    summary: {
      tr: "Tüm faaliyetleri bağlantılı süreçler olarak yönetmek, ölçmek ve geliştirmek.",
      en: "Manage activities as connected processes, then measure and improve them.",
    },
    detail: {
      tr: "Tüm faaliyetlerimizi birbirleriyle etkileşim halinde olan süreçler olarak yönetir; süreç performansını izler, ölçer ve sürekli geliştiririz.",
      en: "We manage our activities as interconnected processes, monitor and measure process performance, and continuously improve them.",
    },
    codes: ["4.4", "8", "8.1", "İNŞAAT", "SATIŞ"],
    categories: ["OPERATIONAL", "CONSTRUCTION", "REAL_ESTATE_SALES"],
  },
  {
    key: "improvement",
    title: {
      tr: "İyileştirme",
      en: "Improvement",
    },
    summary: {
      tr: "Sürekli iyileştirmeyi kültürün ayrılmaz parçası yapmak.",
      en: "Make continual improvement a core part of the culture.",
    },
    detail: {
      tr: "Sürekli iyileştirmeyi kurumsal kültürümüzün ayrılmaz bir parçası olarak kabul eder; öğrenen organizasyon anlayışıyla yenilikçi çözümler geliştiririz.",
      en: "We treat continual improvement as an integral part of our corporate culture and develop innovative solutions with a learning organization mindset.",
    },
    codes: ["10", "10.1", "10.2", "10.3", "9.3"],
    categories: ["IMPROVEMENT"],
  },
  {
    key: "evidence-based-decisions",
    title: {
      tr: "Kanıt Esaslı Karar Alma",
      en: "Evidence-Based Decision Making",
    },
    summary: {
      tr: "Kararları veri, performans göstergesi, risk analizi ve objektif değerlendirmeye dayandırmak.",
      en: "Base decisions on data, performance indicators, risk analysis and objective review.",
    },
    detail: {
      tr: "Kararlarımızı güvenilir verilere, performans göstergelerine, risk analizlerine ve objektif değerlendirmelere dayandırırız.",
      en: "We base our decisions on reliable data, performance indicators, risk analysis and objective evaluations.",
    },
    codes: ["6.1", "9", "9.1", "9.2"],
    categories: ["PERFORMANCE", "PLANNING"],
  },
];

export function policyItemsForCard(code?: string | null, category?: string | null) {
  const cleanCode = String(code || "").trim();
  const cleanCategory = String(category || "").trim();
  const exactMatches = QUALITY_POLICY_ITEMS.filter((item) =>
    item.codes.some((policyCode) => cleanCode === policyCode || cleanCode.startsWith(`${policyCode}.`)),
  );

  if (exactMatches.length > 0) return exactMatches;

  const categoryMatches = QUALITY_POLICY_ITEMS.filter((item) =>
    item.categories.includes(cleanCategory),
  );

  return categoryMatches.length > 0 ? categoryMatches : QUALITY_POLICY_ITEMS;
}

function cleanKnownText(value?: string | null) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function isKnownQualityText(value: string, candidates: string[]) {
  const clean = cleanKnownText(value);
  return !clean || candidates.some((candidate) => cleanKnownText(candidate) === clean);
}

function qualityCardCopy(code?: string | null) {
  const cleanCode = String(code || "").trim();
  return QUALITY_CARD_TRANSLATIONS[cleanCode];
}

export function qualityCardTitle(code?: string | null, fallback?: string | null, locale: QualityLocale = "tr") {
  const cleanFallback = cleanKnownText(fallback);
  const copy = qualityCardCopy(code);
  if (!copy) return cleanFallback;
  const knownTitles = [copy.title.tr, copy.title.en, ...(copy.titleAliases || [])];
  if (!isKnownQualityText(cleanFallback, knownTitles)) return cleanFallback;
  return copy.title[locale];
}

export function qualityCardDescription(code?: string | null, fallback?: string | null, locale: QualityLocale = "tr") {
  const cleanFallback = cleanKnownText(fallback);
  const copy = qualityCardCopy(code);
  if (!copy) return cleanFallback;
  const knownDescriptions = [copy.description.tr, copy.description.en, ...(copy.descriptionAliases || [])];
  if (!isKnownQualityText(cleanFallback, knownDescriptions)) return cleanFallback;
  return copy.description[locale];
}
