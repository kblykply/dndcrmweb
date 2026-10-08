import type {
  FactorImpact,
  Health,
  LinkKind,
  Locale,
  Priority,
  ProjectStatus,
  RecordKind,
  WorkstreamStatus,
} from "./types";

const kinds: Record<Locale, Record<RecordKind, string>> = {
  tr: { PROJECT: "Proje", PROCESS: "Süreç" },
  en: { PROJECT: "Project", PROCESS: "Process" },
};
const statuses: Record<Locale, Record<ProjectStatus, string>> = {
  tr: {
    PLANNED: "Planlandı",
    ACTIVE: "Aktif",
    PAUSED: "Duraklatıldı",
    COMPLETED: "Tamamlandı",
    ARCHIVED: "Arşivlendi",
  },
  en: {
    PLANNED: "Planned",
    ACTIVE: "Active",
    PAUSED: "Paused",
    COMPLETED: "Completed",
    ARCHIVED: "Archived",
  },
};
const priorities: Record<Locale, Record<Priority, string>> = {
  tr: { LOW: "Düşük", NORMAL: "Normal", HIGH: "Yüksek", CRITICAL: "Kritik" },
  en: { LOW: "Low", NORMAL: "Normal", HIGH: "High", CRITICAL: "Critical" },
};
const health: Record<Locale, Record<Health, string>> = {
  tr: {
    NOT_SET: "Henüz belirtilmedi",
    ON_TRACK: "Yolunda",
    AT_RISK: "Riskli",
    BLOCKED: "Engellendi",
  },
  en: {
    NOT_SET: "Not specified",
    ON_TRACK: "On track",
    AT_RISK: "At risk",
    BLOCKED: "Blocked",
  },
};
const workstreams: Record<Locale, Record<WorkstreamStatus, string>> = {
  tr: {
    PLANNED: "Planlandı",
    ACTIVE: "Devam ediyor",
    WAITING: "Bekliyor",
    PAUSED: "Duraklatıldı",
    DONE: "Tamamlandı",
  },
  en: {
    PLANNED: "Planned",
    ACTIVE: "In progress",
    WAITING: "Waiting",
    PAUSED: "Paused",
    DONE: "Done",
  },
};
const impacts: Record<Locale, Record<FactorImpact, string>> = {
  tr: { INFO: "Bilgi", RISK: "Risk", BLOCKING: "Engelleyici" },
  en: { INFO: "Information", RISK: "Risk", BLOCKING: "Blocking" },
};
const links: Record<Locale, Record<LinkKind, string>> = {
  tr: {
    WEBSITE: "Web sitesi",
    PANEL: "Panel",
    REPOSITORY: "Kod deposu",
    DOCUMENT: "Belge",
    OTHER: "Diğer",
  },
  en: {
    WEBSITE: "Website",
    PANEL: "Panel",
    REPOSITORY: "Repository",
    DOCUMENT: "Document",
    OTHER: "Other",
  },
};
const fields: Record<Locale, Record<string, string>> = {
  tr: {
    kind: "Kayıt türü",
    name: "Ad",
    summary: "Özet",
    objective: "Amaç / beklenen sonuç",
    status: "Durum",
    priority: "Öncelik",
    health: "İşin gidişatı",
    ownerId: "Sorumlu",
    startDate: "Başlangıç tarihi",
    targetDate: "Hedef tarihi",
    cadence: "Tekrarlanma sıklığı",
    progress: "İlerleme",
    nextStep: "Sonraki adım",
    links: "Bağlantılar",
    workstreams: "İş dağılımı",
    factors: "Dış faktörler",
    title: "Görev / unvan",
    contact: "İletişim",
    isActive: "Üye aktifliği",
    userId: "İlişkili kullanıcı",
    body: "Durum notu",
  },
  en: {
    kind: "Record type",
    name: "Name",
    summary: "Summary",
    objective: "Purpose / expected outcome",
    status: "Status",
    priority: "Priority",
    health: "Health",
    ownerId: "Owner",
    startDate: "Start date",
    targetDate: "Target date",
    cadence: "Cadence",
    progress: "Progress",
    nextStep: "Next step",
    links: "Links",
    workstreams: "Responsibilities",
    factors: "External factors",
    title: "Role / title",
    contact: "Contact",
    isActive: "Member active status",
    userId: "Linked user",
    body: "Status note",
  },
};

export const kindLabel = (value: RecordKind, locale: Locale) =>
  kinds[locale][value];
export const statusLabel = (value: ProjectStatus, locale: Locale) =>
  statuses[locale][value];
export const priorityLabel = (value: Priority, locale: Locale) =>
  priorities[locale][value];
export const healthLabel = (value: Health, locale: Locale) =>
  health[locale][value];
export const workstreamStatusLabel = (
  value: WorkstreamStatus,
  locale: Locale,
) => workstreams[locale][value];
export const factorImpactLabel = (value: FactorImpact, locale: Locale) =>
  impacts[locale][value];
export const linkKindLabel = (value: LinkKind, locale: Locale) =>
  links[locale][value];
export const activityFieldLabel = (field: string, locale: Locale) =>
  fields[locale][field] || field;
