import type {
  Category,
  CreateTicket,
  Impact,
  Locale,
  Priority,
  TicketStatus,
  TicketSummary,
  TicketType,
  Urgency,
} from "./types";

type Labels<T extends string> = Record<T, [string, string]>;
const selectLabel = <T extends string>(
  labels: Labels<T>,
  value: T,
  locale: Locale,
) => labels[value]?.[locale === "en" ? 1 : 0] ?? value;

const typeLabels: Labels<TicketType> = {
  INCIDENT: ["Sorun / arıza", "Issue / incident"],
  REQUEST: ["İstek", "Request"],
};
const categoryLabels: Labels<Category> = {
  HARDWARE: ["Donanım", "Hardware"],
  SOFTWARE: ["Yazılım", "Software"],
  ACCESS: ["Erişim / yetki", "Access / permissions"],
  NETWORK: ["Ağ / internet", "Network / internet"],
  EMAIL: ["E-posta", "Email"],
  WEBSITE: ["Web sitesi", "Website"],
  DATA: ["Veri / rapor", "Data / reporting"],
  OTHER: ["Diğer", "Other"],
};
const statusLabels: Labels<TicketStatus> = {
  NEW: ["Yeni", "New"],
  IN_PROGRESS: ["İşlemde", "In progress"],
  WAITING_REQUESTER: ["Kullanıcıdan bilgi bekleniyor", "Waiting for requester"],
  WAITING_VENDOR: ["Dış taraf bekleniyor", "Waiting for third party"],
  RESOLVED: ["Çözüldü", "Resolved"],
  CLOSED: ["Kapandı", "Closed"],
  CANCELLED: ["İptal", "Cancelled"],
};
const priorityLabels: Labels<Priority> = {
  LOW: ["Düşük", "Low"],
  NORMAL: ["Normal", "Normal"],
  HIGH: ["Yüksek", "High"],
  URGENT: ["Acil", "Urgent"],
};
const impactLabels: Labels<Impact> = {
  SINGLE: ["Yalnızca beni", "Only me"],
  TEAM: ["Bir ekibi", "A team"],
  COMPANY: ["Şirket genelini", "The whole company"],
};
const urgencyLabels: Labels<Urgency> = {
  LOW: ["Planlanabilir", "Can be scheduled"],
  NORMAL: ["İşimi yavaşlatıyor", "Slowing down my work"],
  HIGH: ["Çalışamıyorum", "Unable to work"],
};

export const typeLabel = (value: TicketType, locale: Locale = "tr") =>
  selectLabel(typeLabels, value, locale);
export const categoryLabel = (value: Category, locale: Locale = "tr") =>
  selectLabel(categoryLabels, value, locale);
export const statusLabel = (value: TicketStatus, locale: Locale = "tr") =>
  selectLabel(statusLabels, value, locale);
export const priorityLabel = (value: Priority, locale: Locale = "tr") =>
  selectLabel(priorityLabels, value, locale);
export const impactLabel = (value: Impact, locale: Locale = "tr") =>
  selectLabel(impactLabels, value, locale);
export const urgencyLabel = (value: Urgency, locale: Locale = "tr") =>
  selectLabel(urgencyLabels, value, locale);

const fieldLabels: Record<string, [string, string]> = {
  subject: ["Konu", "Subject"],
  description: ["Açıklama", "Description"],
  type: ["Kayıt türü", "Ticket type"],
  category: ["Kategori", "Category"],
  priority: ["Öncelik", "Priority"],
  status: ["Durum", "Status"],
  impact: ["Etki", "Impact"],
  urgency: ["Aciliyet", "Urgency"],
  system: ["Sistem / cihaz", "System / device"],
  location: ["Konum", "Location"],
  assigneeId: ["Sorumlu", "Assignee"],
  dueAt: ["Hedef tarih", "Due date"],
  reason: ["İşlem açıklaması", "Action reason"],
  resolution: ["Çözüm", "Resolution"],
  requesterId: ["Başvuru sahibi", "Requester"],
  visibility: ["Görünürlük", "Visibility"],
  attachments: ["Dosyalar", "Attachments"],
  firstResponseAt: ["İlk yanıt", "First response"],
  resolvedAt: ["Çözülme zamanı", "Resolved at"],
  closedAt: ["Kapanma zamanı", "Closed at"],
  createdAt: ["Oluşturulma zamanı", "Created at"],
  updatedAt: ["Güncellenme zamanı", "Updated at"],
};
export const fieldLabel = (value: string, locale: Locale = "tr") =>
  fieldLabels[value]?.[locale === "en" ? 1 : 0] ?? value;

export function emptyTicket(): CreateTicket {
  return {
    subject: "",
    description: "",
    type: "INCIDENT",
    category: "OTHER",
    impact: "SINGLE",
    urgency: "NORMAL",
    system: "",
    location: "",
  };
}

export function suggestedPriority(impact: Impact, urgency: Urgency): Priority {
  if (impact === "COMPANY" && urgency === "HIGH") return "URGENT";
  if (
    (impact === "TEAM" && urgency === "HIGH") ||
    (impact === "COMPANY" && urgency === "NORMAL")
  )
    return "HIGH";
  if (impact === "SINGLE" && urgency === "LOW") return "LOW";
  return "NORMAL";
}

export function isOpen(status: TicketStatus): boolean {
  return (
    status === "NEW" ||
    status === "IN_PROGRESS" ||
    status === "WAITING_REQUESTER" ||
    status === "WAITING_VENDOR"
  );
}

function parseDateTime(value: string | null | undefined): Date | null {
  if (!value) return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})(?:T|$)/.exec(value);
  if (!day) return null;
  const year = Number(day[1]),
    month = Number(day[2]),
    date = Number(day[3]);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, date);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== date
  )
    return null;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

export function isOverdue(
  ticket: Pick<TicketSummary, "status" | "dueAt">,
  now: Date = new Date(),
): boolean {
  if (!isOpen(ticket.status)) return false;
  const due = parseDateTime(ticket.dueAt);
  return (
    due !== null &&
    Number.isFinite(now.getTime()) &&
    due.getTime() < now.getTime()
  );
}

export function formatDateTime(
  value: string | null | undefined,
  locale: Locale = "tr",
): string {
  const date = parseDateTime(value);
  return date
    ? new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "tr-TR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date)
    : "—";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes,
    unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${unit === 0 ? Math.floor(value) : Math.round(value * 10) / 10} ${units[unit]}`;
}
