import { ArrowUpRight } from "lucide-react";
import type { CollectionReportData, CollectionTotals } from "../_lib/types";
import { currencyName, money } from "../../payment-tracking/_lib/utils";
import { currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { periodOutstanding } from "../_lib/charts";
import s from "../collection-report.module.css";

export default function CollectionOverview({ report, currency, tr, loading, onSelectMonth, onSelectOverdue }: {
  report: CollectionReportData; currency: string; tr: boolean; loading: boolean;
  onSelectMonth: (month: string) => void; onSelectOverdue: () => void;
}) {
  const t = (a: string, b: string) => tr ? a : b;
  const part = report.byCurrency.find((row) => currencyToken(row.currency) === currency);
  if (!part) return <p className={s.empty}>{t("Bu kapsamda ödeme bulunamadı.", "No payments found in this scope.")}</p>;
  const nextMonth = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${report.nextMonth}-01T12:00:00Z`));
  const amount = (totals: CollectionTotals | undefined) => money(!totals || part.currency === null ? null : periodOutstanding([totals]), tr);
  const cards = [
    { key: "next", label: t("Gelecek ay tahsilat planı", "Next month collection plan"), value: amount(part.nextMonth), note: nextMonth, action: () => onSelectMonth(report.nextMonth), tone: "future" },
    { key: "overdue", label: t("Vadesi geçmiş alacak", "Overdue receivables"), value: amount(part.overdue), note: t("Tüm geçmiş vadeler", "All past due dates"), action: onSelectOverdue, tone: "overdue" },
    { key: "current", label: t("Ay sonuna kadar beklenen", "Expected through month end"), value: amount(part.currentMonthRemaining), note: t("Bugünden ay sonuna · Vade planına göre", "Today to month end · Due-date plan"), action: undefined, tone: "plain" },
  ];
  return <section aria-label={`${currencyName(part.currency, tr)} ${t("tahsilat özeti", "collection summary")}`} className={s.overview} data-testid="collection-overview">
    {cards.map(({ key, label, value, note, action, tone }) => {
      const body = <>
        <span className={s.kpiHead}><span>{label}</span><small>{currencyName(part.currency, tr)}</small></span>
        <strong className={s.kpiValue}>{value}</strong>
        <span className={s.kpiFoot}><span>{note}</span>{action && <span className={s.kpiAction}>{t("Dosyalar", "Cases")}<ArrowUpRight size={13} aria-hidden="true" /></span>}</span>
      </>;
      return action ? <button type="button" key={key} data-kpi={key} data-tone={tone} className={s.kpi} disabled={loading} onClick={action} aria-label={`${label}: ${currencyName(part.currency, tr)} — ${t("Dosyaları göster", "View cases")}`}>{body}</button>
        : <article key={key} data-kpi={key} data-tone={tone} className={s.kpi}>{body}</article>;
    })}
  </section>;
}
