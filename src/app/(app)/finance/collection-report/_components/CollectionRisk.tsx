"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, CircleCheck, Clock3, Info } from "lucide-react";
import { currencyToken } from "../../payment-tracking/_lib/list-currencies";
import { currencyName, money } from "../../payment-tracking/_lib/utils";
import { agingLabel, buildAgingModel } from "../_lib/risk";
import type { CollectionReportData } from "../_lib/types";
import s from "../risk.module.css";

export default function CollectionRisk({ report, tr, loading, currency: controlledCurrency, onSelectOverdue }: {
  report: CollectionReportData; tr: boolean; loading: boolean; currency?: string;
  onSelectOverdue: () => void;
}) {
  const t = (a: string, b: string) => tr ? a : b;
  const [chosenCurrency, setChosenCurrency] = useState("");
  const current = controlledCurrency !== undefined ? report.byCurrency.find((part) => currencyToken(part.currency) === controlledCurrency) : report.byCurrency.find((part) => currencyToken(part.currency) === chosenCurrency) || report.byCurrency[0];
  const model = useMemo(() => current ? buildAgingModel(current) : null, [current]);
  const currency = currencyName(current?.currency, tr);
  const asOf = new Intl.DateTimeFormat(tr ? "tr-TR" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${report.source.asOf.slice(0, 10)}T12:00:00Z`));
  const percent = (value: number | null | undefined) => value === null || value === undefined ? "—" : new Intl.NumberFormat(tr ? "tr-TR" : "en-GB", { style: "percent", maximumFractionDigits: 1 }).format(value / 100);
  return <section className={s.card} aria-label={t("Alacak yaşlandırması", "Receivables aging")} data-testid="collection-risk" data-risk-currency={current ? currencyToken(current.currency) : ""} data-risk-state={model?.state || "partial"}>
    <header className={s.header}><div className={s.title}><span className={s.icon}><Clock3 size={19} aria-hidden="true" /></span><div><h2>{t("Alacak yaşlandırması", "Receivables aging")}</h2><p>{tr ? `${asOf} itibarıyla` : `As of ${asOf}`}</p></div></div><span className={s.currencyBadge}>{currency}</span></header>
    {controlledCurrency === undefined && report.currencyMode === "all" && current && <label className={s.currencyChoice}><span>{t("Döviz", "Currency")}</span><select aria-label={t("Gecikme para birimi", "Overdue currency")} value={currencyToken(current.currency)} onChange={(event) => setChosenCurrency(event.target.value)}>{report.byCurrency.map((part) => <option key={currencyToken(part.currency)} value={currencyToken(part.currency)}>{currencyName(part.currency, tr)}</option>)}</select></label>}
    <p className={s.balance}>{t("Gecikmiş alacak", "Overdue balance")} <strong>{money(model?.total ?? null, tr)} {currency}</strong></p>
    {model?.state === "ready" ? <>
      <div className={s.bars} role="group" aria-label={t("Gecikme yaş grupları", "Overdue age groups")}>{model.points.map((point) => <div key={point.key} className={s.bucket} data-aging-bucket={point.key} role="group" aria-label={`${agingLabel(point.key, tr)} · ${money(point.value, tr)} ${currency} · ${percent(point.share)}`} title={`${point.caseCount ?? "—"} ${t("dosya", "cases")}`}>
        <span className={s.bucketTop}><span>{agingLabel(point.key, tr)}</span><span className={s.bucketAmount}><strong>{money(point.value, tr)}</strong><small>{percent(point.share)}</small></span></span>
        <span className={s.track} aria-hidden="true"><span style={{ width: `${point.share ?? 0}%` }} /></span>
      </div>)}</div>
      {model.oldestShare !== null && <p className={s.priority}>{tr ? <>Gecikmiş alacağın <strong>{percent(model.oldestShare)}</strong>’i 90 günü aşmış.</> : <><strong>{percent(model.oldestShare)}</strong> of overdue receivables are more than 90 days late.</>}</p>}
    </> : model?.state === "empty" ? <div className={s.empty}><CircleCheck size={26} aria-hidden="true" /><p>{t("Bu kapsamda gecikmiş ödeme yok.", "No overdue payments in this scope.")}</p></div> : <div className={s.partial}><Info size={21} aria-hidden="true" /><p>{t("Yaşlandırma için kaynak bilgisi eksik. Gecikme dağılımı doğrulandığında gösterilecek.", "Source information is incomplete. The overdue distribution will appear when it can be verified.")}</p></div>}
    <button type="button" className={s.allCases} disabled={loading || !current} onClick={() => onSelectOverdue()}>{t("Gecikmiş dosyaları incele", "View overdue cases")}<ArrowUpRight size={14} aria-hidden="true" /></button>
  </section>;
}
