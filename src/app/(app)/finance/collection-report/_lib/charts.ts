import type { CollectionReportData, CollectionTotals } from "./types";

export type CurrencyReport = CollectionReportData["byCurrency"][number];
export type ChartState = "ready" | "partial" | "empty";
export interface PaymentChartPoint {
  month: string;
  scheduled: number | null;
  paidToDate: number | null;
  outstanding: number | null;
  cumulativeOutstanding: number | null;
  completionPercent: number | null;
  installmentCount: number;
  incomplete: boolean;
  performanceIncomplete: boolean;
}
function reliableOutstanding(value: CollectionTotals): value is CollectionTotals & { outstanding: number } {
  return value.incompleteRows === 0 && typeof value.outstanding === "number" &&
    Number.isFinite(value.outstanding) && value.outstanding >= 0;
}
/** An exact selected-period amount for one currency; partial subtotals are not totals. */
export function periodOutstanding(monthly: CollectionTotals[]): number | null {
  let total = 0;
  for (const month of monthly) {
    if (!reliableOutstanding(month)) return null;
    total += month.outstanding;
    if (!Number.isFinite(total)) return null;
  }
  return total;
}
function reliableAmount(value: CollectionTotals, field: "scheduled" | "paidToDate"): number | null {
  return value.incompleteRows === 0 && typeof value[field] === "number" && Number.isFinite(value[field]) ? value[field] : null;
}
/** Completion comes from the validated backend: overpayment may legitimately exceed 100%. */
export function completionLabel(value: number | null, tr: boolean): string {
  if (value === null || !Number.isFinite(value) || value < 0) return "—";
  const formatted = new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { maximumFractionDigits: 1 }).format(value);
  return tr ? `%${formatted}` : `${formatted}%`;
}
export function buildCollectionChartModel(
  report: Pick<CurrencyReport, "monthly"> & Partial<Pick<CurrencyReport, "historical" | "currency">>,
  range: "selected" | "history" = "selected",
) {
  const ordered = [...(range === "history" ? report.historical || [] : report.monthly)]
    .sort((left, right) => left.month.localeCompare(right.month))
  const visible = range === "history" ? ordered.slice(-12) : ordered;
  const unknownCurrency = report.currency === null;
  let cumulativeOutstanding: number | null = unknownCurrency ? null : 0;
  const monthly: PaymentChartPoint[] = visible.map((month) => {
    const scheduled = unknownCurrency ? null : reliableAmount(month, "scheduled");
    const paidToDate = unknownCurrency ? null : reliableAmount(month, "paidToDate");
    const outstanding = !unknownCurrency && reliableOutstanding(month) ? month.outstanding : null;
    cumulativeOutstanding = cumulativeOutstanding === null || outstanding === null ? null : cumulativeOutstanding + outstanding;
    if (cumulativeOutstanding !== null && !Number.isFinite(cumulativeOutstanding)) cumulativeOutstanding = null;
    const providedCompletion = "completionPercent" in month ? month.completionPercent : null;
    return {
      month: month.month,
      scheduled,
      paidToDate,
      outstanding,
      cumulativeOutstanding,
      completionPercent: scheduled !== null && scheduled > 0 && paidToDate !== null && paidToDate >= 0 &&
        outstanding !== null && typeof providedCompletion === "number" && Number.isFinite(providedCompletion) && providedCompletion >= 0
        ? providedCompletion : null,
      installmentCount: month.installmentCount,
      incomplete: outstanding === null,
      performanceIncomplete: scheduled === null || paidToDate === null || outstanding === null,
    };
  });
  const monthlyState: ChartState = monthly.some((month) => month.incomplete) ? "partial" :
    !monthly.length || monthly.every((month) => month.installmentCount === 0) ? "empty" : "ready";
  const performanceState: ChartState = monthly.some((month) => month.performanceIncomplete) ? "partial" : monthlyState;
  const total = unknownCurrency ? null : monthly.length ? monthly.at(-1)?.cumulativeOutstanding ?? null : 0;
  const peak = monthlyState === "ready" ? monthly.reduce<PaymentChartPoint | null>((best, month) => month.outstanding !== null && month.outstanding > (best?.outstanding ?? 0) ? month : best, null) : null;
  return { monthly, monthlyState, performanceState, total, peak, hiddenHistoryMonths: range === "history" ? Math.max(0, ordered.length - visible.length) : 0 };
}
