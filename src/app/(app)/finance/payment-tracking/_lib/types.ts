import type { ProjectType } from "@/lib/projects";

export type PaymentProjectGroup = ProjectType | "UNKNOWN";

export interface PaymentIdentity {
  customerCode: string | null;
  unitCode: string | null;
  currency: string | null;
}
export type PaymentStatus =
  | "overdue"
  | "today"
  | "upcoming"
  | "paid"
  | "unknown";
export type PaymentKind = "sale" | "land" | "vat" | "transformer" | "furniture" | "deposit" | "other";
export type PaymentKindFilter = PaymentKind | "all";
export interface PaymentInstallment {
  sequence: number;
  projectCode: string | null;
  paymentKind: PaymentKind;
  dueDate: string | null;
  amount: number | null;
  paid: number | null;
  outstanding: number | null;
  overdueDays: number;
  status: PaymentStatus;
}
export interface PaymentInvoiceOk {
  status: "matched" | "unmatched" | "unavailable";
  values: string[];
  hasBlank: boolean;
}
export interface PaymentSourceCase {
  unallocatedCredit?: { status: "clear" | "blocked" | "unavailable"; recordCount: number | null };
  followupAssignment?: {
    userId: string | null;
    userName: string | null;
    changedByName: string | null;
    updatedAt: string | null;
    version: number;
  };
  invoiceOk?: PaymentInvoiceOk;
  key: string;
  identity: PaymentIdentity;
  customerName: string;
  unitName: string;
  customerNames: string[];
  unitNames: string[];
  projects: Array<{ code: string; name: string }>;
  representatives: string[];
  brokers: string[];
  invoiceDates: string[];
  authorization: {
    codes: string[];
    status: "matched" | "unmatched" | "unavailable";
    hasBlank: boolean;
  };
  installmentCount: number;
  incompleteRows: number;
  amount: number | null;
  paid: number | null;
  outstanding: number | null;
  overdueAmount: number | null;
  overdueCount: number;
  dueTodayAmount: number | null;
  oldestDueDate: string | null;
  nextDueDate: string | null;
  overdueDays: number;
  canTrack: boolean;
  trackingIssue: string | null;
  installments: PaymentInstallment[];
  sourceReview?: {
    status: "review_required";
    vat: Array<{
      currency: string | null;
      excludedRows: number;
      excludedOutstanding: number | null;
      hasReturnLink: boolean | null;
      hasCustomerChange: boolean | null;
    }>;
  } | null;
}
export interface PaymentSourceSnapshot {
  database: "LOGO_DND";
  view: "L_223_ODEME_PLANI";
  generatedAt: string;
  importedAt?: string | null;
  asOf: string;
  recordCount: number;
  audit?: {
    status: "verified" | "review_required";
    checkedAt: string;
    financialChecks: "passed";
    reviewCaseCount: number;
    excludedVatRows: number;
  };
  freshness?: {
    status: "fresh" | "refreshing" | "stale";
    retryAfterMs: number | null;
    maxAgeSeconds: number;
  };
  cases: PaymentSourceCase[];
  authorizationSource: {
    view: "L_223_FATURA_VADE";
    status: "available" | "unavailable";
    matchedCases: number;
    unmatchedCases: number;
    multipleCodeCases: number;
    message: string | null;
  };
}
export interface PaymentActor {
  id: string;
  name?: string;
  role: string;
}
export interface PaymentAssignee {
  id: string;
  name: string;
  role: string;
}
export interface PaymentTrackingState {
  key: string;
  sourceIdentity: PaymentIdentity;
  trackingDate: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  priority: "normal" | "high";
  version: number;
  updatedAt: string;
  updatedByName: string;
}
export interface PaymentMessage {
  id: string;
  recipient: string;
  subject: string;
}
export interface PaymentTrackingEventDto {
  message?: PaymentMessage;
  actorId?: string | null;
  id: string;
  type: "defer" | "reset" | "note" | "assign" | "priority" | "contact" | "message_draft" | "message_sent";
  body: string;
  previousDate: string | null;
  nextDate: string | null;
  actorName: string;
  channel: "email" | "whatsapp" | "phone" | null;
  createdAt: string;
}
export interface PaymentTrackingAction {
  messageId?: string;
  recipient?: string;
  subject?: string;
  type: PaymentTrackingEventDto["type"];
  expectedVersion: number;
  body: string;
  trackingDate?: string;
  assigneeId?: string | null;
  priority?: "normal" | "high";
  channel?: "email" | "whatsapp" | "phone";
}
export interface PaymentTrackingRow extends Omit<
  PaymentSourceCase,
  "installments"
> {
  fullyPaid: boolean;
  projectGroup: PaymentProjectGroup;
  tracking: PaymentTrackingState | null;
  effectiveDueDate: string | null;
  trackingStatus:
    | "overdue"
    | "deferred"
    | "today"
    | "upcoming"
    | "paid"
    | "unknown";
  trackingOverdueDays: number;
}
export interface PaymentTrackingSummary {
  closedCount: number;
  openCount: number;
  outstanding: number | null;
  overdueCount: number;
  overdueAmount: number | null;
  actionableCount: number;
  actionableAmount: number | null;
  deferredCount: number;
  todayCount: number;
  unassignedCount: number;
  incompleteRows: number;
}
export interface PaymentTrackingList {
  followupAssignees?: PaymentAssignee[];
  canAssignFollowup?: boolean;
  selectedInvoiceOk: string;
  invoiceOkOptions: PaymentFilterOption[];
  source: Omit<PaymentSourceSnapshot, "cases">;
  selectedPaymentKind: PaymentKindFilter;
  selectedProjectGroup: PaymentProjectGroup | "";
  projectGroups: Array<{ value: PaymentProjectGroup; label: string; caseCount: number }>;
  selectedCurrency: string | null;
  currencyMode: "single" | "all";
  currencyBreakdown: Array<{
    currency: string | null;
    total: number;
    summary: PaymentTrackingSummary;
    filteredSummary: PaymentTrackingSummary;
  }>;
  currencies: Array<{
    value: string | null;
    label: string;
    recordCount: number;
  }>;
  projects: Array<{ code: string; name: string }>;
  assignees: PaymentAssignee[];
  filterOptions: {
    authorizationCodes: PaymentFilterOption[];
    representatives: PaymentFilterOption[];
    brokers: PaymentFilterOption[];
    customers: PaymentFilterOption[];
    units: PaymentFilterOption[];
  };
  summary: PaymentTrackingSummary;
  filteredSummary: PaymentTrackingList["summary"];
  orphanedTrackingCount: number;
  rows: PaymentTrackingRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface PaymentFilterOption {
  value: string;
  label: string;
  caseCount: number;
}
export interface PaymentContact {
  emailSource?: "logo" | "crm" | null;
  phoneSource?: "logo" | "crm" | null;
  crmFallbackStatus?: "matched" | "ambiguous" | "unit_mismatch" | "unavailable";
  email: string | null;
  phone: string | null;
  source: string | null;
  status: "matched" | "missing" | "ambiguous" | "unavailable";
}
export interface PaymentTrackingDetail {
  followupAssignees?: PaymentAssignee[];
  canAssignFollowup?: boolean;
  source: Omit<PaymentSourceSnapshot, "cases">;
  item: PaymentTrackingRow;
  installments: PaymentInstallment[];
  portfolio: {
    fullyPaid: boolean;
    cases: PaymentTrackingRow[];
    installments: Array<PaymentInstallment & { caseKey: string; currency: string | null }>;
  };
  contact: PaymentContact;
  history: PaymentTrackingEventDto[];
  historyHasMore: boolean;
  assignees: PaymentAssignee[];
}
