import type {
  PaymentTrackingRow,
  PaymentStatus,
  PaymentSourceCase,
} from "./types";

export const trackingHref = (key: string) =>
  `/finance/payment-tracking/${encodeURIComponent(key)}`;

const numberFormatters = ["en-GB", "tr-TR"].map(
  (locale) => new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
);
const dateFormatters = ["en-GB", "tr-TR"].map((locale) => ({
  date: new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "Asia/Famagusta",
  }),
  time: new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Famagusta",
  }),
}));

export function money(value: number | null | undefined, tr: boolean) {
  return value == null || !Number.isFinite(value)
    ? "—"
    : numberFormatters[tr ? 1 : 0].format(value);
}

export function currencyName(value: string | null | undefined, tr: boolean) {
  if (value == null || !value.trim())
    return tr ? "Döviz belirtilmemiş" : "Unspecified currency";
  return /^\d+$/.test(value)
    ? `${tr ? "Döviz kodu" : "Currency code"} ${value}`
    : value;
}

export function dateLabel(
  value: string | null | undefined,
  tr: boolean,
  withTime = false,
) {
  if (!value) return "—";
  const date = new Date(withTime ? value : `${value.slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(date.getTime())) return "—";
  return dateFormatters[tr ? 1 : 0][withTime ? "time" : "date"].format(date);
}

export function statusLabel(
  status: PaymentTrackingRow["trackingStatus"] | PaymentStatus,
  tr: boolean,
) {
  const labels = {
    overdue: ["Gecikmiş", "Overdue"],
    deferred: ["Ertelendi", "Deferred"],
    today: ["Bugün", "Today"],
    upcoming: ["Gelecek", "Upcoming"],
    paid: ["Ödendi", "Paid"],
    unknown: ["Bilgi eksik", "Incomplete"],
  };
  return labels[status]?.[tr ? 0 : 1] || status;
}

export function problem(cause: unknown, tr: boolean) {
  const raw = cause instanceof Error ? cause.message : String(cause);
  let code = "",
    status = 0,
    message = raw;
  try {
    const body = JSON.parse(raw) as {
      code?: string;
      statusCode?: number;
      message?: string | string[];
    };
    code = body.code || "";
    status = body.statusCode || 0;
    if (body.message)
      message = Array.isArray(body.message)
        ? body.message.join(" · ")
        : body.message;
  } catch {
    /* Plain transport errors have no JSON body. */
  }
  const conflict = status === 409 || /VERSION|CONFLICT/.test(code);
  if (conflict)
    message = tr
      ? "Bu dosya başka bir kullanıcı tarafından değiştirildi. Güncel dosyayı yükleyip işleminizi yeniden değerlendirin."
      : "Another user changed this case. Reload the latest case and review your change before trying again.";
  else if (code === "LOGO_DB_UNAVAILABLE")
    message = tr
      ? "Ödeme kaynağı şu anda okunamıyor. Lütfen yeniden deneyin."
      : "The payment source is currently unavailable. Please retry.";
  const discardSource = code === "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID" ||
    status === 401 || status === 403 || /Unauthorized|Forbidden|Session expired/.test(raw);
  return { message, conflict, code, discardSource };
}

export function composeLink(
  channel: "email" | "whatsapp",
  recipient: string,
  subject: string,
  body: string,
) {
  const address = recipient.trim();
  if (channel === "email") {
    if (
      !/^[^\s@,;?&#]+@[^\s@,;?&#]+\.[^\s@,;?&#]+$/.test(address) ||
      /[\r\n]/.test(address)
    )
      return null;
    return `mailto:${encodeURIComponent(address)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
  if (!/^\+?[\d\s().-]+$/.test(address)) return null;
  const digits = address.replace(/\D/g, "");
  const international = address.startsWith("00") ? digits.slice(2) : digits;
  if (!/^[1-9]\d{7,14}$/.test(international)) return null;
  return `https://wa.me/${international}?text=${encodeURIComponent(body)}`;
}

export function authorizationLabel(
  value: PaymentSourceCase["authorization"],
  tr: boolean,
): string {
  if (!value || value.status === "unavailable")
    return tr ? "Kaynak okunamıyor" : "Source unavailable";
  if (value.status === "unmatched") return tr ? "Eşleşmedi" : "Unmatched";
  if (!value.codes.length) return tr ? "Kod boş" : "Code blank";
  return `${value.codes.join(" · ")}${value.hasBlank ? (tr ? " · boş kayıt da var" : " · also has blank records") : ""}`;
}
