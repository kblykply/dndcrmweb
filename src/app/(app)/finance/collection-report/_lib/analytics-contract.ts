import type { CollectionBreakdownTotals, CollectionPerformanceTotals, CollectionReportData, CollectionTotals } from "./types";
import { isPaymentProjectGroup } from "../../payment-tracking/_lib/project-groups";

const amounts = ["scheduled", "paidToDate", "outstanding", "overdue"] as const;
const counts = ["caseCount", "installmentCount", "incompleteRows"] as const;
const count = (value: unknown) => Number.isSafeInteger(value) && (value as number) >= 0;
function close(left: number | null, right: number | null): boolean {
  return left === null || right === null ? left === right :
    Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= Math.max(0.00001, Math.abs(left) * 1e-10);
}
function totals(value: CollectionTotals): boolean {
  return !!value && amounts.every((key) => value[key] === null || typeof value[key] === "number" && Number.isFinite(value[key]) &&
    (key === "scheduled" || key === "paidToDate" || value[key] >= 0)) &&
    counts.every((key) => count(value[key])) && value.caseCount <= value.installmentCount && value.incompleteRows <= value.installmentCount;
}
function performance(value: CollectionPerformanceTotals, currency: string | null): boolean {
  if (!totals(value)) return false;
  const rate = value.completionPercent;
  // A null rate can also represent a signed source row hidden by aggregation.
  if (rate === null) return true;
  return currency !== null && value.incompleteRows === 0 && value.scheduled !== null && value.scheduled > 0 &&
    value.paidToDate !== null && value.paidToDate >= 0 && typeof rate === "number" && Number.isFinite(rate) && rate >= 0 &&
    Math.abs(rate - value.paidToDate / value.scheduled * 100) <= 0.015;
}
function partition(total: CollectionTotals, groups: CollectionTotals[], disjointCases: boolean): boolean {
  if (!totals(total) || !groups.every(totals)) return false;
  if (!amounts.every((key) => {
    const known = groups.filter((row) => row.installmentCount > 0 && row[key] !== null);
    const sum = total.installmentCount === 0 ? 0 : known.length ? known.reduce((acc, row) => acc + row[key]!, 0) : null;
    return close(total[key], sum);
  })) return false;
  if (groups.reduce((sum, row) => sum + row.installmentCount, 0) !== total.installmentCount ||
      groups.reduce((sum, row) => sum + row.incompleteRows, 0) !== total.incompleteRows) return false;
  const caseSum = groups.reduce((sum, row) => sum + row.caseCount, 0);
  return disjointCases ? caseSum === total.caseCount :
    total.caseCount <= caseSum && groups.every((row) => row.caseCount <= total.caseCount);
}

/** Charts require the same period and currency partitions as the headline amounts. */
export function hasAnalyticsContract(report: CollectionReportData): boolean {
  if (report.analyticsVersion !== 1 || !["", "multiple", "unassigned"].includes(report.selectedRepresentativeState)) return false;
  return report.byCurrency.every((part) => {
    if (!performance(part.period, part.currency) || !partition(part.period, part.monthly, false) ||
        ![...part.monthly, ...part.historical].every((row) => performance(row, part.currency))) return false;
    function breakdown(rows: CollectionBreakdownTotals[]): boolean {
      if (!Array.isArray(rows) || rows.some((row) => !row || !performance(row.period, part.currency) ||
        !totals(row.overdue) || !totals(row.nextMonth) || !Array.isArray(row.monthly) || row.monthly.length !== report.periods.length ||
        row.monthly.some((month, index) => month.month !== report.periods[index] || !performance(month, part.currency)) ||
        !partition(row.period, row.monthly, false))) return false;
      return partition(part.period, rows.map((row) => row.period), true) &&
        partition(part.overdue, rows.map((row) => row.overdue), true) &&
        partition(part.nextMonth, rows.map((row) => row.nextMonth), true) &&
        part.monthly.every((month, index) => partition(month, rows.map((row) => row.monthly[index]), true));
    }
    if (!breakdown(part.projectBreakdown) ||
        new Set(part.projectBreakdown.map((row) => row.projectGroup)).size !== part.projectBreakdown.length ||
        part.projectBreakdown.some((row) => !isPaymentProjectGroup(row.projectGroup) ||
          report.selectedProjectGroup && row.projectGroup !== report.selectedProjectGroup)) return false;
    const reps = part.representativeBreakdown;
    if (!Array.isArray(reps)) return false;
    if (report.source.authorizationSource.status === "unavailable") return reps.length === 0;
    return breakdown(reps) && new Set(reps.map((row) => row.key)).size === reps.length && reps.every((row) => {
      if (report.selectedRepresentativeState && row.representativeState !== report.selectedRepresentativeState) return false;
      if (row.representativeState === "single") return typeof row.representative === "string" && !!row.representative.trim() &&
        row.key === `single:${row.representative}` && (!report.selectedRepresentative || row.representative === report.selectedRepresentative);
      return ["multiple", "unassigned"].includes(row.representativeState) && row.representative === null && row.key === row.representativeState &&
        !(report.selectedRepresentative && row.representativeState === "unassigned");
    });
  });
}
