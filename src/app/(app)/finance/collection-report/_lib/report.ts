import { paymentKinds } from "../../payment-tracking/_lib/payment-kinds";
import { isPaymentProjectGroup, paymentProjectGroups } from "../../payment-tracking/_lib/project-groups";
import { ALL_CURRENCIES, currencyToken } from "../../payment-tracking/_lib/list-currencies";
import type { CollectionAgingKey, CollectionDetailScope, CollectionFilters, CollectionReportData, CollectionTotals } from "./types";
import { hasSourceAudit, sourceExpiresAt } from "../../payment-tracking/_lib/source-integrity";
import { hasAnalyticsContract } from "./analytics-contract";
import { DEFAULT_INVOICE_OK, hasInvoiceOkContract, readInvoiceOk } from "../../payment-tracking/_lib/invoice-ok";

export const authorizationStates = ["all", "coded", "blank", "mixed", "unmatched", "multiple"] as const;
export const collectionAgingKeys = ["1_30", "31_60", "61_90", "90_plus"] as const;
export const collectionDetailScopes = ["month", "overdue", "period", "undated"] as const;
export const reportDefaults: CollectionFilters = {
  invoiceOk: DEFAULT_INVOICE_OK,
  currency: "", paymentKind: "sale", projectGroup: "", representative: "", representativeState: "", authorizationState: "blank",
  startMonth: "", months: 6, detailMonth: "", detailScope: "month", agingBucket: "", page: 1, pageSize: 25,
};
export function validMonth(value: string): boolean {
  return /^(?:17(?:5[3-9]|[6-9]\d)|1[89]\d{2}|[2-8]\d{3}|9(?:[0-8]\d{2}|9[0-8]\d|99[0-8]))-(?:0[1-9]|1[0-2])$/.test(value);
}
export function shiftMonth(value: string, offset: number): string {
  const [year, month] = value.split("-").map(Number);
  const serial = year * 12 + month - 1 + offset;
  return `${Math.floor(serial / 12).toString().padStart(4, "0")}-${(serial % 12 + 1).toString().padStart(2, "0")}`;
}
export function readReportFilters(params: URLSearchParams): CollectionFilters {
  const paymentKind = params.get("paymentKind") || "sale";
  const projectGroup = params.get("projectGroup") || "";
  const authorizationState = params.get("authorizationState") || "blank";
  const page = Number(params.get("page") || 1);
  const pageSize = Number(params.get("pageSize") || 25);
  const months = Number(params.get("months") || 6);
  const representativeState = params.get("representativeState") || "";
  const detailScope = params.get("detailScope") || "month";
  const agingBucket = params.get("agingBucket") || "";
  return {
    invoiceOk: readInvoiceOk(params.get("invoiceOk"), reportDefaults.invoiceOk),
    currency: params.get("currency") || "",
    paymentKind: paymentKinds.find((kind) => kind === paymentKind) || "sale",
    projectGroup: isPaymentProjectGroup(projectGroup) ? projectGroup : "",
    representative: params.get("representative") || "",
    representativeState: representativeState === "multiple" || representativeState === "unassigned" ? representativeState : "",
    authorizationState: (authorizationStates as readonly string[]).includes(authorizationState) ? authorizationState : "blank",
    startMonth: params.get("startMonth") || "",
    months: months === 12 || months === 24 ? months : 6,
    detailMonth: params.get("detailMonth") || "",
    detailScope: (collectionDetailScopes as readonly string[]).includes(detailScope) ? detailScope as CollectionDetailScope : "month",
    agingBucket: (collectionAgingKeys as readonly string[]).includes(agingBucket) ? agingBucket as CollectionAgingKey : "",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: pageSize === 50 || pageSize === 100 ? pageSize : 25,
  };
}
export function reportQuery(value: CollectionFilters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, raw] of Object.entries(value)) {
    if (raw !== "") params.set(key, String(raw));
  }
  return params;
}
export function reportFilterError(value: CollectionFilters, tr: boolean): string {
  if (!(collectionDetailScopes as readonly string[]).includes(value.detailScope) ||
      (value.agingBucket !== "" && !(collectionAgingKeys as readonly string[]).includes(value.agingBucket))) return tr
    ? "Geçerli bir ayrıntı kapsamı ve vade yaşı seçin."
    : "Choose a valid detail scope and overdue age.";
  if (value.agingBucket && value.detailScope !== "overdue") return tr
    ? "Vade yaşı yalnız gecikmiş ödeme ayrıntılarında seçilebilir."
    : "Choose an overdue age only for overdue details.";
  if (value.representative && value.representativeState) return tr
    ? "Bir temsilci veya temsilci eşleşme durumu seçin."
    : "Choose either a representative or a representative mapping state.";
  if ((value.startMonth && !validMonth(value.startMonth)) || (value.detailMonth && !validMonth(value.detailMonth)) ||
      (value.startMonth && !validMonth(shiftMonth(value.startMonth, value.months - 1)))) {
    return tr ? "Geçerli bir dönem seçin (1753–9998)." : "Choose a valid period (1753–9998).";
  }
  return "";
}
const localDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Famagusta", year: "numeric", month: "2-digit", day: "2-digit" });
export function usableReportSource(source: CollectionReportData["source"], now = Date.now()): boolean {
  const generatedAt = Date.parse(source?.generatedAt);
  return !!source && hasSourceAudit(source, now) && source.database === "LOGO_DND" && source.view === "L_223_ODEME_PLANI" &&
    Number.isFinite(generatedAt) && generatedAt <= now && now < sourceExpiresAt(source) &&
    source.asOf === localDay.format(now) && !!source.freshness &&
    ["fresh", "refreshing", "stale"].includes(source.freshness.status) &&
    source.authorizationSource?.view === "L_223_FATURA_VADE" &&
    ["available", "unavailable"].includes(source.authorizationSource.status);
}
const moneyFields = ["scheduled", "paidToDate", "outstanding", "overdue"] as const;
const countFields = ["caseCount", "installmentCount", "incompleteRows"] as const;
const validCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const validCurrency = (value: unknown): value is string | null => value === null ||
  (typeof value === "string" && !!value && value !== "__ALL__" && value !== "__NULL__");
function validTotals(value: CollectionTotals): boolean {
  return !!value && moneyFields.every((key) => value[key] === null || (Number.isFinite(value[key]) &&
      (key === "scheduled" || key === "paidToDate" || (value[key] as number) >= 0))) &&
    countFields.every((key) => validCount(value[key])) && value.caseCount <= value.installmentCount && value.incompleteRows <= value.installmentCount;
}
function sameTotals(left: CollectionTotals, right: CollectionTotals): boolean {
  return [...moneyFields, ...countFields].every((key) => left[key] === right[key]);
}
function partitionsMatch(part: CollectionReportData["byCurrency"][number]): boolean {
  const groups = [...part.monthly, part.beforeWindow, part.afterWindow, part.undated];
  if (["installmentCount", "incompleteRows"].some((key) =>
    groups.reduce((sum, item) => sum + item[key as "installmentCount" | "incompleteRows"], 0) !== part.summary[key as "installmentCount" | "incompleteRows"])) return false;
  return moneyFields.every((key) => {
    const known = groups.filter((item) => item.installmentCount > 0 && item[key] !== null).map((item) => item[key] as number);
    const total = part.summary.installmentCount === 0 ? 0 : known.length ? known.reduce((sum, amount) => sum + amount, 0) : null;
    const actual = part.summary[key];
    return total === null || actual === null ? total === actual : Math.abs(total - actual) <= Math.max(0.00001, Math.abs(actual) * 1e-10);
  });
}
function sameAmount(left: number | null, right: number | null): boolean {
  return left === null || right === null ? left === right :
    Math.abs(left - right) <= Math.max(0.00001, Math.abs(right) * 1e-10);
}
function validAging(part: CollectionReportData["byCurrency"][number]): boolean {
  if (!Array.isArray(part.aging) || part.aging.length !== collectionAgingKeys.length ||
      part.aging.some((bucket, index) => !validTotals(bucket) || bucket.key !== collectionAgingKeys[index] ||
        bucket.caseCount > part.overdue.caseCount || !sameAmount(bucket.outstanding, bucket.overdue) ||
        (bucket.installmentCount === 0 && moneyFields.some((field) => bucket[field] !== 0)))) return false;
  if (part.aging.reduce((sum, bucket) => sum + bucket.installmentCount, 0) !== part.overdue.installmentCount ||
      part.aging.reduce((sum, bucket) => sum + bucket.incompleteRows, 0) !== part.overdue.incompleteRows) return false;
  // A file may span several age buckets. Only installments and money partition;
  // caseCount must stay distinct within each bucket rather than being summed.
  return moneyFields.every((field) => {
    const known = part.aging.filter((bucket) => bucket.installmentCount > 0 && bucket[field] !== null);
    const total = part.overdue.installmentCount === 0 ? 0 : known.length
      ? known.reduce((sum, bucket) => sum + bucket[field]!, 0) : null;
    return sameAmount(total, part.overdue[field]);
  });
}
function validInsights(part: CollectionReportData["byCurrency"][number]): boolean {
  const finiteAmount = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0);
  const percent = (value: number | null) => value === null || (Number.isFinite(value) && value >= 0 && value <= 100);
  if (part.currentMonthRemaining && (!validTotals(part.currentMonthRemaining) ||
      (part.currentMonthRemaining.overdue !== null && part.currentMonthRemaining.overdue !== 0))) return false;
  const concentration = part.overdueConcentration;
  if (concentration) {
    if (typeof concentration.complete !== "boolean") return false;
    const { customerGroupCount: count, top20GroupCount: top, top20Outstanding: amount, top20SharePercent: share } = concentration;
    if (!concentration.complete) {
      if ([count, top, amount, share].some((value) => value !== null)) return false;
    } else {
      if (!validCount(count) || !validCount(top) || count > part.overdue.caseCount || top !== Math.min(20, count) ||
          amount === null || !finiteAmount(amount) || !percent(share) || part.overdue.incompleteRows > 0 ||
          part.overdue.outstanding === null || amount > part.overdue.outstanding + 0.01) return false;
      if ((amount > 0) !== (count > 0)) return false;
      if (part.overdue.outstanding > 0 ? share === null || Math.abs(share - amount / part.overdue.outstanding * 100) > 0.015 : share !== null || amount !== 0) return false;
    }
  }
  if (part.projectInsights) {
    if (!Array.isArray(part.projectInsights) || new Set(part.projectInsights.map((row) => row.projectGroup)).size !== part.projectInsights.length) return false;
    if (part.projectInsights.some((row) => !isPaymentProjectGroup(row.projectGroup) ||
        !finiteAmount(row.overdueOutstanding) || !finiteAmount(row.nextMonthOutstanding) ||
        !percent(row.overdueSharePercent) || !percent(row.nextMonthSharePercent) ||
        (row.overdueOutstanding === null && row.overdueSharePercent !== null) ||
        (row.nextMonthOutstanding === null && row.nextMonthSharePercent !== null))) return false;
    for (const [amountField, shareField, total] of [
      ["overdueOutstanding", "overdueSharePercent", part.overdue],
      ["nextMonthOutstanding", "nextMonthSharePercent", part.nextMonth],
    ] as const) {
      const complete = part.currency !== null && total.incompleteRows === 0 && total.outstanding !== null;
      if (part.projectInsights.some((row) => {
        const amount = row[amountField], share = row[shareField];
        if (!complete) return share !== null;
        if (amount === null) return true;
        return total.outstanding! > 0
          ? share === null || Math.abs(share - amount / total.outstanding! * 100) > 0.015
          : share !== null || amount !== 0;
      })) return false;
      if (complete && Math.abs(part.projectInsights.reduce((sum, row) => sum + (row[amountField] ?? 0), 0) - total.outstanding!) > 0.01) return false;
    }
  }
  return true;
}
export function reportCurrencyToken(value: CollectionReportData): string {
  return value.currencyMode === "all" ? ALL_CURRENCIES : currencyToken(value.selectedCurrency);
}
/** Refuse old, mismatched or mixed-currency responses before presenting financial amounts. */
export function hasReportContract(value: CollectionReportData, requested: CollectionFilters, now = Date.now()): boolean {
  if (!value || !usableReportSource(value.source, now) || value.basis !== "original" ||
      !["all", "single"].includes(value.currencyMode) || !validCurrency(value.selectedCurrency) ||
      value.selectedPaymentKind !== requested.paymentKind || value.selectedProjectGroup !== requested.projectGroup ||
      value.selectedRepresentative !== requested.representative || value.selectedRepresentativeState !== requested.representativeState ||
      !!reportFilterError(requested, false) || value.selectedAuthorizationState !== requested.authorizationState ||
      value.months !== requested.months || !validMonth(value.startMonth) ||
      (requested.startMonth && requested.startMonth !== value.startMonth) ||
      (!requested.startMonth && value.startMonth !== shiftMonth(value.source.asOf.slice(0, 7), 1)) ||
      value.nextMonth !== shiftMonth(value.source.asOf.slice(0, 7), 1) ||
      !Array.isArray(value.periods) || value.periods.length !== value.months ||
      value.periods.some((month, index) => month !== shiftMonth(value.startMonth, index)) ||
      !Array.isArray(value.historicalPeriods) || value.historicalPeriods.some((month, index) =>
        !validMonth(month) || month >= value.source.asOf.slice(0, 7) ||
        (index > 0 && month <= value.historicalPeriods[index - 1])) ||
      !Array.isArray(value.currencies) || !Array.isArray(value.byCurrency) ||
      !Array.isArray(value.projectGroups) || !Array.isArray(value.representatives) ||
      !paymentProjectGroups.every((group) => value.projectGroups.some((entry) => entry.value === group))) return false;
  if (requested.currency === ALL_CURRENCIES ? value.currencyMode !== "all" || value.selectedCurrency !== null :
      value.currencyMode !== "single" || (!!requested.currency && reportCurrencyToken(value) !== requested.currency)) return false;
  const available = value.currencies.map((entry) => entry.value);
  if (!available.every(validCurrency) || new Set(available).size !== available.length) return false;
  const expectedCurrencies = value.currencyMode === "all" ? available : available.length ? [value.selectedCurrency] : [];
  if (new Set(value.byCurrency.map((part) => part.currency)).size !== value.byCurrency.length ||
      value.byCurrency.length !== expectedCurrencies.length || value.byCurrency.some((part) =>
        !expectedCurrencies.includes(part.currency) || !available.includes(part.currency) ||
        ![part.summary, part.overdue, part.nextMonth, part.undated, part.beforeWindow, part.afterWindow].every(validTotals) ||
        !Array.isArray(part.monthly) || part.monthly.length !== value.periods.length ||
        part.monthly.some((month, index) => month.month !== value.periods[index] || !validTotals(month)) ||
        !Array.isArray(part.historical) || part.historical.length !== value.historicalPeriods.length ||
        part.historical.some((month, index) => month.month !== value.historicalPeriods[index] || !validTotals(month) ||
          part.monthly.some((row) => row.month === month.month && !sameTotals(row, month))) ||
        !partitionsMatch(part) || !validInsights(part) || !validAging(part) ||
        part.monthly.some((month) => month.month === value.nextMonth && !sameTotals(month, part.nextMonth)))) return false;
  if (!hasAnalyticsContract(value) || !hasInvoiceOkContract(value, value.detail?.rows, requested.invoiceOk)) return false;
  if (value.historicalPeriods.some((_, index) =>
    !value.byCurrency.some((part) => part.historical[index].installmentCount > 0))) return false;
  const detail = value.detail;
  const detailIndex = value.periods.indexOf(detail?.month);
  const historyIndex = value.historicalPeriods.indexOf(detail?.month);
  const expectedMonthCount = detailIndex >= 0
    ? value.byCurrency.reduce((sum, part) => sum + part.monthly[detailIndex].caseCount, 0)
    : historyIndex >= 0
      ? value.byCurrency.reduce((sum, part) => sum + part.historical[historyIndex].caseCount, 0)
    : detail?.month === value.nextMonth
      ? value.byCurrency.reduce((sum, part) => sum + part.nextMonth.caseCount, 0)
      : null;
  const expectedDetailCount = requested.detailScope === "month" ? expectedMonthCount
    : value.byCurrency.reduce((sum, part) => sum + (requested.detailScope === "overdue"
      ? requested.agingBucket ? part.aging.find((bucket) => bucket.key === requested.agingBucket)!.caseCount : part.overdue.caseCount
      : requested.detailScope === "period" ? part.period.caseCount : part.undated.caseCount), 0);
  return !!detail && detail.scope === requested.detailScope && detail.agingBucket === requested.agingBucket &&
    detail.month === (requested.detailMonth || value.nextMonth) && validMonth(detail.month) &&
    validCount(detail.total) && validCount(detail.totalPages) && Number.isSafeInteger(detail.page) && detail.page >= 1 &&
    (expectedDetailCount === null || detail.total === expectedDetailCount) &&
    detail.pageSize === requested.pageSize && detail.page === Math.min(requested.page, Math.max(1, detail.totalPages)) &&
    detail.totalPages === Math.max(1, Math.ceil(detail.total / detail.pageSize)) && Array.isArray(detail.rows) &&
    detail.rows.length === Math.min(detail.pageSize, Math.max(0, detail.total - (detail.page - 1) * detail.pageSize)) &&
    new Set(detail.rows.map((row) => row.key)).size === detail.rows.length &&
    detail.rows.every((row) => typeof row.key === "string" && row.key.length > 0 &&
      expectedCurrencies.includes(row.currency) && isPaymentProjectGroup(row.projectGroup) &&
      (!requested.projectGroup || row.projectGroup === requested.projectGroup) &&
      Array.isArray(row.representatives) &&
      (!requested.representative || row.representatives.includes(requested.representative)) &&
      (requested.representativeState !== "unassigned" || !row.representatives.some((name) => name.trim())) &&
      (requested.representativeState !== "multiple" || new Set(row.representatives.filter((name) => name.trim())).size > 1) &&
      typeof row.customerName === "string" && typeof row.unitName === "string" && validTotals(row.totals));
}
