import type {
  PaymentInstallment,
  PaymentTrackingDetail,
  PaymentTrackingRow,
} from "./types";
import { paymentKinds, paymentKindLabel } from "./payment-kinds";
import { isPaymentProjectGroup, paymentProjectGroupLabel } from "./project-groups";
import { currencyName, dateLabel, money } from "./utils";

const DAY = 86_400_000;
const MESSAGE_LIMIT = 4_000;
const knownCurrencies = new Set<string>([
  "TL", "GBP", "USD", "EUR", "TRY",
  ...(typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("currency") : []),
]);
const kindOrder = paymentKinds.filter((kind) => kind !== "all");
type PortfolioInstallment = PaymentInstallment & { caseKey: string; currency: string | null };
type CurrencyData = { cases: PaymentTrackingRow[]; installments: PortfolioInstallment[]; invalid: boolean };
type Month = { amount: number; days: number; kinds: Set<string> };

function civilDay(value: string | null | undefined): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value
    ? timestamp / DAY
    : null;
}
function text(value: string | null | undefined): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}
function amount(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function equalAmount(left: number, right: number): boolean {
  // Source decimals may have six places. Permit only floating-point summation
  // noise, never a one-cent disagreement in a customer's payment request.
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= 0.000001;
}
function sameIdentity(left: PaymentTrackingRow, right: PaymentTrackingRow): boolean {
  return !!text(left.identity.customerCode) && !!text(left.identity.unitCode) &&
    left.identity.customerCode === right.identity.customerCode &&
    left.identity.unitCode === right.identity.unitCode;
}

function inspectCurrency(group: CurrencyData, asOf: number | null) {
  const months = new Map<string, Month>();
  let outstanding = 0, overdue = 0, upcoming = 0;
  if (group.invalid || asOf === null || !group.cases.length) return null;
  for (const item of group.cases) {
    const rows = group.installments.filter((row) => row.caseKey === item.key);
    if (item.incompleteRows !== 0 || !Number.isSafeInteger(item.installmentCount) ||
        item.installmentCount !== rows.length ||
        ![item.amount, item.paid, item.outstanding, item.overdueAmount, item.dueTodayAmount].every(amount)) return null;
    let scheduled = 0, paid = 0, remaining = 0, pastDue = 0, today = 0;
    for (const row of rows) {
      const due = civilDay(row.dueDate);
      if (due === null || !amount(row.amount) || !amount(row.paid) || !amount(row.outstanding) ||
          !kindOrder.some((kind) => kind === row.paymentKind) ||
          !equalAmount(Math.max(row.amount - row.paid, 0), row.outstanding)) return null;
      scheduled += row.amount;
      paid += row.paid;
      remaining += row.outstanding;
      if (row.outstanding <= 0) continue;
      if (due < asOf) {
        pastDue += row.outstanding;
        const key = row.dueDate!.slice(0, 7);
        const month = months.get(key) ?? { amount: 0, days: 0, kinds: new Set<string>() };
        month.amount += row.outstanding;
        month.days = Math.max(month.days, asOf - due);
        month.kinds.add(row.paymentKind);
        months.set(key, month);
      } else if (due === asOf) today += row.outstanding;
    }
    if (!equalAmount(scheduled, item.amount!) || !equalAmount(paid, item.paid!) ||
        !equalAmount(remaining, item.outstanding!) || !equalAmount(pastDue, item.overdueAmount!) ||
        !equalAmount(today, item.dueTodayAmount!)) return null;
    outstanding += remaining;
    overdue += pastDue;
    upcoming += remaining - pastDue;
  }
  if (![outstanding, overdue, upcoming].every(amount) ||
      !equalAmount(outstanding, overdue + upcoming) ||
      [...months.values()].some((month) => !amount(month.amount))) return null;
  return { outstanding, overdue, upcoming, months };
}

/** Build an editable draft only. Never sends, persists, mutates, or truncates it. */
export function buildPaymentMessage(
  data: PaymentTrackingDetail,
  options: { tr: boolean; scope: "portfolio" | "selected" },
): { body: string; incomplete: boolean; tooLong: boolean } {
  const { tr, scope } = options;
  const t = (turkish: string, english: string) => tr ? turkish : english;
  const selected = data.item;
  const cases = scope === "selected" ? [selected] : data.portfolio.cases;
  const installments: PortfolioInstallment[] = scope === "selected"
    ? data.installments.map((row) => ({ ...row, caseKey: selected.key, currency: selected.identity.currency }))
    : data.portfolio.installments;
  const groups = new Map<string | null, CurrencyData>();
  const groupFor = (currency: string | null) => {
    let group = groups.get(currency);
    if (!group) {
      group = { cases: [], installments: [], invalid: !knownCurrencies.has(currency ?? "") };
      groups.set(currency, group);
    }
    return group;
  };
  const casesByKey = new Map<string, PaymentTrackingRow>();
  for (const item of cases) {
    const group = groupFor(item.identity.currency);
    group.cases.push(item);
    if (!sameIdentity(selected, item) || casesByKey.has(item.key)) group.invalid = true;
    casesByKey.set(item.key, item);
  }
  for (const row of installments) {
    const group = groupFor(row.currency);
    group.installments.push(row);
    if (casesByKey.get(row.caseKey)?.identity.currency !== row.currency) group.invalid = true;
  }
  if (!groups.size || !casesByKey.has(selected.key)) {
    // A missing portfolio is not proof of a zero balance.
    for (const group of groups.values()) group.invalid = true;
    groupFor(null).invalid = true;
  }
  const asOf = civilDay(data.source.asOf);
  const project = isPaymentProjectGroup(selected.projectGroup) && selected.projectGroup !== "UNKNOWN"
    ? paymentProjectGroupLabel(selected.projectGroup, tr)
    : "";
  const unit = text(selected.identity.unitCode) || text(selected.unitName) || t("Daireniz", "Your unit");
  const subject = [project, unit].filter(Boolean).join(" · ");
  const customer = text(selected.customerName) || t("müşterimiz", "customer");
  const lines = [
    t(`Sayın ${customer},`, `Dear ${customer},`), "",
    t(`${subject} ödeme özeti`, `${subject} payment summary`),
    asOf === null
      ? t("Kaynak tarihi teyit edilmelidir.", "The source date needs confirmation.")
      : t(`Kaynak tarihi: ${dateLabel(data.source.asOf, tr)}`, `Source as of: ${dateLabel(data.source.asOf, tr)}`),
  ];
  const monthFormatter = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", {
    month: "long", year: "numeric", timeZone: "UTC",
  });
  let incomplete = false, hasOpen = false, hasOverdue = false;
  const ordered = [...groups].sort(([left], [right]) =>
    left === null ? 1 : right === null ? -1 : left.localeCompare(right, "en"),
  );
  for (const [currency, group] of ordered) {
    const currencyLabel = currencyName(currency, tr);
    lines.push("", currencyLabel);
    const totals = inspectCurrency(group, asOf);
    if (!totals) {
      incomplete = true;
      lines.push(t(
        "Bu dövizin ödeme bilgileri eksik veya tutarsız. Kesin tutar ve gecikme belirtmeden kayıtları teyit etmenizi rica ederiz.",
        "Payment information for this currency is incomplete or inconsistent. Please confirm the records before a definite amount or delay is stated.",
      ));
      continue;
    }
    hasOpen ||= totals.outstanding > 0;
    hasOverdue ||= totals.overdue > 0;
    const value = (number: number) => `${money(number, tr)} ${currencyLabel}`;
    lines.push(
      t(`Toplam açık bakiye: ${value(totals.outstanding)}`, `Total outstanding: ${value(totals.outstanding)}`),
      t(`Vadesi geçmiş: ${value(totals.overdue)}`, `Overdue: ${value(totals.overdue)}`),
      t(`Bugün ve gelecek vadeli: ${value(totals.upcoming)}`, `Due today and in the future: ${value(totals.upcoming)}`),
    );
    const longestDelay = [...totals.months.values()].reduce((longest, month) => Math.max(longest, month.days), 0);
    lines.push(t(`En uzun gecikme: ${longestDelay} gün`, `Longest delay: ${longestDelay} ${longestDelay === 1 ? "day" : "days"}`));
    if (totals.months.size) {
      lines.push(t("Gecikmiş aylar:", "Overdue months:"));
      for (const [month, row] of [...totals.months].sort(([left], [right]) => left.localeCompare(right))) {
        const label = monthFormatter.format(new Date(`${month}-01T00:00:00.000Z`));
        const kinds = kindOrder.filter((kind) => row.kinds.has(kind)).map((kind) => paymentKindLabel(kind, tr)).join(", ");
        lines.push(t(
          `• ${label}: ${value(row.amount)} · ${kinds} · en fazla ${row.days} gün gecikme`,
          `• ${label}: ${value(row.amount)} · ${kinds} · up to ${row.days} ${row.days === 1 ? "day" : "days"} overdue`,
        ));
      }
    } else lines.push(t("Bu dövizde vadesi geçmiş borç bulunmuyor.", "There is no overdue balance in this currency."));
  }
  lines.push("");
  if (hasOverdue) lines.push(t(
    "Vadesi geçmiş ödemelerinizin durumu hakkında bilgi paylaşmanızı rica ederiz. Ödeme yaptıysanız dekontunuzu iletebilirsiniz.",
    "Please let us know the status of your overdue payments. If you have already paid, you may share your payment receipt.",
  ));
  else if (incomplete) lines.push(t(
    "Teyit gerektiren ödeme kayıtlarını birlikte kontrol edebiliriz.",
    "We can review the payment records that need confirmation together.",
  ));
  else if (hasOpen) lines.push(t(
    "Açık bakiyenizin vadesi geçmiş değildir; ödemeleriniz planınızdaki vadelere tabidir.",
    "Your outstanding balance is not overdue; payments remain subject to their scheduled due dates.",
  ));
  else lines.push(t("Kayıtlarımızda açık bakiye bulunmuyor.", "Our records show no outstanding balance."));
  lines.push("", t("Teşekkür ederiz.", "Thank you."));
  const body = lines.join("\n");
  return { body, incomplete, tooLong: body.length > MESSAGE_LIMIT };
}
