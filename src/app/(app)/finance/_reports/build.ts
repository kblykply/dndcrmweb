import type {
  InstallmentTableData,
  PeriodTotals,
  Row,
} from "../collection-table/types";
import type { PaymentTrackingDetail } from "../payment-tracking/_lib/types";
import { currencyName, dateLabel } from "../payment-tracking/_lib/utils";
import { paymentProjectGroupLabel } from "../payment-tracking/_lib/project-groups";
import { paymentKindLabel } from "../payment-tracking/_lib/payment-kinds";
import type { FinanceReport, ReportColumn, ReportSheet } from "./model";

type Source = InstallmentTableData["source"];
const rate = (amount: number | null, paid: number | null) =>
  amount !== null && amount > 0 && paid !== null && paid >= 0
    ? paid / amount
    : null;
const label = (tr: boolean) => (a: string, b: string) => (tr ? a : b);
function metadata(source: Source, tr: boolean, scope: string): string[] {
  const t = label(tr);
  return [
    scope,
    `${t("Rapor tarihi", "Report generated")}: ${dateLabel(new Date().toISOString(), tr, true)}`,
    `${t("Supabase / Logo aktarımı", "Supabase / Logo import")}: ${source.importedAt ? dateLabel(source.importedAt, tr, true) : "—"}`,
    `${t("Değerlendirme günü", "As-of date")}: ${source.asOf}`,
    t(
      "Ödenen tutarlar vadeye dağıtılmış ödeme/mahsuplardır; ödeme tarihine göre nakit tahsilat değildir. Eksik tutarlar boş bırakılır. Dövizler toplanmaz.",
      "Paid amounts are payments/offsets allocated to due dates, not cash receipts by payment date. Unknown amounts remain blank. Currencies are never combined.",
    ),
  ];
}
function amounts(tr: boolean): ReportColumn[] {
  const t = label(tr);
  return [
    { label: t("Planlanan", "Scheduled"), kind: "money" },
    { label: t("Ödenen / kapatılan", "Paid / settled"), kind: "money" },
    { label: t("Kalan alacak", "Outstanding"), kind: "money" },
    { label: t("Tahsilat %", "Collection %"), kind: "percent" },
  ];
}
const values = (
  totals: Pick<PeriodTotals, "amount" | "paid" | "outstanding">,
) => [
  totals.amount,
  totals.paid,
  totals.outstanding,
  rate(totals.amount, totals.paid),
];
export function buildTableReport(
  data: InstallmentTableData,
  scope: string,
  tr: boolean,
): FinanceReport {
  const t = label(tr),
    sheets: ReportSheet[] = [];
  const summaryColumns: ReportColumn[] = [
    { label: t("Dönem", "Period") },
    { label: t("Döviz", "Currency") },
    ...amounts(tr),
    { label: t("Vade sayısı", "Installments"), kind: "count" },
  ];
  const yearRows = data.years.filter(
    (part) => !data.year || part.year === data.year,
  );
  if (scope === "general" || scope === "past")
    sheets.push({
      name: t("Genel özet", "Overview"),
      columns: summaryColumns,
      rows: data.overview.flatMap((part) =>
        scope === "past"
          ? [
              [
                `${t("Geçmiş vadeler", "Past dues")} ≤ ${data.previousMonthEnd}`,
                currencyName(part.currency, tr),
                ...values(part.throughPreviousMonth),
                part.throughPreviousMonth.count,
              ],
            ]
          : [
              [
                t("Tüm vadeler", "All dues"),
                currencyName(part.currency, tr),
                ...values(part.overall),
                part.overall.count,
              ],
              [
                `${t("Geçmiş vadeler", "Past dues")} ≤ ${data.previousMonthEnd}`,
                currencyName(part.currency, tr),
                ...values(part.throughPreviousMonth),
                part.throughPreviousMonth.count,
              ],
            ],
      ),
    });
  if (scope === "general" || scope === "years")
    sheets.push({
      name: t("Yıllık özet", "Annual summary"),
      columns: summaryColumns,
      rows: yearRows.map((part) => [
        part.year === "undated"
          ? t("Vadesi belirtilmemiş", "Undated")
          : part.year,
        currencyName(part.currency, tr),
        ...values(part),
        part.count,
      ]),
    });
  if (["general", "year", "month"].includes(scope))
    sheets.push({
      name: t("Aylık özet", "Monthly summary"),
      columns: summaryColumns,
      rows: yearRows.flatMap((part) =>
        part.months
          .filter((month) => !data.month || month.month === data.month)
          .map((month) => [
            month.month,
            currencyName(part.currency, tr),
            ...values(month),
            month.count,
          ]),
      ),
    });
  if (scope === "customers") {
    const groups = new Map<string, Row[]>();
    for (const row of data.rows) {
      const key = JSON.stringify([row.caseKey, row.currency]);
      const group = groups.get(key) ?? [];
      group.push(row);
      groups.set(key, group);
    }
    sheets.push({
      name: t("Cari dökümü", "Customer balances"),
      columns: [
        { label: t("Müşteri", "Customer"), width: 42 },
        { label: t("Cari kod", "Customer code") },
        { label: t("Daire", "Unit") },
        { label: t("Temsilci", "Representative") },
        { label: t("Döviz", "Currency") },
        ...amounts(tr),
      ],
      rows: [...groups.values()].map((rows) => {
        const first = rows[0],
          sum = (field: "amount" | "paid" | "outstanding") =>
            rows.some((row) => row[field] === null)
              ? null
              : rows.reduce((sum, row) => sum + (row[field] ?? 0), 0);
        return [
          first.customerName,
          first.customerCode,
          first.unitCode,
          first.representatives.join(", "),
          currencyName(first.currency, tr),
          ...values({
            amount: sum("amount"),
            paid: sum("paid"),
            outstanding: sum("outstanding"),
          }),
        ];
      }),
    });
  }
  if (["year", "month", "detail", "past"].includes(scope)) {
    const rows =
      scope === "past"
        ? data.rows.filter(
            (row) => row.dueDate && row.dueDate <= data.previousMonthEnd,
          )
        : data.rows;
    sheets.push({
      name: t("Ödeme vadeleri", "Installments"),
      columns: [
        { label: t("Müşteri", "Customer"), width: 42 },
        { label: t("Cari kod", "Customer code") },
        { label: t("Proje", "Project") },
        { label: t("Daire", "Unit") },
        { label: t("Temsilci", "Representative") },
        { label: t("Vade", "Due date") },
        { label: t("Döviz", "Currency") },
        ...amounts(tr),
      ],
      rows: rows.map((row) => [
        row.customerName,
        row.customerCode,
        paymentProjectGroupLabel(row.projectGroup, tr),
        row.unitCode,
        row.representatives.join(", "),
        row.dueDate,
        currencyName(row.currency, tr),
        ...values(row),
      ]),
    });
  }
  const names: Record<string, string> = {
    general: t("Genel tahsilat raporu", "General collection report"),
    years: t("Yıllık tahsilat özeti", "Annual collection summary"),
    year: t("Yıl raporu", "Annual report"),
    month: t("Ay raporu", "Monthly report"),
    customers: t("Cari dökümü", "Customer balances"),
    detail: t("Ödeme / vade dökümü", "Installment ledger"),
    past: t("Geçmiş vadeler raporu", "Past dues report"),
  };
  return {
    title: names[scope],
    filename: `tahsilat-${scope}-${data.month || data.year || data.source.asOf}`,
    metadata: metadata(
      data.source,
      tr,
      `Fatura OK: DND · ${t("Yetki kodu boş", "Blank authorization code")} · ${t("Normal satış", "Normal sales")} · ${data.currency === "__ALL__" ? t("Tüm dövizler", "All currencies") : data.currency}${data.search ? ` · ${t("Arama", "Search")}: ${data.search}` : ""}${data.month || data.year ? ` · ${data.month || data.year}` : ""}`,
    ),
    sheets,
  };
}
function installmentArrears(
  line: PaymentTrackingDetail["portfolio"]["installments"][number],
  asOf: string,
) {
  const balance = line.outstanding;
  if (balance === null) return { status: "unknown", overdue: null, days: null };
  if (balance <= 0) return { status: "paid", overdue: 0, days: 0 };
  if (!line.dueDate) return { status: "unknown", overdue: null, days: null };
  if (line.dueDate < asOf)
    return {
      status: "overdue",
      overdue: balance,
      days: Math.round(
        (Date.parse(asOf) - Date.parse(line.dueDate)) / 86_400_000,
      ),
    };
  return {
    status: line.dueDate === asOf ? "today" : "upcoming",
    overdue: 0,
    days: 0,
  };
}
export function buildStatementReport(
  data: PaymentTrackingDetail,
  period: string,
  tr: boolean,
  ownedOnly = false,
): FinanceReport {
  const t = label(tr);
  const lines = data.portfolio.installments
    .filter((line) => !period || line.dueDate?.startsWith(period))
    .slice()
    .sort(
      (a, b) =>
        (a.currency || "").localeCompare(b.currency || "") ||
        (a.dueDate || "9999").localeCompare(b.dueDate || "9999") ||
        a.sequence - b.sequence,
    );
  const arrears = lines.map((line) =>
    installmentArrears(line, data.source.asOf),
  );
  const currencies = [...new Set(lines.map((line) => line.currency))];
  const sum = (numbers: (number | null)[]) =>
    numbers.some((value) => value === null)
      ? null
      : numbers.reduce<number>((total, value) => total + (value ?? 0), 0);
  const periodLabel = period || t("Tüm vadeler", "All due dates");
  const statusLabel = (status: string) =>
    ({
      overdue: t("Gecikmiş", "Overdue"),
      paid: t("Ödendi", "Paid"),
      today: t("Bugün vadeli", "Due today"),
      upcoming: t("Vadesi gelmedi", "Upcoming"),
      unknown: t("Bilgi eksik", "Incomplete"),
    })[status] || "—";
  return {
    title: t("Müşteri cari ekstresi", "Customer account statement"),
    filename:
      `cari-${data.item.identity.unitCode || data.item.key.slice(0, 10)}-${period || "tum-vadeler"}`.replace(
        /[^\p{L}\p{N}_.-]/gu,
        "_",
      ),
    metadata: metadata(
      data.source,
      tr,
      `${data.item.customerName} · ${data.item.identity.customerCode || "—"} · ${data.item.unitName} · ${periodLabel} · ${ownedOnly ? t("Satış cari kapsamı", "Sales account scope") : t("Tüm ödeme türleri ve dövizler", "All payment kinds and currencies")}`,
    ),
    pdf: {
      subtitle:
        data.item.customerName || data.item.identity.customerCode || "—",
      details: [
        `${t("Daire", "Unit")}: ${data.item.unitName || data.item.identity.unitCode || "—"}   ·   ${t("Cari kod", "Account code")}: ${data.item.identity.customerCode || "—"}`,
        `${t("Dönem", "Period")}: ${periodLabel}   ·   ${t("Değerlendirme tarihi", "As of")}: ${dateLabel(data.source.asOf, tr)}`,
        `${t("Veri tarihi", "Data updated")}: ${data.source.importedAt ? dateLabel(data.source.importedAt, tr, true) : "—"}`,
      ],
      note: t(
        "Gecikmiş tutar kalan borca dahildir. Ödemeler vadeye dağıtılmıştır. —: eksik bilgi. Tutarlar seçili döneme aittir; dövizler ayrı değerlendirilir.",
        "Overdue is included in the remaining balance. Payments are allocated to installments. —: missing data. Totals cover the selected period; currencies are separate.",
      ),
    },
    sheets: [
      {
        name: t("Borç özeti", "Balance summary"),
        columns: [
          { label: t("Döviz", "Currency") },
          { label: t("Toplam plan", "Scheduled"), kind: "money" },
          { label: t("Ödenen", "Paid"), kind: "money" },
          { label: t("Kalan borç", "Remaining"), kind: "money" },
          { label: t("Gecikmiş borç", "Overdue"), kind: "money" },
        ],
        overdueColumns: [4],
        rows: currencies.map((currency) => {
          const rows = lines.filter((line) => line.currency === currency);
          return [
            currencyName(currency, tr),
            sum(rows.map((row) => row.amount)),
            sum(rows.map((row) => row.paid)),
            sum(rows.map((row) => row.outstanding)),
            sum(
              rows.map(
                (row) => installmentArrears(row, data.source.asOf).overdue,
              ),
            ),
          ];
        }),
      },
      {
        name: t("Ödeme planı ve gecikmeler", "Payment schedule and arrears"),
        columns: [
          { label: t("Vade", "Due date"), pdfWidth: 25 },
          { label: t("Döviz", "Currency"), pdfWidth: 18 },
          { label: t("Ödeme türü", "Payment type"), pdfWidth: 32 },
          { label: t("Kayıt kodu", "Record code"), pdfHidden: true },
          { label: t("Planlanan", "Scheduled"), kind: "money" },
          { label: t("Ödenen", "Paid"), kind: "money" },
          { label: t("Kalan", "Remaining"), kind: "money" },
          { label: t("Gecikmiş tutar", "Overdue amount"), kind: "money" },
          {
            label: t("Gecikme (gün)", "Days overdue"),
            kind: "count",
            pdfWidth: 23,
          },
          { label: t("Durum", "Status"), pdfWidth: 30 },
        ],
        overdueRows: arrears.flatMap((row, index) =>
          row.status === "overdue" ? [index] : [],
        ),
        overdueColumns: [7, 8, 9],
        rows: lines.map((line, index) => [
          dateLabel(line.dueDate, tr),
          currencyName(line.currency, tr),
          paymentKindLabel(line.paymentKind, tr),
          line.projectCode,
          line.amount,
          line.paid,
          line.outstanding,
          arrears[index].overdue,
          arrears[index].days,
          statusLabel(arrears[index].status),
        ]),
      },
    ],
  };
}

export function buildSalesLedgerReport(
  data: import("../payment-tracking/_lib/types").PaymentTrackingList,
  tr: boolean,
  scope: string,
  supervisorPortfolio?: string,
): FinanceReport {
  const t = label(tr);
  const balances =
    data.currencyMode === "all"
      ? data.currencyBreakdown
      : [
          {
            currency: data.selectedCurrency,
            filteredSummary: data.filteredSummary,
          },
        ];
  return {
    title: supervisorPortfolio
      ? t("Müşteri Carileri", "Customer Accounts")
      : t("Müşteri Carilerim", "My Customer Accounts"),
    filename: `musteri-carilerim-${scope}-${data.source.asOf}`,
    metadata: metadata(
      data.source,
      tr,
      `${supervisorPortfolio || t("Yalnız kendi carilerim", "My own accounts only")} · Fatura OK: DND · ${t("Yetki kodu boş", "Blank authorization code")} · ${scope} · ${paymentKindLabel(data.selectedPaymentKind, tr)}`,
    ),
    pdf: {
      subtitle:
        supervisorPortfolio ||
        t("Kendi müşteri carilerim", "My customer accounts"),
      details: [
        `${scope} · ${paymentKindLabel(data.selectedPaymentKind, tr)} · ${t("Değerlendirme tarihi", "As of")}: ${dateLabel(data.source.asOf, tr)}`,
        `${t("Veri tarihi", "Data updated")}: ${data.source.importedAt ? dateLabel(data.source.importedAt, tr, true) : "—"}`,
      ],
      note: t(
        "Gecikmiş tutar kalan borca dahildir. Takip tarihi, asıl vade tarihini değiştirmez. —: eksik bilgi. Dövizler ayrı değerlendirilir.",
        "Overdue is included in the remaining balance. Follow-up dates do not change original due dates. —: missing data. Currencies are separate.",
      ),
    },
    sheets: [
      {
        name: t("Özet", "Summary"),
        columns: [
          { label: t("Döviz", "Currency") },
          { label: t("Kalan borç", "Outstanding"), kind: "money" },
          { label: t("Gecikmiş borç", "Overdue"), kind: "money" },
        ],
        overdueColumns: [2],
        rows: balances.map((part) => [
          currencyName(part.currency, tr),
          part.filteredSummary.outstanding,
          part.filteredSummary.overdueAmount,
        ]),
      },
      {
        name: t("Cari listesi", "Customer accounts"),
        columns: [
          { label: t("Müşteri", "Customer"), width: 42, pdfWidth: 53 },
          { label: t("Cari kod", "Customer code"), pdfHidden: true },
          { label: t("Daire", "Unit"), pdfWidth: 33 },
          { label: t("Döviz", "Currency"), pdfWidth: 17 },
          { label: t("Planlanan", "Scheduled"), kind: "money" },
          { label: t("Ödenen", "Paid"), kind: "money" },
          { label: t("Kalan borç", "Outstanding"), kind: "money" },
          { label: t("Gecikmiş borç", "Overdue"), kind: "money" },
          { label: t("Takip tarihi", "Follow-up date"), pdfWidth: 27 },
          {
            label: t("Gecikme (gün)", "Days overdue"),
            kind: "count",
            pdfWidth: 22,
          },
        ],
        overdueColumns: [7, 9],
        overdueRows: data.rows.flatMap((row, index) =>
          (row.overdueAmount || 0) > 0 ? [index] : [],
        ),
        rows: data.rows.map((row) => [
          row.customerName,
          row.identity.customerCode,
          row.unitName || row.identity.unitCode,
          currencyName(row.identity.currency, tr),
          row.amount,
          row.paid,
          row.outstanding,
          row.overdueAmount,
          dateLabel(row.effectiveDueDate, tr),
          row.overdueAmount === null ? null : row.overdueDays,
        ]),
      },
    ],
  };
}
