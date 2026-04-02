const tr = {
  common: {
    save: "Kaydet",
    cancel: "Vazgeç",
    delete: "Sil",
    edit: "Düzenle",
    close: "Kapat",
    refresh: "Yenile",
    loading: "Yükleniyor...",
    search: "Ara",
    today: "Bugün",
    upcoming: "Yaklaşanlar",
    noRecords: "Kayıt yok.",
    openRecord: "Kaydı Aç",
    details: "Detay",
    assignedTo: "Sorumlu",
    previous: "Önceki",


      
  saving: "Kaydediliyor...",
  reset: "Sıfırla" ,
  deleting: "Siliniyor..." ,


next: "Sonraki" ,
refreshing: "Yenileniyor...",
  searchRefresh: "Ara / Yenile" ,
  open: "Aç",


create: "Oluştur" ,
  },
  nav: {
    leads: "Leadler",
    customers: "Müşteriler",
    agencies: "Ajanslar",
    calendar: "Takvim",
    admin: "Admin Panel",
    users: "Kullanıcılar",
    managerQueue: "Yönetici Kuyruğu",
    help: "Yardım & Destek",
      tasks: "Görevler"

  },
  dashboard: {
    title: "CRM Dashboard",
    subtitle: "Lead akışı, çağrı performansı, ekip yapısı ve takip görünümü",
    totalLeads: "Toplam Lead",
    leadsLast7: "Son 7 Gün Lead",
    totalCalls: "Toplam Arama",
    callsLast7: "Son 7 Gün Arama",
    workingLead: "Working Lead",
    managerReview: "Manager Review",
    assigned: "Assigned",
    wonLost: "Won / Lost",
    overdue: "Takibi Geciken",
    followupsToday: "Bugünkü Takip",
    upcoming7: "Önümüzdeki 7 Gün",
  },
  calendar: {
    label: "CRM Takvim",
    title: "Operasyon Takvimi",
    subtitle: "Lead takipleri, ajans toplantıları, görevler, sunumlar ve aktiviteler",
    allRecords: "Tüm Kayıtlar",
    leadFollowups: "Lead Takipleri",
    leadCalls: "Lead Aramaları",
    agencyMeetings: "Ajans Toplantıları",
    agencyTasks: "Ajans Görevleri",
    presentations: "Sunumlar",
    calendar: "Takvim",
    visibleRange: "Görünür tarih aralığı kadar veri yüklenir.",
    notes: "Not / Detay",
    record: "Kayıt",
    todayEvents: "Bugün Olanlar",
  },

  eventTypes: {
    LEAD_FOLLOWUP: "Lead Takibi",
    LEAD_CALL: "Lead Araması",
    AGENCY_MEETING: "Ajans Toplantısı",
    AGENCY_TASK: "Ajans Görevi",
    PRESENTATION: "Sunum",
  },
  statuses: {
    INTERESTED: "İlgilendi",
    CALL_AGAIN: "Tekrar Ara",
    NO_ANSWER: "Cevap Yok",
    DONE: "Tamamlandı",
    WON: "Kazanıldı",
    LOST: "Kaybedildi",
    ACTIVE: "Aktif",
    PASSIVE: "Pasif",
    PROSPECT: "Aday",
    DEALING: "Görüşülüyor",
    CLOSED: "Kapandı",
  },



  customerTypes: {
  POTENTIAL: "Potansiyel",
  EXISTING: "Mevcut",
},

customers: {
  label: "Sunum & Müşteri Yönetimi",
  title: "Müşteriler",
  subtitle: "Potansiyel ve mevcut müşteriler, sunum geçmişiyle birlikte burada tutulur",
  newCustomer: "Yeni Müşteri",
  createTitle: "Yeni Müşteri Oluştur",
  createCustomer: "Müşteri Oluştur",
  saving: "Kaydediliyor...",
  deleting: "Siliniyor...",
  allTypes: "Tüm Tipler",
  searchAndRefresh: "Ara / Yenile",
  searchPlaceholder: "Müşteri, telefon, e-posta, ajans ara...",
  noCustomers: "Müşteri bulunamadı.",
  deleteConfirm: "\"{name}\" müşterisini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
  fields: {
    fullName: "Ad Soyad",
    companyName: "Şirket / Kurum",
    phone: "Telefon",
    email: "E-posta",
    city: "Şehir",
    country: "Ülke",
    address: "Adres",
    source: "Kaynak",
    notesSummary: "Özet not",
    selectAgency: "Ajans seç",
    ownerSales: "Sorumlu Sales",
    selectOwnerSales: "Sorumlu sales seç"
  },
  table: {
    customer: "MÜŞTERİ",
    contact: "İLETİŞİM",
    agency: "AJANS",
    type: "TİP",
    presentations: "SUNUM SAYISI",
    updatedAt: "GÜNCELLEME",
    actions: "İŞLEMLER",
        ownerSales: "Sorumlu Sales"

  },


    limitedAccessNotice: "Size ait olmayan müşteriler için iletişim bilgileri gizlenmiştir. Detay sayfasında yalnızca kendi müşterilerinizi düzenleyebilirsiniz."




},



presentationStatuses: {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal Edildi",
  RESCHEDULED: "Yeniden Planlandı",
},

presentationOutcomes: {
  POSITIVE: "Olumlu",
  NEGATIVE: "Olumsuz",
  FOLLOW_UP: "Takip Gerekli",
  NO_DECISION: "Karar Yok",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
},

customerDetail: {
  customerIdMissing: "Müşteri ID bulunamadı.",
  loadingCustomer: "Müşteri yükleniyor…",
  notFoundTitle: "Müşteri Bulunamadı",
  notFoundText: "Böyle bir müşteri yok.",
  backToCustomers: "Müşterilere Dön",
  noAgency: "Ajans yok",

  customerInfo: "Müşteri Bilgileri",
  newPresentation: "Yeni Sunum Ekle",
  createPresentation: "Sunum Oluştur",
  presentationHistory: "Sunum Geçmişi",
  noPresentations: "Henüz sunum kaydı yok.",
  presentationNotes: "Sunum Notları",
  noNotes: "Henüz not yok.",
  addNote: "Not Ekle",
  addNotePlaceholder: "Bu sunuma not ekle...",
  selectOutcome: "Outcome seç",

  salesLabel: "Sales",
  createdByLabel: "Oluşturan",

  stats: {
    totalPresentations: "Toplam Sunum",
    scheduled: "Planlı",
    completed: "Tamamlanan",
    won: "Kazanılan",
  },

  fields: {
    phone: "Telefon",
    email: "E-posta",
    agency: "Ajans",
    city: "Şehir",
    country: "Ülke",
    source: "Kaynak",
        ownerSales: "Sorumlu Sales"


  },

  presentationFields: {
    title: "Sunum başlığı",
    projectName: "Proje adı",
    location: "Lokasyon",
    selectSales: "Sales temsilcisi seç",
    summaryNote: "Sunum özet notu",
  },
},



agencyStatuses: {
  ACTIVE: "Aktif",
  PASSIVE: "Pasif",
  PROSPECT: "Aday",
  DEALING: "Görüşülüyor",
  CLOSED: "Kapandı",
},

agencies: {
  label: "Ajans Yönetimi",
  title: "Ajanslar",
  subtitle: "Manager ve sales ekipleri için ajans kayıtları, notlar, toplantılar ve görevler",
  newAgency: "Yeni Ajans",
  createTitle: "Yeni Ajans Oluştur",
  createAgency: "Ajans Oluştur",
  saving: "Kaydediliyor...",
  deleting: "Siliniyor...",
  allStatuses: "Tüm Durumlar",
  perPage: "sayfa",
  page: "Sayfa",
  searchAndRefresh: "Ara / Yenile",
  searchPlaceholder: "Ajans, yetkili, telefon, şehir ara...",
  noAgencies: "Ajans bulunamadı.",
  deleteConfirm: "\"{name}\" ajansını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.",
  counts: {
    notes: "Not",
    meetings: "Toplantı",
    tasks: "Görev",
  },
  fields: {
    name: "Ajans adı",
    contactName: "Yetkili kişi",
    phone: "Telefon",
    email: "E-posta",
    city: "Şehir",
    country: "Ülke",
    website: "Website",
    source: "Kaynak",
    notesSummary: "Özet not",
    selectSales: "Sales temsilcisi seç",
    sales: "Sales",
        address: "Adres",

  },
  table: {
    agency: "AJANS",
    contact: "İLETİŞİM",
    sales: "SALES",
    status: "DURUM",
    counts: "NOT / TOPLANTI / GÖREV",
    updatedAt: "GÜNCELLEME",
    actions: "İŞLEMLER",
  },
  
},



taskStatuses: {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam Ediyor",
  DONE: "Tamamlandı",
  CANCELLED: "İptal Edildi",
},

taskPriorities: {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
},

agencyDetail: {
  agencyIdMissing: "Ajans ID bulunamadı.",
  loadingAgency: "Ajans yükleniyor…",
  notFoundTitle: "Ajans Bulunamadı",
  notFoundText: "Böyle bir ajans yok.",
  backToAgencies: "Ajanslara Dön",
  updatedAlert: "Ajans güncellendi.",

  managerLabel: "Manager",
  salesLabel: "Sales",

  agencyInfo: "Ajans Bilgileri",
  summaryNote: "Ajans özet notu",
  saveAgency: "Ajansı Kaydet",

  notesTitle: "Notlar",
  addNote: "Not Ekle",
  addNotePlaceholder: "Ajans notu ekle...",
  noNotes: "Henüz not yok.",

  meetingsTitle: "Toplantılar",
  addMeeting: "Toplantı Ekle",
  noMeetings: "Henüz toplantı yok.",

  tasksTitle: "Görevler",
  addTask: "Görev Ekle",
  noTasks: "Henüz görev yok.",
  unassigned: "Atanmamış",
  noDate: "Tarih yok",

  stats: {
    notes: "Not",
    meetings: "Toplantı",
    tasks: "Görev",
    openTasks: "Açık Görev",
  },

  meetingFields: {
    title: "Toplantı başlığı",
    notes: "Toplantı notu",
  },

  taskFields: {
    title: "Görev başlığı",
    description: "Açıklama",
  },
},



leadStatuses: {
  NEW: "Yeni",
  WORKING: "İşleniyor",
  SALES_READY: "Satışa Hazır",
  MANAGER_REVIEW: "Manager İncelemesinde",
  ASSIGNED: "Atandı",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
},

leadOutcomes: {
  OPENED: "Açıldı / Bağlandı",
  NO_ANSWER: "Cevap yok",
  BUSY: "Meşgul",
  UNREACHABLE: "Ulaşılamıyor",
  CALL_AGAIN: "Tekrar ara",
  INTERESTED: "İlgilendi",
  NOT_INTERESTED: "İlgilenmiyor",
  QUALIFIED: "Nitelikli (Satışa hazır)",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
  WRONG_NUMBER: "Yanlış numara",
},

leads: {
  label: "Kişiler",
  title: "Leadler",
  leadCount: "Lead",
  newLead: "Yeni Lead",
  createTitle: "Lead Oluştur",
  referencePartners: "Referans Ortaklar",
  allStatuses: "Tüm Durumlar",
  noLeads: "Lead bulunamadı.",
  noFollowUp: "Takip yok",
  callSummary: "Arama",
  sourceLabel: "Kaynak",
  call: "Ara",
  saving: "Kaydediliyor…",
  searchPlaceholder: "İsim, telefon, email veya kaynak ara…",
  dayShort: "g",
  fields: {
    fullName: "Ad Soyad",
    phone: "Telefon",
    source: "Kaynak",
  },
  table: {
    name: "İSİM",
    contact: "İLETİŞİM",
    status: "DURUM",
    followUp: "TAKİP",
    callResult: "ARAMA SONUCU",
    save: "KAYDET",
  },
},




activityTypes: {
  CALL: "Arama",
  NOTE: "Not",
  MEETING: "Toplantı",
  WHATSAPP: "WhatsApp",
  EMAIL: "E-posta",
  STATUS_CHANGE: "Durum Değişikliği",
  ASSIGNMENT: "Atama",
},

leadDetail: {
  idMissing: "Sayfa hatası: Lead ID bulunamadı.",
  loadingLead: "Lead yükleniyor…",
  backToActiveLeads: "Aktif Leadler",
  lastActivity: "Son Aktivite",
  createdAt: "Oluşturulma",
  noEmail: "e-posta yok",
  more: "Daha Fazla",

  tabs: {
    activity: "Aktivite",
    details: "Detaylar",
    documents: "Dokümanlar",
    notes: "Notlar",
  },

  recentActivities: "Son Aktiviteler",
  noActivities: "Henüz aktivite yok.",

  quickActions: "Hızlı İşlemler",
  assignments: "Atamalar",
  manager: "Yönetici",
  sales: "Satış",
  callCenter: "Çağrı Merkezi",
  managerRole: "Yönetici",
  salesRole: "Satış",

  setWorking: "WORKING Yap",
  setSalesReady: "SALES_READY Yap",
  selectManager: "Yönetici seç",
  sendToManager: "Yöneticiye Gönder",
  selectSales: "Satış temsilcisi seç",
  assign: "Ata",
  reassign: "Yeniden Ata",
  markWon: "Kazanıldı",
  markLost: "Kaybedildi",
  leadClosed: "Bu lead kapatıldı.",

  addActivity: "Aktivite Ekle",
  callOutcome: "Arama sonucu",
  summary: "Özet",
  notesOptional: "Notlar (opsiyonel)",
  followUpOptional: "Takip tarihi (opsiyonel)",
  callPrefix: "Arama",
  defaultCallSummary: "Arama yapıldı",
  hourShort: "s",

  tip: "İpucu: Nitelikli → SALES_READY yapar. Kazanıldı/Kaybedildi lead'i kapatır.",
},

roles: {
  ADMIN: "Admin",
  CALLCENTER: "Çağrı Merkezi",
  MANAGER: "Yönetici",
  SALES: "Satış",
},

admin: {
  title: "CRM Dashboard",
  subtitle: "Lead akışı, çağrı performansı, ekip yapısı ve takip görünümü",
  refresh: "Dashboard Yenile",
  loadingDashboard: "Dashboard yükleniyor…",
  unauthorizedTitle: "Yetkisiz Erişim",
  unauthorizedText: "Bu sayfayı yalnızca ADMIN ve MANAGER kullanıcıları görebilir.",
  today: "Bugün",
  last30Days: "Son 30 gün",

  cards: {
    totalLeads: "Toplam Lead",
    last7DaysLeads: "Son 7 Gün Lead",
    totalCalls: "Toplam Arama",
    last7DaysCalls: "Son 7 Gün Arama",
    wonLost: "Kazanılan / Kaybedilen",
    overdueFollowups: "Takibi Geciken",
    todayFollowups: "Bugünkü Takip",
    next7Days: "Önümüzdeki 7 Gün",
  },

  charts: {
    newLeads14Days: "Son 14 Günde Yeni Lead",
    newLeads14DaysSub: "Gün bazlı yeni lead trendi",
    leadStatusDistribution: "Lead Statü Dağılımı",
    leadStatusDistributionSub: "Pipeline durumlarının dağılımı",
    calls14Days: "Son 14 Günde Arama",
    calls14DaysSub: "Çağrı aktivitesinin günlük trendi",
    pipelineSummary: "Pipeline Özeti",
    pipelineSummarySub: "Ana satış akışındaki lead sayıları",
  },

  stats: {
    activeUsersByRole: "Aktif Kullanıcı Rolleri",
    flowSummary: "Flow Özeti",
    callResultSummary: "Arama Sonuç Özeti",
  },

  flow: {
    sentToManager: "Manager’a Gönderilen",
    assignedToSales: "Sales’e Atanan",
  },

  callSummary: {
    answered: "Yanıtlanan",
    unanswered: "Cevapsız / Ulaşılamadı",
  },
},




managerQueue: {
  title: "İnceleme Kuyruğu",
  searchPlaceholder: "İsim / telefon ara...",
  selectSalesFirst: "Önce bir satış temsilcisi seçin.",
  returnedToCallCenter: "Çağrı Merkezine iade edildi",
  returnedToCallCenterDetail:
    "Yönetici, daha fazla bilgi/ön eleme için lead'i geri gönderdi.",
  lastActivity: "Son aktivite",
  selectSales: "Satış temsilcisi seç",
  assign: "Ata",
  sendToCallCenter: "Çağrı Merkezine Gönder",
  noLeads: "MANAGER_REVIEW durumunda lead yok.",

  table: {
    lead: "LEAD",
    phone: "TELEFON",
    status: "DURUM",
    followUp: "TAKİP",
    assignToSales: "SATIŞA ATA",
    actions: "İŞLEMLER",
  },
},
adminUsers: {
  title: "Kullanıcı Yönetimi",
  createTitle: "Yeni Kullanıcı Oluştur",
  create: "Oluştur",
  creating: "Oluşturuluyor...",
  searchPlaceholder: "Kullanıcı ara...",
  active: "Aktif",
  passive: "Pasif",
  deactivate: "Pasife Al",
  noUsers: "Kullanıcı bulunamadı.",
  confirmDeactivate: "Bu kullanıcı pasif hale getirilsin mi?",
  unauthorizedText: "Bu sayfayı görüntülemek için ADMIN olmalısınız.",

  fields: {
    name: "Ad Soyad",
    email: "E-posta",
    password: "Şifre",
    selectManager: "Yönetici seç",
  },

  table: {
    name: "AD",
    email: "E-POSTA",
    role: "ROL",
    status: "DURUM",
    createdAt: "OLUŞTURULMA",
    action: "İŞLEM",
  },
},
adminUserDetail: {
  loading: "Kullanıcı yükleniyor…",
  notFoundTitle: "Kullanıcı Bulunamadı",
  notFoundText: "Böyle bir kullanıcı yok.",
  backToUsers: "Kullanıcılara Dön",
  createdAt: "Oluşturulma",
  userInfoTitle: "Kullanıcı Bilgileri",
  newPassword: "Yeni Şifre",
  passwordPlaceholder: "Boş bırakırsanız değişmez",
  manager: "Yönetici",
  dangerZoneTitle: "Tehlikeli İşlemler",
  dangerZoneText:
    "Gerçek kullanıcılar için önce Pasife Al kullanmanız önerilir. Silme işlemi kalıcıdır.",
  deleteUser: "Kullanıcıyı Sil",
  forceDeleteTestUser: "Test Kullanıcıyı Zorla Sil",
  processing: "İşleniyor...",

  alerts: {
    updated: "Kullanıcı güncellendi.",
    deactivated: "Kullanıcı pasif hale getirildi.",
    deleted: "Kullanıcı silindi.",
    forceDeleted: "Kullanıcı zorla silindi.",
  },

  errors: {
    missingUserId: "Kullanıcı ID bulunamadı.",
    cannotDeleteSelf: "Kendi hesabınızı silemezsiniz.",
    cannotForceDeleteSelf: "Kendi hesabınızı zorla silemezsiniz.",
    userNotFound: "Kullanıcı bulunamadı.",
    emailAlreadyUsed: "Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor.",
    passwordMin: "Şifre en az 8 karakter olmalıdır.",
    managerNotFound: "Seçilen yönetici bulunamadı veya pasif durumda.",
    managerRoleInvalid: "Seçilen yönetici MANAGER veya ADMIN rolünde olmalıdır.",
    relatedRecords:
      "Bu kullanıcıya ait ilişkili CRM kayıtları bulunduğu için silinemez. Önce bağlı kayıtlar temizlenmeli veya kullanıcı pasife alınmalıdır.",
    forceDeleteOnlyTest: "Zorla silme yalnızca test kullanıcıları için kullanılabilir.",
    unauthorized: "Oturum süreniz dolmuş olabilir. Lütfen tekrar giriş yapın.",
  },

  confirmDeactivate: "Bu kullanıcı pasif hale getirilsin mi?",
  confirmDelete: "Bu kullanıcı kalıcı olarak silinsin mi? Bu işlem geri alınamaz.",
  confirmForceDelete:
    "Bu işlem test kullanıcıyı zorla silecektir. İlişkili görev, aktivite, audit ve atama kayıtları da temizlenebilir. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?",

  deleteBlockers: {
    title: "Bu kullanıcı silinemiyor. Bağlı kayıtlar bulundu:",
    callcenterLeads: "Call Center Lead",
    managedLeads: "Manager Lead",
    salesLeads: "Sales Lead",
    activities: "Aktivite",
    tasksCreated: "Oluşturduğu Görev",
    tasksAssigned: "Atanan Görev",
    audits: "Audit Log",
    stageChanges: "Stage Change",
    reps: "Alt Kullanıcı (reps)",
    footer: "Önce bu kayıtları temizleyin veya kullanıcıyı pasife alın.",
  },
},



adminLeads: {
  title: "Lead Temizliği",
  subtitle: "Test leadlerini veya eski gereksiz kayıtları toplu olarak silebilirsiniz.",
  searchPlaceholder: "Lead ara...",
  deleteSelected: "Seçilileri Sil",
  allStatuses: "Tüm Durumlar",
  noLeads: "Lead bulunamadı.",
  unauthorizedText: "Bu sayfa yalnızca ADMIN kullanıcılar içindir.",

  table: {
    fullName: "AD SOYAD",
    phone: "TELEFON",
    email: "E-POSTA",
    source: "KAYNAK",
    status: "DURUM",
    lastActivity: "SON AKTİVİTE",
    createdAt: "OLUŞTURULMA",
  },

  errors: {
    selectAtLeastOne: "Silmek için en az bir lead seçmelisiniz.",
    onlyAdmin: "Bu işlem yalnızca ADMIN kullanıcılar tarafından yapılabilir.",
  },

  confirmDelete: "{{count}} lead kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek istiyor musunuz?",
  deletedAlert: "{{count}} lead silindi.",
},
} as const;

export default tr;