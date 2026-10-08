import type { PaymentSourceSnapshot } from "./types";

const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Famagusta", year: "numeric", month: "2-digit", day: "2-digit" });
type Source = Omit<PaymentSourceSnapshot, "cases">;

function auditShape(audit: Source["audit"]): boolean {
  return !!audit && ["verified", "review_required"].includes(audit.status) &&
    audit.financialChecks === "passed" && Number.isFinite(Date.parse(audit.checkedAt)) &&
    Number.isSafeInteger(audit.reviewCaseCount) && audit.reviewCaseCount >= 0 &&
    Number.isSafeInteger(audit.excludedVatRows) && audit.excludedVatRows >= 0;
}

export function sourceExpiresAt(source: Source): number {
  if (!source || !auditShape(source.audit)) return Number.NaN;
  const declared = source.freshness?.maxAgeSeconds;
  const maxAge = typeof declared === "number" && Number.isFinite(declared) ? Math.max(0, Math.min(300, declared)) : 300;
  // Parallel source and audit reads may finish in either order. The older read
  // controls the lifetime; a newer financial read cannot extend an old audit.
  return Math.min(Date.parse(source.generatedAt), Date.parse(source.audit!.checkedAt)) + maxAge * 1000;
}

export function hasSourceAudit(source: Source, now = Date.now()): boolean {
  // Old unaudited responses must not re-enter the financial UI via RAM caches.
  if (!source || !auditShape(source.audit) || !Number.isFinite(now)) return false;
  const checkedAt = Date.parse(source.audit!.checkedAt);
  return checkedAt <= now + 5000 && now < sourceExpiresAt(source) &&
    source.asOf === localDay.format(now);
}

export function isCurrentPaymentSource(source: Source, now = Date.now()): boolean {
  const generatedAt = Date.parse(source?.generatedAt);
  return !!source && source.database === "LOGO_DND" && source.view === "L_223_ODEME_PLANI" &&
    Number.isFinite(generatedAt) && generatedAt <= now + 5000 && now < sourceExpiresAt(source) &&
    source.asOf === localDay.format(now) && hasSourceAudit(source, now);
}

export function requireSourceAudit(source: Source, tr: boolean): void {
  if (!hasSourceAudit(source)) throw new Error(JSON.stringify({
    code: "PAYMENT_TRACKING_SOURCE_AUDIT_INVALID",
    message: tr ? "Kaynak tutarları doğrulanamadı. Raporu yeniden yükleyin." : "Source amounts could not be verified. Reload the report.",
  }));
}
