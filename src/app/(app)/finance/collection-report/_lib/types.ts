import type { PaymentFilterOption, PaymentInvoiceOk, PaymentKindFilter, PaymentProjectGroup, PaymentSourceSnapshot } from "../../payment-tracking/_lib/types";

export interface CollectionTotals {
  scheduled: number | null;
  paidToDate: number | null;
  outstanding: number | null;
  overdue: number | null;
  caseCount: number;
  installmentCount: number;
  incompleteRows: number;
}
export type RepresentativeState = "" | "unassigned" | "multiple";
export type CollectionAgingKey = "1_30" | "31_60" | "61_90" | "90_plus";
export type CollectionDetailScope = "month" | "overdue" | "period" | "undated";
/** Cases can span age buckets; each bucket's caseCount is distinct within that bucket. */
export interface CollectionAgingBucket extends CollectionTotals {
  key: CollectionAgingKey;
}
export interface CollectionPerformanceTotals extends CollectionTotals {
  completionPercent: number | null;
}
export interface CollectionBreakdownTotals {
  period: CollectionPerformanceTotals;
  overdue: CollectionTotals;
  nextMonth: CollectionTotals;
  monthly: Array<CollectionPerformanceTotals & { month: string }>;
}
export interface CollectionProjectBreakdown extends CollectionBreakdownTotals {
  projectGroup: PaymentProjectGroup;
}
export interface CollectionRepresentativeBreakdown extends CollectionBreakdownTotals {
  key: string;
  representative: string | null;
  representativeState: "single" | "multiple" | "unassigned";
}
export interface CollectionCaseMonth {
  invoiceOk?: PaymentInvoiceOk;
  key: string;
  customerCode: string | null;
  customerName: string;
  unitCode: string | null;
  unitName: string;
  currency: string | null;
  projectGroup: PaymentProjectGroup;
  representatives: string[];
  earliestDueDate: string | null;
  lastDueDate: string | null;
  totals: CollectionTotals;
}
export interface CollectionReportData {
  selectedInvoiceOk: string;
  invoiceOkOptions: PaymentFilterOption[];
  analyticsVersion: 1;
  source: Omit<PaymentSourceSnapshot, "cases">;
  basis: "original";
  selectedCurrency: string | null;
  currencyMode: "single" | "all";
  selectedPaymentKind: PaymentKindFilter;
  selectedProjectGroup: PaymentProjectGroup | "";
  selectedRepresentative: string;
  selectedRepresentativeState: RepresentativeState;
  selectedAuthorizationState: string;
  startMonth: string;
  months: number;
  nextMonth: string;
  periods: string[];
  historicalPeriods: string[];
  currencies: Array<{ value: string | null; label: string; recordCount: number }>;
  projectGroups: PaymentFilterOption[];
  representatives: PaymentFilterOption[];
  byCurrency: Array<{
    currency: string | null;
    summary: CollectionTotals;
    period: CollectionPerformanceTotals;
    projectBreakdown: CollectionProjectBreakdown[];
    representativeBreakdown: CollectionRepresentativeBreakdown[];
    overdue: CollectionTotals;
    aging: CollectionAgingBucket[];
    nextMonth: CollectionTotals;
    currentMonthRemaining?: CollectionTotals;
    overdueConcentration?: {
      complete: boolean;
      customerGroupCount: number | null;
      top20GroupCount: number | null;
      top20Outstanding: number | null;
      top20SharePercent: number | null;
    };
    projectInsights?: Array<{
      projectGroup: PaymentProjectGroup;
      overdueOutstanding: number | null;
      nextMonthOutstanding: number | null;
      overdueSharePercent: number | null;
      nextMonthSharePercent: number | null;
    }>;
    undated: CollectionTotals;
    beforeWindow: CollectionTotals;
    afterWindow: CollectionTotals;
    monthly: Array<CollectionPerformanceTotals & { month: string }>;
    historical: Array<CollectionPerformanceTotals & { month: string }>;
  }>;
  detail: {
    scope: CollectionDetailScope;
    agingBucket: CollectionAgingKey | "";
    month: string;
    rows: CollectionCaseMonth[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
export interface CollectionFilters {
  invoiceOk: string;
  currency: string;
  paymentKind: PaymentKindFilter;
  projectGroup: PaymentProjectGroup | "";
  representative: string;
  representativeState: RepresentativeState;
  authorizationState: string;
  startMonth: string;
  months: 6 | 12 | 24;
  detailMonth: string;
  detailScope: CollectionDetailScope;
  agingBucket: CollectionAgingKey | "";
  page: number;
  pageSize: 25 | 50 | 100;
}
