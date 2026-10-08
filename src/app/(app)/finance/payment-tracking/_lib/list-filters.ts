import { filterRangeError, type FilterRangeKind } from "./filter-form";
import { paymentKinds } from "./payment-kinds";
import { paymentProjectGroups } from "./project-groups";
import { ALL_CURRENCIES } from "./list-currencies";
import { DEFAULT_INVOICE_OK, readInvoiceOk } from "./invoice-ok";

export const scopes = [
  "actionable",
  "open",
  "overdue",
  "deferred",
  "today",
  "upcoming",
  "paid",
  "closed",
  "all",
];
export const sorts = [
  "overdueDays",
  "outstanding",
  "effectiveDueDate",
  "customerName",
  "amount",
  "paid",
  "overdueAmount",
  "oldestDueDate",
  "nextDueDate",
  "trackingOverdueDays",
  "unitName",
];
export const filterEnums = {
  paymentKind: paymentKinds,
  projectGroup: ["", ...paymentProjectGroups],
  scope: scopes,
  authorizationState: [
    "all",
    "coded",
    "blank",
    "mixed",
    "unmatched",
    "multiple",
  ],
  paymentState: ["all", "unpaid", "partial", "paid", "unknown"],
  trackingRecord: ["all", "exists", "none"],
  dataQuality: ["all", "complete", "incomplete"],
  deferral: ["all", "exists", "none"],
  priority: ["all", "high"],
  sortBy: sorts,
} as const;
export const defaults = {
  invoiceOk: DEFAULT_INVOICE_OK,
  paymentKind: "sale",
  projectGroup: "",
  q: "",
  project: "",
  currency: "",
  scope: "actionable",
  assignee: "all",
  priority: "all",
  authorizationCode: "",
  authorizationState: "blank",
  representative: "",
  broker: "",
  customer: "",
  unit: "",
  dueFrom: "",
  dueTo: "",
  followUpFrom: "",
  followUpTo: "",
  invoiceFrom: "",
  invoiceTo: "",
  overdueDaysMin: "",
  overdueDaysMax: "",
  balanceMin: "",
  balanceMax: "",
  overdueAmountMin: "",
  overdueAmountMax: "",
  paymentState: "all",
  trackingRecord: "all",
  dataQuality: "all",
  deferral: "all",
  page: 1,
  pageSize: 25,
  sortBy: "overdueDays",
  sortDir: "desc" as "asc" | "desc",
};
export type Filters = typeof defaults;
export type TextFilterKey = Exclude<
  {
    [K in keyof Filters]: Filters[K] extends string ? K : never;
  }[keyof Filters],
  "sortDir"
>;
export const rangeDefinitions: Array<{
  key: string;
  from: TextFilterKey;
  to: TextFilterKey;
  kind: FilterRangeKind;
  label: [string, string];
}> = [
  {
    key: "due",
    from: "dueFrom",
    to: "dueTo",
    kind: "date",
    label: ["En eski açık vade", "Oldest open due date"],
  },
  {
    key: "followUp",
    from: "followUpFrom",
    to: "followUpTo",
    kind: "date",
    label: ["Güncel takip tarihi", "Current follow-up date"],
  },
  {
    key: "invoice",
    from: "invoiceFrom",
    to: "invoiceTo",
    kind: "date",
    label: ["Fatura tarihi", "Invoice date"],
  },
  {
    key: "overdueDays",
    from: "overdueDaysMin",
    to: "overdueDaysMax",
    kind: "days",
    label: ["Kaynak gecikme günü", "Source overdue days"],
  },
  {
    key: "balance",
    from: "balanceMin",
    to: "balanceMax",
    kind: "amount",
    label: ["Dosyanın açık bakiyesi", "Case outstanding balance"],
  },
  {
    key: "overdueAmount",
    from: "overdueAmountMin",
    to: "overdueAmountMax",
    kind: "amount",
    label: ["Dosyanın gecikmiş tutarı", "Case overdue amount"],
  },
];

export function readFilters(params: URLSearchParams): Filters {
  const next = { ...defaults };
  for (const key of Object.keys(defaults) as Array<keyof Filters>) {
    if (key === "page" || key === "pageSize" || key === "sortDir") continue;
    next[key] = params.get(key) ?? defaults[key];
  }
  for (const [key, values] of Object.entries(filterEnums)) {
    const field = key as keyof typeof filterEnums;
    if (!(values as readonly string[]).includes(next[field]))
      next[field] = defaults[field];
  }
  // Older source-code links represented all payment types before this selector existed.
  if (!params.has("paymentKind") && next.project.trim()) next.paymentKind = "all";
  // An explicit code in an older link must not intersect the new blank default.
  if (!params.has("authorizationState") && next.authorizationCode.trim()) next.authorizationState = "all";
  const page = Number(params.get("page"));
  next.page = Number.isSafeInteger(page) && page > 0 ? page : 1;
  next.pageSize = [25, 50, 100].includes(Number(params.get("pageSize")))
    ? Number(params.get("pageSize"))
    : 25;
  next.sortDir = params.get("sortDir") === "asc" ? "asc" : "desc";
  next.q = next.q.trim();
  next.invoiceOk = readInvoiceOk(next.invoiceOk, defaults.invoiceOk);
  return next;
}

export function query(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== "") params.set(key, String(value));
  });
  // The API defaults to all; the screen always sends its explicit selection.
  params.set("paymentKind", filters.paymentKind || defaults.paymentKind);
  return params;
}

export function filterErrors(
  filters: Filters,
  tr: boolean,
): Record<string, string> {
  const errors = Object.fromEntries(
    rangeDefinitions.flatMap((range) => {
      const error = filters.currency === ALL_CURRENCIES && range.kind === "amount" &&
        (filters[range.from] !== "" || filters[range.to] !== "")
        ? (tr ? "Tutar aralığı için tek bir para birimi seçin veya tutar aralıklarını temizleyin." : "Choose a single currency for amount ranges, or clear the amount ranges.")
        : filterRangeError(
        filters[range.from],
        filters[range.to],
        range.kind,
        tr,
      );
      return error ? [[range.key, `${range.label[tr ? 0 : 1]}: ${error}`]] : [];
    }),
  );
  if (filters.authorizationCode && ["blank", "unmatched"].includes(filters.authorizationState))
    errors.authorization = tr
      ? "Yetki kodu seçimi, boş veya eşleşmeyen kod filtresiyle birlikte kullanılamaz."
      : "An authorization code cannot be combined with blank or unmatched authorization filters.";
  return errors;
}

export function normalizeFilters(filters: Filters): Filters {
  const next = { ...filters, invoiceOk: readInvoiceOk(filters.invoiceOk, defaults.invoiceOk), q: filters.q.trim() };
  for (const range of rangeDefinitions) {
    next[range.from] = next[range.from].trim();
    next[range.to] = next[range.to].trim();
  }
  return next;
}

export function clearFilter(filters: Filters, key: string): Filters {
  if (key === "invoiceOk") return { ...filters, invoiceOk: "all", page: 1 };
  if (key === "authorizationState") return { ...filters, authorizationState: "all", page: 1 };
  const range = rangeDefinitions.find((item) => item.key === key);
  if (range) return { ...filters, [range.from]: "", [range.to]: "", page: 1 };
  return key in defaults
    ? { ...filters, [key]: defaults[key as keyof Filters], page: 1 }
    : filters;
}

export function hasMoneyOrDaysFilter(filters: Filters): boolean {
  return rangeDefinitions.some(
    (range) =>
      range.kind !== "date" &&
      (filters[range.from] !== "" || filters[range.to] !== ""),
  );
}

export function hasAmountFilter(filters: Filters): boolean {
  return rangeDefinitions.some((range) => range.kind === "amount" &&
    (filters[range.from] !== "" || filters[range.to] !== ""));
}

/** Currency switches preserve the draft, clearing only currency-dependent amount bounds. */
export function changeFilterCurrency(filters: Filters, currency: string): Filters {
  return { ...filters, currency, balanceMin: "", balanceMax: "", overdueAmountMin: "", overdueAmountMax: "", page: 1 };
}

export function changeFilterAuthorizationCode(filters: Filters, value: string): Filters {
  const explicitCode = value.startsWith("code:");
  return {
    ...filters,
    authorizationCode: explicitCode ? value.slice(5) : "",
    authorizationState: value === "blank" ? "blank" :
      explicitCode && !["blank", "unmatched"].includes(filters.authorizationState)
        ? filters.authorizationState : "all",
  };
}

export function changeFilterAuthorizationState(filters: Filters, state: string): Filters {
  return {
    ...filters, authorizationState: state,
    ...(["blank", "unmatched"].includes(state) ? { authorizationCode: "" } : {}),
  };
}
