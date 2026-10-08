import type { PaymentTrackingList, PaymentTrackingSummary } from "./types";

export const ALL_CURRENCIES = "__ALL__";
export const UNKNOWN_CURRENCY = "__NULL__";
export const currencyToken = (value: string | null) => value === null ? UNKNOWN_CURRENCY : value;
export const selectedCurrencyToken = (value: PaymentTrackingList) =>
  value.currencyMode === "all" ? ALL_CURRENCIES : currencyToken(value.selectedCurrency);

const moneyFields = ["outstanding", "overdueAmount", "actionableAmount"] as const;
const countFields = ["closedCount", "openCount", "overdueCount", "actionableCount", "deferredCount", "todayCount", "unassignedCount", "incompleteRows"] as const;
const validCount = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const validCurrency = (value: unknown): value is string | null =>
  value === null || (typeof value === "string" && value !== ALL_CURRENCIES && value !== UNKNOWN_CURRENCY);
function validSummary(value: PaymentTrackingSummary): boolean {
  return !!value && countFields.every((field) => validCount(value[field])) &&
    moneyFields.every((field) => value[field] === null ||
      (typeof value[field] === "number" && Number.isFinite(value[field]) && value[field] >= 0));
}
function sameSummary(a: PaymentTrackingSummary, b: PaymentTrackingSummary): boolean {
  return [...countFields, ...moneyFields].every((field) => a[field] === b[field]);
}

/** Currency mode is explicit: null alone means either unknown currency or all currencies. */
export function hasCurrencyContract(data: PaymentTrackingList, requestedCurrency?: string): boolean {
  if (!data || !["single", "all"].includes(data.currencyMode) || !validCurrency(data.selectedCurrency) ||
      !Array.isArray(data.currencies) || !Array.isArray(data.currencyBreakdown) || !Array.isArray(data.rows) ||
      !validSummary(data.summary) || !validSummary(data.filteredSummary) || !validCount(data.total) ||
      data.rows.length > data.total || new Set(data.rows.map((row) => row.key)).size !== data.rows.length ||
      countFields.some((field) => field !== "incompleteRows" && data.filteredSummary[field] > data.total)) return false;
  if (requestedCurrency !== undefined &&
      (requestedCurrency === ALL_CURRENCIES ? data.currencyMode !== "all" :
        data.currencyMode !== "single" || (!!requestedCurrency && selectedCurrencyToken(data) !== requestedCurrency))) return false;
  const available = data.currencies.map((entry) => entry.value);
  if (!available.every(validCurrency) || new Set(available).size !== available.length ||
      data.currencyBreakdown.length !== available.length) return false;
  const parts = data.currencyBreakdown;
  if (new Set(parts.map((part) => part.currency)).size !== parts.length ||
      parts.some((part) => !available.includes(part.currency) || !validCount(part.total) ||
        !validSummary(part.summary) || !validSummary(part.filteredSummary))) return false;
  if (data.rows.some((row) => !available.includes(row.identity.currency)) ||
      parts.some((part) =>
        data.rows.filter((row) => row.identity.currency === part.currency).length > part.total ||
        countFields.some((field) => field !== "incompleteRows" && part.filteredSummary[field] > part.total))) return false;
  if (data.currencyMode === "all") {
    if (data.selectedCurrency !== null ||
        moneyFields.some((field) => data.summary[field] !== null || data.filteredSummary[field] !== null) ||
        parts.reduce((total, part) => total + part.total, 0) !== data.total) return false;
    return countFields.every((field) =>
      parts.reduce((total, part) => total + part.summary[field], 0) === data.summary[field] &&
      parts.reduce((total, part) => total + part.filteredSummary[field], 0) === data.filteredSummary[field]);
  }
  const selected = parts.find((part) => part.currency === data.selectedCurrency);
  if (!selected) return !available.length && data.total === 0 && !data.rows.length &&
    countFields.every((field) => data.summary[field] === 0 && data.filteredSummary[field] === 0) &&
    moneyFields.every((field) => data.summary[field] === 0 && data.filteredSummary[field] === 0);
  return selected.total === data.total && sameSummary(selected.summary, data.summary) &&
    sameSummary(selected.filteredSummary, data.filteredSummary) &&
    data.rows.every((row) => row.identity.currency === data.selectedCurrency) &&
    parts.filter((part) => part !== selected).every((part) => part.total === 0 &&
      countFields.every((field) => part.summary[field] === 0 && part.filteredSummary[field] === 0) &&
      moneyFields.every((field) => part.summary[field] === 0 && part.filteredSummary[field] === 0));
}
